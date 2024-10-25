import { decodeChannelConfig, parseChannelId } from './channel';
import { unhex } from './message';

const ENABLED_FLAGS = unhex('fffffffffffffc00');
const COMMERCIAL_NAME_DATA = unhex('434F4D4D45524349414CFFFFFFFFFFFF');

describe('decodeChannelConfig', () => {
  it('should decode a simple channel config', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('08307F00'),
      COMMERCIAL_NAME_DATA,
      true
    )!;
    expect(channel.id).toBe('08');
    expect(channel.flags).toEqual(unhex('08307F00'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('disabled');
    expect(channel.name).toBe('COMMERCIAL');
  });
  it('should decode a prefixed channel config', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('07300A00'),
      unhex('434F4D4D45524349414CFFFFFFFFFFFF'),
      true
    )!;
    expect(channel.id).toBe('1007');
    expect(channel.flags).toEqual(unhex('07300A00'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('disabled');
    expect(channel.name).toBe('COMMERCIAL');
    expect(channel.scrambler).toBeUndefined();
  });
  it('should decode a suffixed channel config', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('07317F00'),
      unhex('434F4D4D45524349414CFFFFFFFFFFFF'),
      true
    )!;
    expect(channel.id).toBe('07A');
    expect(channel.flags).toEqual(unhex('07317F00'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('disabled');
    expect(channel.name).toBe('COMMERCIAL');
    expect(channel.scrambler).toBeUndefined();
  });
  it('should decode a DSC enabled channel config', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('0830FF00'),
      COMMERCIAL_NAME_DATA,
      true
    )!;
    expect(channel.id).toBe('08');
    expect(channel.flags).toEqual(unhex('0830FF00'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('enabled');
    expect(channel.name).toBe('COMMERCIAL');
    expect(channel.scrambler).toBeUndefined();
  });
  it('should decode a channel with 4-type scramble code', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('0830FF81'),
      COMMERCIAL_NAME_DATA,
      true
    )!;
    expect(channel.id).toBe('08');
    expect(channel.flags).toEqual(unhex('0830FF81'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('enabled');
    expect(channel.name).toBe('COMMERCIAL');
    expect(channel.scrambler).toEqual({
      type: 4,
      code: 1
    });
  });
  it('should decode a channel with 32-type scramble code', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      ENABLED_FLAGS,
      unhex('0830FFDF'),
      COMMERCIAL_NAME_DATA,
      true
    )!;
    expect(channel.id).toBe('08');
    expect(channel.flags).toEqual(unhex('0830FFDF'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('enabled');
    expect(channel.name).toBe('COMMERCIAL');
    expect(channel.scrambler).toEqual({
      type: 32,
      code: 31
    });
  });
  it('should decode a disabled channel', () => {
    const channel = decodeChannelConfig(
      'HX',
      4,
      unhex('f7fffffffffffc00'),
      unhex('08307F00'),
      COMMERCIAL_NAME_DATA,
      false
    )!;
    expect(channel.id).toBe('08');
    expect(channel.flags).toEqual(unhex('08307F00'));
    expect(channel.enabled).toBeFalse();
    expect(channel.dsc).toBe('disabled');
    expect(channel.name).toBe('COMMERCIAL');
  });
  it('should decode a simple GX1400 channel config', () => {
    const channel = decodeChannelConfig(
      'GX',
      4,
      ENABLED_FLAGS,
      unhex('86c0'),
      undefined,
      false
    )!;
    expect(channel.id).toBe('06');
    expect(channel.flags).toEqual(unhex('86c0'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('enabled');
    expect(channel.name).toBe(undefined);
  });
  it('should decode a GX1400 channel config with prefix', () => {
    const channel = decodeChannelConfig(
      'GX',
      4,
      ENABLED_FLAGS,
      unhex('50c4'),
      undefined,
      false
    )!;
    expect(channel.id).toBe('1080');
    expect(channel.flags).toEqual(unhex('50c4'));
    expect(channel.enabled).toBeTrue();
    expect(channel.dsc).toBe('disabled');
    expect(channel.name).toBe(undefined);
  });
});

describe('parseChannelId', () => {
  it('parses a simple channel', () => {
    expect(parseChannelId(88)).toEqual({
      numeric_id: 88,
      prefix: undefined,
      suffix: undefined
    });
  });
  it('parses a single-digit channel', () => {
    expect(parseChannelId(6)).toEqual({
      numeric_id: 6,
      prefix: undefined,
      suffix: undefined
    });
  });
  it('parses a channel encoded as string', () => {
    expect(parseChannelId('06')).toEqual({
      numeric_id: 6,
      prefix: undefined,
      suffix: undefined
    });
  });
  it('parses a channel with prefix', () => {
    expect(parseChannelId(1081)).toEqual({
      numeric_id: 81,
      prefix: 10,
      suffix: undefined
    });
  });
  it('parses a channel with prefix encoded as string', () => {
    expect(parseChannelId('1081')).toEqual({
      numeric_id: 81,
      prefix: 10,
      suffix: undefined
    });
  });
  it('parses a channel with suffix', () => {
    expect(parseChannelId('39A')).toEqual({
      numeric_id: 39,
      prefix: undefined,
      suffix: 'A'
    });
  });
});
