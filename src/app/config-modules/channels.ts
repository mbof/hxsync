import { YAMLMap, Document, Node, Scalar, YAMLSeq, Pair } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { ConfigModuleInterface } from './config-module-interface';
import { Config, DeviceModel, MemoryRangeId } from './device-configs';
import {
  CHANNEL_NAME_BYTES,
  MARINE_FLAG_BYTES,
  MarineChannelConfig,
  decodeChannelConfig,
  getChannelIdMatcher,
  setScramblerFlag
} from '../channel';
import { fillPaddedString, readPaddedString } from '../util';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';

export const marineChannelSections = ['group_1', 'group_2', 'group_3'] as const;
export type MarineChannelSection = (typeof marineChannelSections)[number];

export type MarineChannelDeviceConfig = {
  numChannels: number;
  enabledAddress: number;
  flagsAddress: number;
  namesAddress: number;
};

export type ChannelDeviceConfig = {
  marineChannels: Map<MarineChannelSection, MarineChannelDeviceConfig>;
  hasScrambler: boolean;
};

export const CHANNEL_DEVICE_CONFIGS: Map<DeviceModel, ChannelDeviceConfig> =
  new Map([
    [
      'HX870',
      {
        hasScrambler: false,
        marineChannels: new Map([
          [
            'group_1',
            {
              numChannels: 96,
              enabledAddress: 0x0120,
              flagsAddress: 0x0600,
              namesAddress: 0x0ba0
            }
          ],
          [
            'group_2',
            {
              numChannels: 96,
              enabledAddress: 0x0140,
              flagsAddress: 0x0780,
              namesAddress: 0x17a0
            }
          ],
          [
            'group_3',
            {
              numChannels: 96,
              enabledAddress: 0x0160,
              flagsAddress: 0x0900,
              namesAddress: 0x23a0
            }
          ]
        ])
      }
    ],
    [
      'HX890',
      {
        hasScrambler: true,
        marineChannels: new Map([
          [
            'group_1',
            {
              numChannels: 96,
              enabledAddress: 0x0120,
              flagsAddress: 0x0700,
              namesAddress: 0x1100
            }
          ],
          [
            'group_2',
            {
              numChannels: 96,
              enabledAddress: 0x0140,
              flagsAddress: 0x0900,
              namesAddress: 0x1d00
            }
          ],
          [
            'group_3',
            {
              numChannels: 96,
              enabledAddress: 0x0160,
              flagsAddress: 0x0b00,
              namesAddress: 0x2900
            }
          ]
        ])
      }
    ]
  ]);

export const memoryRangeSubIds = [
  'enabled_bitfield',
  'flags',
  'names'
] as const;

export type MemoryRangeSubId = (typeof memoryRangeSubIds)[number];

export type MarineChannelMemoryRangeId = {
  section: MarineChannelSection;
  id: MemoryRangeSubId;
};
export class ChannelConfig implements ConfigModuleInterface {
  deviceConfig: ChannelDeviceConfig | undefined;
  memoryRanges: MarineChannelMemoryRangeId[] = [];
  constructor(readonly deviceModel: DeviceModel) {
    this.deviceConfig = CHANNEL_DEVICE_CONFIGS.get(deviceModel);
    if (!this.deviceConfig) {
      return;
    }
    for (const section of this.deviceConfig.marineChannels.keys()) {
      memoryRangeSubIds.forEach((subId) => {
        this.memoryRanges.push({
          section,
          id: subId
        });
      });
    }
  }
  getMemoryRangeId(
    section: MarineChannelSection,
    subId: MemoryRangeSubId
  ): MarineChannelMemoryRangeId {
    // This always exists because of the constructor initialization
    return this.memoryRanges.find(
      (range) => range.section == section && range.id == subId
    )!;
  }
  maybeVisitYamlNode(
    node: YAMLMap<unknown, unknown>,
    configBatchWriter: ConfigBatchWriter,
    configOut: Config,
    previousConfig: Config
  ): boolean {
    const channelsNode = node.get('channels');
    if (!channelsNode) {
      return false;
    }
    const deviceConfig = this.deviceConfig;
    if (!deviceConfig) {
      throw new YamlError(
        `Unsupported configuration for ${this.deviceModel}`,
        node.range![0]
      );
    }
    if (!(channelsNode instanceof YAMLMap)) {
      throw new YamlError('Unexpected channels node type', node.range![0]);
    }
    const sections = channelsNode.items;
    for (const section of sections) {
      this.parseYamlSection(section, configBatchWriter, previousConfig);
    }
    return true;
  }
  parseYamlSection(
    sectionNode: Pair<any, any>,
    configBatchWriter: ConfigBatchWriter,
    previousConfig: Config
  ) {
    const deviceConfig = this.deviceConfig!;
    if (
      !(sectionNode.key instanceof Scalar) ||
      !marineChannelSections.includes(sectionNode.key.value)
    ) {
      throw new Error(`Unexpected channel section ${sectionNode.key}`);
    }
    if (!(sectionNode.value instanceof YAMLMap)) {
      throw new Error(
        `Unexpected channel section node type for ${sectionNode.key.value}`
      );
    }
    const section = sectionNode.key.value;
    const previousSectionConfig = previousConfig.marineChannels?.get(section);
    if (!previousSectionConfig) {
      throw new YamlError(
        `Unknown previous configuration`,
        sectionNode.value.range![0]
      );
    }
    if (
      previousSectionConfig.length !=
      deviceConfig.marineChannels.get(section)!.numChannels
    ) {
      throw new YamlError(
        `Wrong length of previous configuration`,
        sectionNode.value.range![0]
      );
    }
    const flagsIn = new Uint8Array(
      previousSectionConfig.length * MARINE_FLAG_BYTES
    );
    previousSectionConfig.forEach((mcc, i) =>
      flagsIn.set(mcc.flags, i * MARINE_FLAG_BYTES)
    );
    const flagsOut = flagsIn.slice();
    const namesOut = new Uint8Array(
      previousSectionConfig.length * CHANNEL_NAME_BYTES
    );
    previousSectionConfig.forEach((mcc, i) =>
      fillPaddedString(
        namesOut.subarray(i * CHANNEL_NAME_BYTES, (i + 1) * CHANNEL_NAME_BYTES),
        mcc.name
      )
    );
    let shouldWriteFlags = false;
    for (const channelNode of sectionNode.value.items) {
      if (channelNode.key.value == 'intership') {
        const intershipChannelsNode = channelNode.value;
        parseIntershipNode(
          intershipChannelsNode,
          previousSectionConfig,
          flagsOut
        );
        shouldWriteFlags = true;
      } else if (channelNode.key.value == 'names') {
        const channelNameNodes = channelNode.value;
        parseChannelNamesNode(
          channelNameNodes,
          previousSectionConfig,
          namesOut
        );
        configBatchWriter.prepareWrite(
          this.getMemoryRangeId(section, 'names'),
          deviceConfig.marineChannels.get(section)!.namesAddress,
          namesOut
        );
      } else if (channelNode.key.value == 'scrambler') {
        if (deviceConfig.hasScrambler) {
          const scramblerNodes = channelNode.value;
          parseScramblerNode(scramblerNodes, previousSectionConfig, flagsOut);
          shouldWriteFlags = true;
        } else {
          console.log(
            `Scrambler settings ignored (not available for ${this.deviceModel})`
          );
        }
      } else {
        throw new Error(`Unexpected channel node type ${channelNode}`);
      }
    }
    if (shouldWriteFlags) {
      configBatchWriter.prepareWrite(
        this.getMemoryRangeId(section, 'flags'),
        deviceConfig.marineChannels.get(section)!.flagsAddress,
        flagsOut
      );
    }
  }

  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    const config = this.deviceConfig;
    if (!config) {
      return;
    }
    for (const [section, deviceConfig] of config.marineChannels.entries()) {
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'enabled_bitfield'),
        deviceConfig.enabledAddress,
        deviceConfig.enabledAddress + Math.ceil(deviceConfig.numChannels / 8)
      );
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'flags'),
        deviceConfig.flagsAddress,
        deviceConfig.flagsAddress + deviceConfig.numChannels * MARINE_FLAG_BYTES
      );
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'names'),
        deviceConfig.namesAddress,
        deviceConfig.namesAddress +
          deviceConfig.numChannels * CHANNEL_NAME_BYTES
      );
    }
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void {
    const deviceConfig = this.deviceConfig;
    if (!deviceConfig) {
      return;
    }
    const marine = new Map<MarineChannelSection, MarineChannelConfig[]>();
    const channelGroupNodes = new Map<MarineChannelSection, YAMLMap>();
    for (const [
      section,
      channelDeviceConfig
    ] of deviceConfig.marineChannels.entries()) {
      const enabledData = results.get(
        this.getMemoryRangeId(section, 'enabled_bitfield')
      )!;
      const flagsData = results.get(this.getMemoryRangeId(section, 'flags'))!;
      const namesData = results.get(this.getMemoryRangeId(section, 'names'))!;
      const marineChannelConfigs: MarineChannelConfig[] = [];
      for (let n = 0; n < channelDeviceConfig.numChannels; n++) {
        const flags = flagsData.subarray(
          MARINE_FLAG_BYTES * n,
          MARINE_FLAG_BYTES * (n + 1)
        );
        const nameData = namesData.subarray(
          CHANNEL_NAME_BYTES * n,
          CHANNEL_NAME_BYTES * (n + 1)
        );
        const channel = decodeChannelConfig(
          n,
          enabledData,
          flags,
          nameData,
          deviceConfig.hasScrambler
        );
        marineChannelConfigs.push(channel);
        if (channel.enabled) {
          const channelDict: any = {
            [channel.id]: {
              name: channel.name,
              dsc: channel.dsc
            }
          };
          if (channel.scrambler) {
            channelDict[channel.id].scrambler = channel.scrambler;
          }
        }
      }
      marine.set(section, marineChannelConfigs);
      const enabledChannels = marineChannelConfigs.filter((mcc) => mcc.enabled);
      const intershipChannels: (string | number)[] = [];
      enabledChannels.forEach((mcc) => {
        if (mcc.dsc == 'enabled') {
          intershipChannels.push(Number(mcc.id) || mcc.id);
        }
      });
      const intershipNode = yaml.createNode(intershipChannels);
      intershipNode.flow = true;
      const channelNamesNode: Map<string | number, string>[] = [];
      enabledChannels.forEach((mcc) => {
        channelNamesNode.push(new Map([[Number(mcc.id) || mcc.id, mcc.name]]));
      });
      const namesNode = yaml.createNode(channelNamesNode);
      let groupNode;
      if (deviceConfig.hasScrambler) {
        const scramblerChannels: YAMLMap[] = [];
        enabledChannels.forEach((mcc) => {
          if (mcc.scrambler) {
            const node = yaml.createNode(
              new Map([[Number(mcc.id) || mcc.id, mcc.scrambler]])
            );
            if (node.items[0].value && node.items[0].value instanceof YAMLMap) {
              node.items[0].value.flow = true;
            }
            scramblerChannels.push(node);
          }
        });
        const scramblerNode = yaml.createNode(scramblerChannels);
        groupNode = yaml.createNode({
          intership: intershipNode,
          names: channelNamesNode,
          scrambler: scramblerNode
        });
      } else {
        groupNode = yaml.createNode({
          intership: intershipNode,
          names: channelNamesNode
        });
      }
      channelGroupNodes.set(section, groupNode);
    }
    config.marineChannels = marine;
    const channelsNode = yaml.createNode({
      channels: channelGroupNodes
    });
    channelsNode.spaceBefore = true;
    yaml.add(channelsNode);
  }
}

function parseScramblerNode(
  scramblerNodes: any,
  previousSectionConfig: MarineChannelConfig[],
  flagsOut: Uint8Array
) {
  if (!(scramblerNodes instanceof YAMLSeq)) {
    throw new YamlError(
      `Scrambler configuration expects a list of channels`,
      scramblerNodes.range![0]
    );
  }
  // Turn off scrambler unless specified.
  for (let i = 0; i < previousSectionConfig.length; i++) {
    if (flagsOut[i * MARINE_FLAG_BYTES] != 0xff) {
      setScramblerFlag(
        flagsOut.subarray(i * MARINE_FLAG_BYTES, (i + 1) * MARINE_FLAG_BYTES),
        undefined
      );
    }
  }
  for (const scramblerNode of scramblerNodes.items) {
    if (
      !(scramblerNode instanceof YAMLMap) ||
      scramblerNode.items.length != 1
    ) {
      throw new YamlError(
        `Scrambler configuration expects config like "- 99: { type: 32, code: 3 }""`,
        scramblerNode.range![0]
      );
    }
    const id = scramblerNode.items[0].key.value;
    const matcher = getChannelIdMatcher(id);
    const n = previousSectionConfig.findIndex((mcc) => matcher(mcc.flags));
    if (n == -1) {
      console.log(`Ignoring scrambler setting for unknown channel ${id}`);
    } else {
      const scramblerConfigNode = scramblerNode.items[0].value;
      if (
        !(scramblerConfigNode instanceof YAMLMap) ||
        scramblerConfigNode.items.length != 2
      ) {
        throw new YamlError(
          `Expected scrambler config for ${id} as { type: X, code: Y }`,
          scramblerNode.range![0]
        );
      }
      const scramblerCode = {
        type: scramblerConfigNode.get('type'),
        code: scramblerConfigNode.get('code')
      };
      if (!scramblerCode.type || ![4, 32].includes(scramblerCode.type)) {
        throw new YamlError(
          `Unknown scrambler type for ${id} (${scramblerCode.type})`,
          scramblerNode.range![0]
        );
      }
      if (!scramblerCode.code || typeof scramblerCode.code != 'number') {
        throw new YamlError(
          `Unknown scrambler code for ${id} (${scramblerCode.code})`,
          scramblerNode.range![0]
        );
      }
      setScramblerFlag(
        flagsOut.subarray(n * MARINE_FLAG_BYTES, (n + 1) * MARINE_FLAG_BYTES),
        scramblerCode
      );
    }
  }
}

function parseChannelNamesNode(
  channelNameNodes: any,
  previousSectionConfig: MarineChannelConfig[],
  namesOut: Uint8Array
) {
  if (!(channelNameNodes instanceof YAMLSeq)) {
    throw new YamlError(
      `Channel name configuration expects a list of channels`,
      channelNameNodes.range![0]
    );
  }
  for (const channelNameNode of channelNameNodes.items) {
    if (
      !(channelNameNode instanceof YAMLMap) ||
      channelNameNode.items.length != 1
    ) {
      throw new YamlError(
        `Name configuration expects config like "- 99: NAME""`,
        channelNameNode.range![0]
      );
    }
    const id = channelNameNode.items[0].key.value;
    const matcher = getChannelIdMatcher(id);
    const n = previousSectionConfig.findIndex((mcc) => matcher(mcc.flags));
    if (n == -1) {
      console.log(`Channel ${id} not found, skipping.`);
    } else {
      fillPaddedString(
        namesOut.subarray(n * CHANNEL_NAME_BYTES, (n + 1) * CHANNEL_NAME_BYTES),
        channelNameNode.items[0].value.value
      );
    }
  }
}

function parseIntershipNode(
  intershipChannelsNode: any,
  previousSectionConfig: MarineChannelConfig[],
  flagsOut: Uint8Array
) {
  if (!(intershipChannelsNode instanceof YAMLSeq)) {
    throw new YamlError(
      `Intership configuration expects a list of channels`,
      intershipChannelsNode.range![0]
    );
  }
  // Turn off DSC unless specified.
  for (let i = 0; i < previousSectionConfig.length; i++) {
    if (flagsOut[i * MARINE_FLAG_BYTES] != 0xff) {
      flagsOut[i * MARINE_FLAG_BYTES + 2] &= 0x7f;
    }
  }
  intershipChannelsNode.items.forEach((id) => {
    if (!(id instanceof Scalar)) {
      throw new YamlError(
        `Unexpected channel ID ${id}`,
        intershipChannelsNode.range![0]
      );
    }
    const matcher = getChannelIdMatcher(id.value);
    const n = previousSectionConfig.findIndex((mcc) => matcher(mcc.flags));
    if (n == -1) {
      console.log(`Intership channel ${id} not found, skipping.`);
    } else {
      flagsOut[n * MARINE_FLAG_BYTES + 2] |= 0x80;
    }
  });
}
