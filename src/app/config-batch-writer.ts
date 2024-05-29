import { ConfigProtocolInterface } from './config-protocol';
import { MemoryRangeId } from './config-session';

export class ConfigBatchWriter {
  data = new Map<MemoryRangeId, [number, Uint8Array]>();
  constructor(private configProtocol: ConfigProtocolInterface) {}
  prepareWrite(id: MemoryRangeId, offset: number, data: Uint8Array) {
    this.data.set(id, [offset, data]);
  }
  async write(progressCallback: (progress: number) => void) {
    let totalSize = 0;
    this.data.forEach(([_, data]) => (totalSize += data.length));
    let previousOffsets = 0;
    for (const [_, [offset, data]] of this.data) {
      await this.configProtocol.writeConfigMemory(data, offset, (progress) => {
        progressCallback((previousOffsets + progress) / totalSize);
      });
      previousOffsets += data.length;
    }
  }
}
