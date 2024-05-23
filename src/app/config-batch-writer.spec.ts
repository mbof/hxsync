import { ConfigBatchWriter } from './config-batch-writer';
import { DatConfigProtocol } from './config-protocol';

describe('ConfigBatchWriter', () => {
  it('should create an instance', () => {
    let configProtocol: DatConfigProtocol;
    let configBatchReader: ConfigBatchWriter;
    const dat = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    configProtocol = new DatConfigProtocol(dat);
    configBatchReader = new ConfigBatchWriter(configProtocol);
  });
});
