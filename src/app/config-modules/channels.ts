import { YAMLMap, Document, Node, Scalar, YAMLSeq, Pair } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { ConfigModuleInterface } from './config-module-interface';
import { Config, DeviceModel, MemoryRangeId } from './device-configs';
import {
  CHANNEL_NAME_BYTES,
  MARINE_FLAG_BYTES,
  MarineChannelConfig,
  ScramblerCode,
  decodeChannelConfig,
  fillChannelFlags,
  getChannelIdMatcher
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
};

export const CHANNEL_DEVICE_CONFIGS: Map<DeviceModel, ChannelDeviceConfig> =
  new Map([
    [
      'HX870',
      {
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
    if (!(sectionNode.value instanceof YAMLSeq)) {
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
    for (let i = 0; i < previousSectionConfig.length; i++) {
      // Disable DSC unless explicitly allowed
      flagsOut[i * MARINE_FLAG_BYTES + 2] &= 0x7f
    }
    const namesOut = new Uint8Array(
      previousSectionConfig.length * CHANNEL_NAME_BYTES
    );
    previousSectionConfig.forEach((mcc, i) =>
      fillPaddedString(
        namesOut.subarray(i * CHANNEL_NAME_BYTES, (i + 1) * CHANNEL_NAME_BYTES),
        mcc.name
      )
    );
    for (const channelNode of sectionNode.value.items) {
      if (!(channelNode instanceof YAMLMap)) {
        throw new Error(`Unexpected channel node type ${channelNode}`);
      }
      if (channelNode.items.length != 1) {
        throw new YamlError(
          `Unexpected channel node length`,
          channelNode.range![0]
        );
      }
      const id = channelNode.items[0].key.value;
      const matcher = getChannelIdMatcher(id);
      const n = previousSectionConfig.findIndex((mcc) => matcher(mcc.flags));
      if (n == -1) {
        throw new YamlError(`Channel ${id} not found`, channelNode.range![0]);
      }
      const previousChannelConfig = previousSectionConfig[n];
      let { dsc, scrambler, name } = parseYamlChannel(channelNode.get(id));
      if (!name) {
        name = previousChannelConfig.name;
      }
      const channelFlagsIn = flagsIn.subarray(
        n * MARINE_FLAG_BYTES,
        (n + 1) * MARINE_FLAG_BYTES
      );
      const channelFlagsOut = flagsOut.subarray(
        n * MARINE_FLAG_BYTES,
        (n + 1) * MARINE_FLAG_BYTES
      );
      fillChannelFlags(channelFlagsIn, channelFlagsOut, dsc, scrambler);
      fillPaddedString(
        namesOut.subarray(n * CHANNEL_NAME_BYTES, (n + 1) * CHANNEL_NAME_BYTES),
        name
      );
    }
    configBatchWriter.prepareWrite(
      this.getMemoryRangeId(section, 'flags'),
      deviceConfig.marineChannels.get(section)!.flagsAddress,
      flagsOut
    );
    configBatchWriter.prepareWrite(
      this.getMemoryRangeId(section, 'names'),
      deviceConfig.marineChannels.get(section)!.namesAddress,
      namesOut
    );
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
    const marineDicts = new Map<MarineChannelSection, any[]>();
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
      const marineChannelDicts = [];
      for (let n = 0; n < channelDeviceConfig.numChannels; n++) {
        const flags = flagsData.subarray(
          MARINE_FLAG_BYTES * n,
          MARINE_FLAG_BYTES * (n + 1)
        );
        const nameData = namesData.subarray(
          CHANNEL_NAME_BYTES * n,
          CHANNEL_NAME_BYTES * (n + 1)
        );
        const channel = decodeChannelConfig(n, enabledData, flags, nameData);
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
          marineChannelDicts.push(channelDict);
        }
      }
      marine.set(section, marineChannelConfigs);
      marineDicts.set(section, marineChannelDicts);
    }
    config.marineChannels = marine;
    const channelsNode = yaml.createNode({
      channels: marineDicts
    });
    channelsNode.spaceBefore = true;
    yaml.add(channelsNode);
  }
}

function parseYamlChannel(channelNode: YAMLMap<any, any>): {
  dsc: 'enabled' | 'disabled';
  scrambler: ScramblerCode | undefined;
  name: string | undefined;
} {
  let dsc: 'enabled' | 'disabled' = 'disabled';
  let scrambler: ScramblerCode | undefined = undefined;
  let name: string | undefined = undefined;
  for (const property of channelNode.items) {
    if (!(property.key instanceof Scalar)) {
      throw new YamlError(
        `Unknown channel property type ${property.key}`,
        channelNode.range![0]
      );
    }
    if (property.key.value == 'name') {
      if (
        !(property.value instanceof Scalar) ||
        typeof property.value.value != 'string'
      ) {
        throw new YamlError(
          `Unknown channel name type ${property.value}`,
          channelNode.range![0]
        );
      }
      name = property.value.value;
    } else if (property.key.value == 'dsc') {
      if (
        !(property.value instanceof Scalar) ||
        typeof property.value.value != 'string'
      ) {
        throw new YamlError(
          `Unknown channel dsc type ${property.value}`,
          channelNode.range![0]
        );
      }
      if (
        property.value.value == 'enabled' ||
        property.value.value == 'disabled'
      ) {
        dsc = property.value.value;
      } else {
        throw new YamlError(
          `Unknown channel dsc value ${property.value.value}`,
          channelNode.range![0]
        );
      }
    } else if (property.key.value == 'scrambler') {
      if (!(property.value instanceof YAMLMap)) {
        throw new YamlError(
          `Unknown channel scrambler node type ${property.value}`,
          channelNode.range![0]
        );
      }
      const scramblerNode = property.value;
      if (scramblerNode.items.length != 2) {
        throw new YamlError(
          `Scrambler must provide exactly two properties, found ${scramblerNode.items.length}`,
          scramblerNode.range![0]
        );
      }
      const scramblerType = scramblerNode.get('type');
      const scramblerCode = scramblerNode.get('code');
      if (!scramblerType) {
        throw new YamlError(
          `Scrambler type property not found`,
          scramblerNode.range![0]
        );
      }
      if (!scramblerCode) {
        throw new YamlError(
          `Scrambler code property not found`,
          scramblerNode.range![0]
        );
      }
      if (scramblerType == 4 || scramblerType == 32) {
        if (scramblerCode > 0 && scramblerCode < scramblerType) {
          scrambler = { type: scramblerType, code: scramblerCode };
        } else {
          throw new YamlError(
            `Scrambler code too high ${scramblerCode}`,
            scramblerNode.range![0]
          );
        }
      } else {
        throw new YamlError(
          `Unknown scrambler type ${scramblerType}`,
          scramblerNode.range![0]
        );
      }
    } else {
      throw new YamlError(
        `Unknown channel property ${property.key.value}`,
        channelNode.range![0]
      );
    }
  }
  return {
    dsc,
    scrambler,
    name
  };
}
