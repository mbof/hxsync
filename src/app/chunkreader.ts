const decoder = new TextDecoder('utf-8');

export class ChunkReader {
  private chunk: string = "";
  private pos: number = 0;
  constructor(private reader: ReadableStreamDefaultReader) { };
  private async _getNextChunk() {
    let chunk_bytes = await this.reader.read();
    if (chunk_bytes.done) {
      throw new Error('Stream is done');
    }
    this.chunk = decoder.decode(chunk_bytes.value);
    this.pos = 0;
  }
  async read(length: number): Promise<string> {
    var ans = "";
    while (true) {
      if (this.pos + length - ans.length <= this.chunk.length) {
        let next_pos = this.pos + length - ans.length;
        ans += this.chunk.slice(this.pos, next_pos);
        this.pos = next_pos;
        return ans;
      } else {
        ans += this.chunk.slice(this.pos);
        await this._getNextChunk();
      }
    }
  }
  async readline(): Promise<string> {
    var ans = "";
    while (true) {
      if (this.pos < this.chunk.length) {
        let newline_pos = this.chunk.indexOf('\n', this.pos);
        if (newline_pos != -1) {
          ans += this.chunk.slice(this.pos, newline_pos + 1);
          this.pos = newline_pos + 1;
          return ans;
        }
        ans += this.chunk.slice(this.pos);
      }
      await this._getNextChunk();
    }
  }
}
