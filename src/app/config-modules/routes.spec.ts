import { Document, YAMLMap, YAMLSeq, parseDocument } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { Config } from '../config-session';
import { unhex } from '../message';
import { RouteConfig } from './routes';
import { Waypoint } from '../waypoint';

const waypoints: Waypoint[] = [
  {
    name: 'Alpha',
    id: 1,
    lat_deg: 0,
    lat_dir: 'N',
    lat_min: 0,
    lon_deg: 0,
    lon_dir: 'E',
    lon_min: 0
  },
  {
    name: 'Bravo',
    id: 2,
    lat_deg: 0,
    lat_dir: 'N',
    lat_min: 0,
    lon_deg: 0,
    lon_dir: 'E',
    lon_min: 0
  },
  {
    name: 'Charlie',
    id: 3,
    lat_deg: 0,
    lat_dir: 'N',
    lat_min: 0,
    lon_deg: 0,
    lon_dir: 'E',
    lon_min: 0
  }
].map((wp) => new Waypoint(wp));

const ROUTE_DIR_YAML = `
- routes: 
    - Route A:
        - Alpha
        - Bravo
        - Charlie
    - Route B:
        - Bravo
        - Alpha
`;

const ROUTE_BINARY = `
526F7574652041FFFFFFFFFFFFFFFFFF
030102FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
526F7574652042FFFFFFFFFFFFFFFFFF
0102FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
`;

describe('RoutesConfig', () => {
  let routeConfigModule: RouteConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    routeConfigModule = new RouteConfig('HX890');
    datFile = createMockDat('HX890');
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should convert from YAML to binary', () => {
    const yaml = parseDocument(ROUTE_DIR_YAML);
    const config: Config = { waypoints };
    const result = routeConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config,
      {}
    );
    expect(result).toBeTrue();
    const [offset, data] = configBatchWriter.data.get('routes')!;
    expect(offset).toBe(0xc700);
    expect(data.subarray(0, 64 * 2)).toEqual(unhex(ROUTE_BINARY));
  });

  it('should ignore unknown YAML contents', () => {
    const yaml = parseDocument(`
      - foo:
          - DDD: "023456789"
          - BBB: "088888888"
          - AAA: "076543210"
          - CCC: "099999999"
    `);
    const config: Config = { waypoints };
    const result = routeConfigModule.maybeVisitYamlNode(
      (yaml.contents as YAMLSeq).items[0] as YAMLMap,
      configBatchWriter,
      config,
      {}
    );
    expect(result).toBeFalse();
  });

  it('should request the correct ranges to read', () => {
    routeConfigModule.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(1);
    expect(configBatchReader.ranges.get('routes')).toEqual({
      start: 0xc700,
      end: 0xcc00
    });
  });
  it('should produce YAML from a binary', () => {
    const results: BatchReaderResults = new Map();
    const data = new Uint8Array(0xf640 - 0xd700);
    data.fill(255);
    data.set(unhex(ROUTE_BINARY));
    results.set('routes', data);
    const config: Config = { waypoints };
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    routeConfigModule.updateConfig(results, config, yaml);

    expect(yaml.toString()).toBe(`
- routes:
    - Route A:
        - Alpha
        - Bravo
        - Charlie
    - Route B:
        - Bravo
        - Alpha
`);
  });
});
