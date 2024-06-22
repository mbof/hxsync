import { YAMLMap, Document, Node } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { ConfigModuleInterface } from './config-module-interface';
import { Config, DeviceModel, MemoryRangeId } from './device-configs';
import {
  CHANNEL_NAME_BYTES,
  MARINE_FLAG_BYTES,
  MarineChannelConfig,
  decodeChannelConfig
} from '../channel';
import { readPaddedString } from '../util';

export type MarineChannelSection = 'group_1' | 'group_2' | 'group_3';

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
  ): MarineChannelMemoryRangeId | undefined {
    return this.memoryRanges.find(
      (range) => range.section == section && range.id == subId
    );
  }
  maybeVisitYamlNode(
    node: YAMLMap<unknown, unknown>,
    configBatchWriter: ConfigBatchWriter,
    configOut: Config,
    previousConfig: Config
  ): boolean {
    throw new Error('Method not implemented.');
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    const config = this.deviceConfig;
    if (!config) {
      return;
    }
    for (const [section, deviceConfig] of config.marineChannels.entries()) {
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'enabled_bitfield')!,
        deviceConfig.enabledAddress,
        deviceConfig.enabledAddress + Math.ceil(deviceConfig.numChannels / 8)
      );
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'flags')!,
        deviceConfig.flagsAddress,
        deviceConfig.flagsAddress + deviceConfig.numChannels * MARINE_FLAG_BYTES
      );
      configBatchReader.addRange(
        this.getMemoryRangeId(section, 'names')!,
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
        this.getMemoryRangeId(section, 'enabled_bitfield')!
      )!;
      const flagsData = results.get(this.getMemoryRangeId(section, 'flags')!)!;
      const namesData = results.get(this.getMemoryRangeId(section, 'names')!)!;
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
