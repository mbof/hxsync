import { ConfigBatchWriter } from '../config-batch-writer';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { DscConfig } from './dsc';
import { Document, YAMLMap, YAMLSeq, parseDocument } from 'yaml';
import { Config } from './device-configs';
import { unhex } from '../message';
import { ConfigBatchReader } from '../config-batch-reader';

const DSC_DIRECTORY_YAML = `
- dsc_directory:
    - DDD: "123456789"
    - BBB: "888888888"
    - AAA: "876543210"
    - CCC: "999999999"
`;

const DSC_DIRECTORY_NAMES_BINARY = unhex(
  '414141FFFFFFFFFFFFFFFFFFFFFFFFFF' +
    '424242FFFFFFFFFFFFFFFFFFFFFFFFFF' +
    '434343FFFFFFFFFFFFFFFFFFFFFFFFFF' +
    '444444FFFFFFFFFFFFFFFFFFFFFFFFFF'
);

const DSC_DIRECTORY_NUMBERS_BINARY = unhex(
  '876543210088888888809999999990FF1234567890FFFFFFFFFFFFFFFFFFFFFF'
);

const GROUP_DIRECTORY_YAML = `
- group_directory:
  - DDD: "023456789"
  - BBB: "088888888"
  - AAA: "076543210"
  - CCC: "099999999"
`;

const GROUP_DIRECTORY_NUMBERS_BINARY = unhex(
  '076543210008888888800999999990FF0234567890FFFFFFFFFFFFFFFFFFFFFF'
);

describe('DscConfig', () => {
  let dscConfigModule: DscConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    dscConfigModule = new DscConfig('HX890');
    datFile = createMockDat('HX890');
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should convert from YAML to binary (individual directory)', () => {
    const yaml = parseDocument(DSC_DIRECTORY_YAML);
    const config: Config = {};
    const result = dscConfigModule.maybeVisitYamlNodeIndividual(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config
    );
    expect(result).toBeTrue();
    const [offset, data] = configBatchWriter.data.get('individual_mmsi_names')!;
    expect(offset).toBe(0x4500);
    expect(data.subarray(0, 64)).toEqual(DSC_DIRECTORY_NAMES_BINARY);
    const [offset_2, data_2] = configBatchWriter.data.get(
      'individual_mmsi_numbers'
    )!;
    expect(offset_2).toBe(0x4200);
    expect(data_2.subarray(0, 32)).toEqual(DSC_DIRECTORY_NUMBERS_BINARY);
  });
  it('should convert from YAML to binary (group directory)', () => {
    const yaml = parseDocument(GROUP_DIRECTORY_YAML);
    const config: Config = {};
    const result = dscConfigModule.maybeVisitYamlNodeGroup(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config
    );
    expect(result).toBeTrue();
    const [offset, data] = configBatchWriter.data.get('group_mmsi_names')!;
    expect(offset).toBe(0x5100);
    expect(data.subarray(0, 64)).toEqual(DSC_DIRECTORY_NAMES_BINARY);
    const [offset_2, data_2] =
      configBatchWriter.data.get('group_mmsi_numbers')!;
    expect(offset_2).toBe(0x5000);
    expect(data_2.subarray(0, 32)).toEqual(GROUP_DIRECTORY_NUMBERS_BINARY);
  });
  it('should ignore unknown YAML contents', () => {
    const yaml = parseDocument(`
      - foo:
          - DDD: "023456789"
          - BBB: "088888888"
          - AAA: "076543210"
          - CCC: "099999999"
    `);
    const config: Config = {};
    const result = dscConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config
    );
    expect(result).toBeFalse();
  });

  it('should request the correct ranges to read', () => {
    dscConfigModule.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(4);
    expect(configBatchReader.ranges.get('individual_mmsi_names')).toEqual({
      start: 0x4500,
      end: 0x4b40
    });
    expect(configBatchReader.ranges.get('individual_mmsi_numbers')).toEqual({
      start: 0x4200,
      end: 0x4415
    });
    expect(configBatchReader.ranges.get('group_mmsi_names')).toEqual({
      start: 0x5100,
      end: 0x5240
    });
    expect(configBatchReader.ranges.get('group_mmsi_numbers')).toEqual({
      start: 0x5000,
      end: 0x506a
    });
  });

  it('should produce correct YAML', async () => {
    datFile.set(DSC_DIRECTORY_NAMES_BINARY, 0x4500);
    datFile.set(DSC_DIRECTORY_NUMBERS_BINARY, 0x4200);
    datFile.set(DSC_DIRECTORY_NAMES_BINARY, 0x5100);
    datFile.set(GROUP_DIRECTORY_NUMBERS_BINARY, 0x5000);
    dscConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    dscConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(`
- dsc_directory:
    - AAA: "876543210"
    - BBB: "888888888"
    - CCC: "999999999"
    - DDD: "123456789"

- group_directory:
    - AAA: "076543210"
    - BBB: "088888888"
    - CCC: "099999999"
    - DDD: "023456789"
`);
  });
});
