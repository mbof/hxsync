import { config } from 'process';
import { ConfigBatchReader } from './config-batch-reader';
import { DatConfigProtocol } from './config-protocol';

describe('ConfigBatchReader', () => {
  let configProtocol: DatConfigProtocol;
  let configBatchReader: ConfigBatchReader;
  beforeEach(() => {
    const dat = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    configProtocol = new DatConfigProtocol(dat);
    configBatchReader = new ConfigBatchReader(configProtocol);
  });
  it('should support batch reads', async () => {
    configBatchReader.addRange('group_mmsi_names', 2, 4);
    configBatchReader.addRange('individual_mmsi_names', 5, 7);
    const result = await configBatchReader.read(() => {});
    expect(result.get('group_mmsi_names')).toEqual(new Uint8Array([2, 3]));
    expect(result.get('individual_mmsi_names')).toEqual(new Uint8Array([5, 6]));
    expect(result.get('individual_mmsi_numbers')).toBe(undefined);
  });
  it('should reset properly', async () => {
    configBatchReader.addRange('group_mmsi_names', 2, 4);
    configBatchReader.addRange('individual_mmsi_names', 5, 7);
    configBatchReader.reset();
    configBatchReader.addRange('individual_mmsi_numbers', 3, 6);
    const result = await configBatchReader.read(() => {});
    expect(result.get('group_mmsi_names')).toBe(undefined);
    expect(result.get('individual_mmsi_names')).toBe(undefined);
    expect(result.get('individual_mmsi_numbers')).toEqual(
      new Uint8Array([3, 4, 5])
    );
  });
});
