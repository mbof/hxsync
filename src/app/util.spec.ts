import { fillPaddedString, readPaddedString, haversine } from './util';

describe('readPaddedString', () => {
  it('should read a string with some padding', () => {
    const test = new Uint8Array([0x30, 0x31, 0x32, 0xff, 0xff, 0xff]);
    const str = readPaddedString(test);
    expect(str).toBe('012');
  });
  it('should read an empty string', () => {
    const test = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]);
    const str = readPaddedString(test);
    expect(str).toBe('');
  });
  it('should read a string with no padding', () => {
    const test = new Uint8Array([0x30, 0x31, 0x32]);
    const str = readPaddedString(test);
    expect(str).toBe('012');
  });
  it('should read a string with padding in the middle', () => {
    const test = new Uint8Array([0x30, 0x31, 0xff, 0x32]);
    const str = readPaddedString(test);
    expect(str).toBe('01');
  });
  it('should read a string with padding in the middle', () => {
    const test = new Uint8Array([0x30, 0x31, 0x20, 0xff, 0x32]);
    const str = readPaddedString(test);
    expect(str).toBe('01');
  });
});

describe('fillPaddedString', () => {
  it('should write a string with some padding', () => {
    const test = new Uint8Array(6);
    fillPaddedString(test, '012');
    expect(test).toEqual(new Uint8Array([0x30, 0x31, 0x32, 0xff, 0xff, 0xff]));
  });
  it('should write a string that fills the whole buffer', () => {
    const test = new Uint8Array(3);
    fillPaddedString(test, '012');
    expect(test).toEqual(new Uint8Array([0x30, 0x31, 0x32]));
  });
  it('should write an empty string', () => {
    const test = new Uint8Array(3);
    fillPaddedString(test, '');
    expect(test).toEqual(new Uint8Array([0xff, 0xff, 0xff]));
  });
});

describe('haversine', () => {
  it('should calculate distance between two points correctly', () => {
    // Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522)
    // is approximately 343.5 km.
    const dist = haversine(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist / 1000).toBeCloseTo(343.5, 0);
  });

  it('should return 0 for the same point', () => {
    const dist = haversine(51.5074, -0.1278, 51.5074, -0.1278);
    expect(dist).toBe(0);
  });
});
