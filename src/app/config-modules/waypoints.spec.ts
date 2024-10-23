import { Document, YAMLMap, YAMLSeq, parseDocument } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { WaypointConfig } from './waypoints';
import { Config } from './device-configs';
import { unhex } from '../message';

const WAYPOINTS_DIR_YAML = `
- waypoints:
    - Avalon: 33N20.720 118W19.417
    - Test wp!-[]#<>: 45N06.7890 123W03.5670
    - Marina: 33.84905 -118.27829
`;

const WAYPOINTS_DATA = `
FFFFFFFFF0332072004E0118194170574176616C6F6EFFFFFFFFFFFFFFFFFF01
FFFFFFFFF0335094304E0118166974574D6172696E61FFFFFFFFFFFFFFFFFF03
FFFFFFFFF0450678904E01230356705754657374207770212D5B5D233C3EFF02
`;

describe('WaypointConfig', () => {
  let waypointConfigModule: WaypointConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    waypointConfigModule = new WaypointConfig('HX890');
    datFile = createMockDat('HX890');
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should convert from YAML to binary', () => {
    const yaml = parseDocument(WAYPOINTS_DIR_YAML);
    const config: Config = {};
    const result = waypointConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config,
        previousConfig: {}
      }
    );
    expect(result).toBeTrue();
    const [offset, data] = configBatchWriter.data.get('waypoints')!;
    expect(offset).toBe(0xd700);
    expect(data.subarray(0, 32 * 3)).toEqual(unhex(WAYPOINTS_DATA));
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
    const result = waypointConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config,
        previousConfig: {}
      }
    );
    expect(result).toBeFalse();
  });

  it('should request the correct ranges to read', () => {
    waypointConfigModule.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(1);
    expect(configBatchReader.ranges.get('waypoints')).toEqual({
      start: 0xd700,
      end: 0xf640
    });
  });
  it('should produce YAML from a binary', () => {
    const results: BatchReaderResults = new Map();
    const data = new Uint8Array(0xf640 - 0xd700);
    data.fill(255);
    data.set(unhex(WAYPOINTS_DATA));
    results.set('waypoints', data);
    const config: Config = {};
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    waypointConfigModule.updateConfig(results, config, yaml);
    config.waypoints![0].wp.id = 0xaa;

    expect(yaml.toString()).toBe(`
- waypoints:
    - Avalon: 33N20.7200 118W19.4170
    - Marina: 33N50.9430 118W16.6974
    - Test wp!-[]#<>: 45N06.7890 123W03.5670
`);
    expect(config.waypoints?.length).toBe(3);
    expect(config.waypoints![1].toString()).toBe(
      '@0xD720: 3, Marina, 33N509430, 118W166974'
    );
  });
  it('should keep IDs stable', async () => {
    const results: BatchReaderResults = new Map();
    const data = new Uint8Array(0xf640 - 0xd700);
    data.fill(255);
    data.set(unhex(WAYPOINTS_DATA));
    results.set('waypoints', data);
    const config: Config = {};
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    waypointConfigModule.updateConfig(results, config, yaml);
    expect(config.waypoints!.length).toBe(3);
    config.waypoints!.splice(0, 1);
    config.waypoints![0].wp.id = 100;
    config.waypoints![1].wp.id = 101;
    const yaml2 = parseDocument(WAYPOINTS_DIR_YAML);
    const config2: Config = {};
    const result = waypointConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config2,
        previousConfig: config
      }
    );
    expect(config2.waypoints![0].wp.id).toBe(1);
    expect(config2.waypoints![1].wp.id).toBe(100);
    expect(config2.waypoints![2].wp.id).toBe(101);
    const data2 = configBatchWriter.data.get('waypoints')![1];
    const data3 = unhex(WAYPOINTS_DATA);
    data3[32 * 1 - 1] = 1;
    data3[32 * 2 - 1] = 100;
    data3[32 * 3 - 1] = 101;
    expect(data2.subarray(0, 96)).toEqual(data3);
  });
});
