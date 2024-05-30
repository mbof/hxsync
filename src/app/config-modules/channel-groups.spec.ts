import { Document, YAMLMap, YAMLSeq, parseDocument } from 'yaml';
import { BatchReaderResults, ConfigBatchReader } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { ChannelGroupConfig } from './channel-groups';
import { Config } from '../config-session';
import { hexarr, unhex } from '../message';
import { ChannelGroup, ChannelGroupData } from '../channel-group';

const CHANNEL_GROUPS_YAML = `
- channel_groups:
    - USA:
        enable: true
        enable_dsc: true
        enable_atis: false
        model_name: HX890
    - INTL:
        enable: true
        enable_dsc: false
        enable_atis: true
        model_name: HX890E
    - CAN:
        enable: false
        enable_dsc: true
        enable_atis: true
        model_name: HX890
`;

const CHANNEL_GROUPS_YAML_NO_OPTIONS = `
- channel_groups:
    - USA:
        enable: true
    - INTL:
        enable: true
    - CAN:
        enable: false
`;

const CHANNEL_GROUPS_HEX =
  '010100555341FFFF4858383930FFFFFF' +
  '010001494E544CFF485838393045FFFF' +
  '00010143414EFFFF4858383930FFFFFF';

const CHANNEL_GROUPS_HEX_NO_OPTIONS =
  '010100555341FFFF4858383930FFFFFF' +
  '010100494E544CFF485838393045FFFF' +
  '00010043414EFFFF4858383930FFFFFF';

const CHANNEL_GROUP_DATAS: ChannelGroupData[] = [
  {
    name: 'USA',
    enable: true,
    enable_dsc: true,
    enable_atis: false,
    model_name: 'HX890'
  },
  {
    name: 'INTL',
    enable: true,
    enable_dsc: false,
    enable_atis: true,
    model_name: 'HX890E'
  },
  {
    name: 'CAN',
    enable: false,
    enable_dsc: true,
    enable_atis: true,
    model_name: 'HX890'
  }
];

const CHANNEL_GROUP_DATAS_NO_OPTIONS: ChannelGroupData[] = [
  {
    name: 'USA',
    enable: true,
    enable_dsc: true,
    enable_atis: false,
    model_name: 'HX890'
  },
  {
    name: 'INTL',
    enable: true,
    enable_dsc: true,
    enable_atis: false,
    model_name: 'HX890E'
  },
  {
    name: 'CAN',
    enable: false,
    enable_dsc: true,
    enable_atis: false,
    model_name: 'HX890'
  }
];

describe('ChannelGroupsConfig', () => {
  let channelGroupConfigModule: ChannelGroupConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    channelGroupConfigModule = new ChannelGroupConfig('HX890');
    datFile = createMockDat('HX890');
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should convert from YAML to binary', () => {
    const yaml = parseDocument(CHANNEL_GROUPS_YAML);
    const config: Config = {};
    const result = channelGroupConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config,
      {}
    );
    expect(result).toBeTrue();
    expect(config.channelGroups![0].cg).toEqual(CHANNEL_GROUP_DATAS[0]);
    expect(config.channelGroups![1].cg).toEqual(CHANNEL_GROUP_DATAS[1]);
    expect(config.channelGroups![2].cg).toEqual(CHANNEL_GROUP_DATAS[2]);
    const [offset, data] = configBatchWriter.data.get('channel_groups')!;
    expect(offset).toEqual(0x70);
    expect(hexarr(data)).toEqual(CHANNEL_GROUPS_HEX);
  });
  it('should keep previous model name stable', () => {
    const yaml = parseDocument(CHANNEL_GROUPS_YAML_NO_OPTIONS);
    const previousConfig: Config = {
      channelGroups: CHANNEL_GROUP_DATAS.map((cg) => new ChannelGroup(cg))
    };
    const config: Config = {};
    const result = channelGroupConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config,
      previousConfig
    );
    expect(result).toBeTrue();
    expect(config.channelGroups![0].cg).toEqual(
      CHANNEL_GROUP_DATAS_NO_OPTIONS[0]
    );
    expect(config.channelGroups![1].cg).toEqual(
      CHANNEL_GROUP_DATAS_NO_OPTIONS[1]
    );
    expect(config.channelGroups![2].cg).toEqual(
      CHANNEL_GROUP_DATAS_NO_OPTIONS[2]
    );
    const [offset, data] = configBatchWriter.data.get('channel_groups')!;
    expect(offset).toEqual(0x70);
    expect(hexarr(data)).toEqual(CHANNEL_GROUPS_HEX_NO_OPTIONS);
  });
  it('should convert from binary to YAML', () => {
    const results: BatchReaderResults = new Map();
    results.set('channel_groups', unhex(CHANNEL_GROUPS_HEX));
    const config: Config = {};
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    channelGroupConfigModule.updateConfig(results, config, yaml);
    expect(config.channelGroups![0].cg).toEqual(CHANNEL_GROUP_DATAS[0]);
    expect(config.channelGroups![1].cg).toEqual(CHANNEL_GROUP_DATAS[1]);
    expect(config.channelGroups![2].cg).toEqual(CHANNEL_GROUP_DATAS[2]);
    expect(yaml.toString()).toEqual(CHANNEL_GROUPS_YAML);
  });
});
