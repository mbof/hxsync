import { YAMLMap, Document, Node } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { ConfigModuleInterface } from './config-module-interface';
import { Config, DeviceModel } from './device-configs';
import { CHANNEL_NAME_BYTES } from '../channel';

export type ExtraChannelType = 'rg' | 'exp';

export type ExtraChannelDeviceConfig = {
  privateChannels: Map<
    ExtraChannelType,
    {
      numChannels: number;
      enabledAddress: number;
      definitionsAddress: number;
      namesAddress: number;
    }
  >;
  expFormat: 'short' | 'long';
};

export const EXTRA_CHANNELS_DEVICE_CONFIG: Map<
  DeviceModel,
  ExtraChannelDeviceConfig
> = new Map([
  [
    'HX870',
    {
      expFormat: 'short',
      privateChannels: new Map([
        [
          'rg',
          {
            numChannels: 12,
            enabledAddress: 0x0182,
            definitionsAddress: 0x0aa0,
            namesAddress: 0x2fa0
          }
        ],
        [
          'exp',
          {
            numChannels: 20,
            enabledAddress: 0x0184,
            definitionsAddress: 0x0b00,
            namesAddress: 0x3120
          }
        ]
      ])
    }
  ],
  [
    'HX890',
    {
      expFormat: 'long',
      privateChannels: new Map([
        [
          'rg',
          {
            numChannels: 20,
            enabledAddress: 0x0182,
            definitionsAddress: 0x0d00,
            namesAddress: 0x3800
          }
        ],
        [
          'exp',
          {
            numChannels: 30,
            enabledAddress: 0x0185,
            definitionsAddress: 0x0f00,
            namesAddress: 0x3c00
          }
        ]
      ])
    }
  ]
]);

const SHORT_DEFINITION_BYTES = 8;
const LONG_DEFINITION_BYTES = 16;

export type ExtraChannelMemoryRangeId = {
  type: ExtraChannelType;
  id: 'enabled_bitfield' | 'definitions' | 'names';
};

export class ExtraChannelConfig implements ConfigModuleInterface {
  deviceConfig: ExtraChannelDeviceConfig | undefined;
  constructor(readonly deviceModel: DeviceModel) {
    this.deviceConfig = EXTRA_CHANNELS_DEVICE_CONFIG.get(deviceModel);
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
    for (const [type, deviceConfig] of config.privateChannels.entries()) {
      configBatchReader.addRange(
        {
          type,
          id: 'enabled_bitfield'
        },
        deviceConfig.enabledAddress,
        deviceConfig.enabledAddress + Math.ceil(deviceConfig.numChannels / 8)
      );
      const definitionLength =
        config.expFormat == 'short'
          ? SHORT_DEFINITION_BYTES
          : LONG_DEFINITION_BYTES;
      configBatchReader.addRange(
        {
          type,
          id: 'definitions'
        },
        deviceConfig.definitionsAddress,
        deviceConfig.definitionsAddress +
          definitionLength * deviceConfig.numChannels
      );
      configBatchReader.addRange(
        {
          type,
          id: 'names'
        },
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
    throw new Error('Method not implemented.');
  }
}
