import { Document, Node, parseDocument, YAMLMap, YAMLSeq } from 'yaml';
import { FmConfig } from './fm';
import { Config } from './device-configs';
import { ConfigBatchReader } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { YamlContext } from './config-module-interface';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { unhex } from '../message';

const FM_PRESET_YAML = `
- fm_presets:
    - bar: 107.8
    - foo: 104.4
`;

const FM_PRESET_BYTES = unhex(
  '01 107800 626172 ffffffffffffffffff' +
    '01 104400 666f6f ffffffffffffffffff' +
    'ffff ffff ffff ffff ffff ffff ffff ffff'.repeat(18)
);

describe('FmConfig', () => {
  let fmConfig: FmConfig;
  let config: Config;
  let yaml: Document<Node, true>;
  let configBatchReader: ConfigBatchReader;
  let configBatchWriter: ConfigBatchWriter;
  let datFile: Uint8Array;

  beforeEach(() => {
    config = {};
    yaml = new Document();
    yaml.contents = new YAMLSeq();
    datFile = createMockDat('HX890');
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should create an instance', () => {
    fmConfig = new FmConfig('HX890');
    expect(fmConfig).toBeTruthy();
  });
  it('should not add ranges to read for unsupported device', () => {
    fmConfig = new FmConfig('GX1400');
    fmConfig.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(0);
  });
  it('should add ranges to read for supported device', () => {
    fmConfig = new FmConfig('HX890');
    fmConfig.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(1);
    expect(configBatchReader.ranges.get('fm_presets')).toEqual({
      start: 0x0500,
      end: 0x0640
    });
  });
  it('should update config for supported device', async () => {
    fmConfig = new FmConfig('HX890');
    fmConfig.addRangesToRead(configBatchReader);
    datFile.set(FM_PRESET_BYTES, 0x0500);
    const results = await configBatchReader.read(() => {});
    fmConfig.updateConfig(results, config, yaml);
    expect(config.fmPresets).toBeDefined();
    expect(config.fmPresets?.length).toBe(2);
    expect(config.fmPresets?.[0].name).toBe('bar');
    expect(config.fmPresets?.[0].mhz).toBe(107.8);
    expect(config.fmPresets?.[1].name).toBe('foo');
    expect(config.fmPresets?.[1].mhz).toBe(104.4);
    expect(yaml.toString()).toEqual(FM_PRESET_YAML);
  });
  it('should parse YAML', () => {
    yaml = parseDocument(FM_PRESET_YAML);
    fmConfig = new FmConfig('HX890');
    fmConfig.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config,
        previousConfig: {}
      } as YamlContext
    );
    const [offset, data] = configBatchWriter.data.get('fm_presets')!;
    expect(offset).toBe(0x0500);
    expect(data).toEqual(FM_PRESET_BYTES);
    expect(config.fmPresets).toBeDefined();
    expect(config.fmPresets?.length).toBe(2);
    expect(config.fmPresets?.[0].name).toBe('bar');
    expect(config.fmPresets?.[0].mhz).toBe(107.8);
    expect(config.fmPresets?.[1].name).toBe('foo');
    expect(config.fmPresets?.[1].mhz).toBe(104.4);
  });
});
