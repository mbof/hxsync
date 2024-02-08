import { ChunkReader } from './chunkreader';

const encoder = new TextEncoder();

function _makeReader(chunks: Array<string>): ReadableStreamDefaultReader {
  var chunk_num = 0;
  let stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      //
    },
    pull(controller: ReadableStreamDefaultController) {
      if (chunk_num >= chunks.length) {
        controller.close();
      }
      controller.enqueue(encoder.encode(chunks[chunk_num]));
      chunk_num += 1;
    }
  });
  return stream.getReader();
}

describe('ChunkReader', () => {
  it('should create an instance', () => {
    expect(new ChunkReader(_makeReader(['']))).toBeTruthy();
  });
  it('should read from a partial chunk', async () => {
    let chunks = _makeReader(['abcdef']);
    let chunkReader = new ChunkReader(chunks);
    expect(await chunkReader.read(3)).toBe('abc');
    expect(await chunkReader.read(2)).toBe('de');
  });
  it('should read from multiple chunks', async () => {
    let chunks = _makeReader(['ab', 'cd', 'ef']);
    let chunkReader = new ChunkReader(chunks);
    expect(await chunkReader.read(3)).toBe('abc');
    expect(await chunkReader.read(3)).toBe('def');
    await expectAsync(chunkReader.read(1)).toBeRejectedWith(new Error('Stream is done'));
  });
  it('should readline from a chunk', async () => {
    let chunks = _makeReader(['abc\nde\nfg\n']);
    let chunkReader = new ChunkReader(chunks);
    expect(await chunkReader.readline()).toBe('abc\n');
    expect(await chunkReader.readline()).toBe('de\n');
  });
  it('should readline from multiple chunks', async () => {
    let chunks = _makeReader(['abc', 'def', 'gh\nij', 'kl', 'm\n']);
    let chunkReader = new ChunkReader(chunks);
    expect(await chunkReader.readline()).toBe('abcdefgh\n');
    expect(await chunkReader.readline()).toBe('ijklm\n');
    await expectAsync(chunkReader.readline()).toBeRejectedWith(new Error('Stream is done'));
  });
});
