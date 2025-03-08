import { YAMLMap, Document, Node, YAMLSeq, Scalar } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { Config } from './device-configs';
import { DeviceModel } from './device-configs';
import { ConfigModuleInterface, YamlContext } from './config-module-interface';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { ChannelGroup, parseChannelGroupData } from '../channel-group';

export type ChannelGroupDeviceConfig = {
  startAddress: number;
  numGroups: number;
  bytesPerChannelGroup: 16;
};

export const CHANNEL_GROUP_DEVICE_CONFIGS: Map<
  DeviceModel,
  ChannelGroupDeviceConfig
> = new Map([
  [
    'HX890',
    {
      startAddress: 0x0070,
      numGroups: 3,
      bytesPerChannelGroup: 16
    }
  ],
  [
    'HX870',
    {
      startAddress: 0x0070,
      numGroups: 3,
      bytesPerChannelGroup: 16
    }
  ]
  // Not turned on because HX891BT channel group names have a
  // slightly different memory layout.
  // [
  //   'HX891BT',
  //   {
  //     startAddress: 0x0070,
  //     numGroups: 3,
  //     bytesPerChannelGroup: 16
  //   }
  // ],
]);

export class ChannelGroupConfig implements ConfigModuleInterface {
  deviceConfig: ChannelGroupDeviceConfig | undefined;
  constructor(readonly deviceModel: DeviceModel) {
    this.deviceConfig = CHANNEL_GROUP_DEVICE_CONFIGS.get(deviceModel);
  }
  maybeVisitYamlNode(
    node: YAMLMap<unknown, unknown>,
    ctx: YamlContext
  ): boolean {
    const channelGroupsNode = node.get('channel_groups');
    if (!channelGroupsNode) {
      return false;
    }
    if (!this.deviceConfig) {
      throw new YamlError(
        `Unsupported configuration for ${this.deviceModel}`,
        node
      );
    }
    const deviceConfig = this.deviceConfig;
    if (!(channelGroupsNode instanceof YAMLSeq)) {
      throw new YamlError('Unexpected channel groups node type', node);
    }
    try {
      var channelGroups: ChannelGroup[] = channelGroupsNode.items.map(
        (cgNode, index) =>
          parseChannelGroupYaml(
            cgNode,
            ctx.previousConfig.channelGroups?.[index]
          )
      );
    } catch (e) {
      if (e instanceof Error) {
        throw new YamlError(e.toString(), node);
      }
      throw e;
    }
    if (channelGroups.length != this.deviceConfig.numGroups) {
      throw new YamlError(
        `Unexpected number of channel groups (expected ${this.deviceConfig.numGroups}, found ${channelGroups.length})`,
        node
      );
    }
    const data = new Uint8Array(
      this.deviceConfig.numGroups * this.deviceConfig.bytesPerChannelGroup
    );
    for (const [index, channelGroup] of channelGroups.entries()) {
      channelGroup.fillConfig(
        data.subarray(
          index * this.deviceConfig.bytesPerChannelGroup,
          (index + 1) * this.deviceConfig.bytesPerChannelGroup
        )
      );
    }
    ctx.configOut.channelGroups = channelGroups;
    ctx.configBatchWriter.prepareWrite(
      'channel_groups',
      this.deviceConfig.startAddress,
      data
    );
    return true;
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    if (!this.deviceConfig) {
      return;
    }
    configBatchReader.addRange(
      'channel_groups',
      this.deviceConfig.startAddress,
      this.deviceConfig.startAddress +
        this.deviceConfig.numGroups * this.deviceConfig.bytesPerChannelGroup
    );
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    _yaml: Document<Node, true>
  ): void {
    if (!this.deviceConfig) {
      return;
    }
    const result = results.get('channel_groups');
    if (!result) {
      return;
    }
    const channelGroups: ChannelGroup[] = [];
    for (let i = 0; i < this.deviceConfig.numGroups; i++) {
      const channelGroup = parseChannelGroupData(
        result.slice(
          i * this.deviceConfig.bytesPerChannelGroup,
          (i + 1) * this.deviceConfig.bytesPerChannelGroup
        )
      );
      channelGroups.push(channelGroup);
    }
    config.channelGroups = channelGroups;
    /*
      Don't populate the channel group data in YAML anymore, as it's not
      very useful.
      */
  }
}

function parseChannelGroupYaml(
  channelGroupNode: any,
  previousChannelGroup?: ChannelGroup
): ChannelGroup {
  if (
    !(
      channelGroupNode instanceof YAMLMap &&
      channelGroupNode.items.length == 1 &&
      channelGroupNode.items[0].key instanceof Scalar &&
      channelGroupNode.items[0].value instanceof YAMLMap
    )
  ) {
    throw new YamlError('Unexpected channel group node type', channelGroupNode);
  }
  const name = channelGroupNode.items[0].key.value;
  let enable = true;
  let enable_dsc = true;
  let enable_atis = false;
  let model_name;
  const channelGroupProperties = channelGroupNode.items[0].value;
  for (const channelGroupProperty of channelGroupProperties.items) {
    if (
      !(
        channelGroupProperty.key instanceof Scalar &&
        channelGroupProperty.value instanceof Scalar
      )
    ) {
      throw new YamlError(
        'Unexpected channel group property type',
        channelGroupProperties
      );
    }
    if (!(typeof channelGroupProperty.key.value == 'string')) {
      throw new YamlError(
        'Unexpected channel group property key',
        channelGroupProperties
      );
    }
    if (channelGroupProperty.key.value == 'enable') {
      if (!(typeof channelGroupProperty.value.value == 'boolean')) {
        throw new YamlError(
          'Channel group enable property must be boolean',
          channelGroupProperties
        );
      }
      enable = channelGroupProperty.value.value;
    } else if (channelGroupProperty.key.value == 'enable_dsc') {
      if (!(typeof channelGroupProperty.value.value == 'boolean')) {
        throw new YamlError(
          'Channel group enable_dsc property must be boolean',
          channelGroupProperties
        );
      }
      enable_dsc = channelGroupProperty.value.value;
    } else if (channelGroupProperty.key.value == 'enable_atis') {
      if (!(typeof channelGroupProperty.value.value == 'boolean')) {
        throw new YamlError(
          'Channel group enable_atis property must be boolean',
          channelGroupProperties
        );
      }
      enable_atis = channelGroupProperty.value.value;
    } else if (channelGroupProperty.key.value == 'model_name') {
      if (!(typeof channelGroupProperty.value.value == 'string')) {
        throw new YamlError(
          'Channel group model_name property must be a string',
          channelGroupProperties
        );
      }
      model_name = channelGroupProperty.value.value;
    } else {
      throw new YamlError(
        `Unknown channel group property ${channelGroupProperty.key.value}`,
        channelGroupProperties
      );
    }
  }
  if (!model_name) {
    if (previousChannelGroup?.cg.model_name) {
      model_name = previousChannelGroup.cg.model_name;
    } else {
      throw new YamlError(
        'Missing model_name for channel group',
        channelGroupNode
      );
    }
  }
  return new ChannelGroup({
    name,
    enable,
    enable_dsc,
    enable_atis,
    model_name
  });
}
