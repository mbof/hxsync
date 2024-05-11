import { ConfigProtocol, DatConfigProtocol } from './config-protocol';

describe('DatConfigProtocol', () => {
  it('reads from an image', async () => {
    const datFile = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const datConfigProtocol = new DatConfigProtocol(datFile);
    const datExcerpt = await datConfigProtocol.readConfigMemory(2, 3, () => {});
    expect(datExcerpt).toEqual(new Uint8Array([3, 4, 5]));
  });
  it('writes to an image', async () => {
    const datFile = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const datConfigProtocol = new DatConfigProtocol(datFile);
    await datConfigProtocol.writeConfigMemory(
      new Uint8Array([253, 254, 255]),
      2,
      () => {}
    );
    expect(datConfigProtocol.datImage).toEqual(
      new Uint8Array([1, 2, 253, 254, 255, 6])
    );
  });
});
