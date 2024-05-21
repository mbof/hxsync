import { config } from 'process';
import { ConfigProtocolInterface } from './config-protocol';
import { MemoryRangeId } from './config-session';

export type BatchReaderRanges = Map<
  MemoryRangeId,
  { start: number; end: number }
>;
export type BatchReaderResults = Map<MemoryRangeId, Uint8Array>;

export class ConfigBatchReader {
  constructor(private configProtocol: ConfigProtocolInterface) {}
  ranges: BatchReaderRanges = new Map<
    MemoryRangeId,
    { start: number; end: number }
  >();
  addRange(id: MemoryRangeId, start: number, end: number) {
    this.ranges.set(id, {
      start,
      end
    });
  }
  reset() {
    this.ranges.clear();
  }
  async read(
    progressCallback: (offset: number) => void
  ): Promise<BatchReaderResults> {
    const results = new Map<MemoryRangeId, Uint8Array>();
    let previousOffsets = 0;
    let totalSize = 0;
    this.ranges.forEach((range) => {
      totalSize += range.end - range.start;
    });
    for (const [id, range] of this.ranges.entries()) {
      results.set(
        id,
        await this.configProtocol.readConfigMemory(
          range.start,
          range.end - range.start,
          (offset: number) => {
            progressCallback((offset + previousOffsets) / totalSize);
          }
        )
      );
      previousOffsets += range.end - range.start;
    }
    return results;
  }
}
