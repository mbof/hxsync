import { Message } from './message';

const encoder = new TextEncoder();

describe('Message', () => {
  it('should create an instance from type', () => {
    expect(new Message({ type: '#CMDOK' })).toBeTruthy();
  });
  it('should parse a CP message with no arguments', () => {
    let m = new Message({ bytes: encoder.encode('#CMDOK\r\n') });
    expect(m.type).toBe('#CMDOK');
  });
  it('should parse a CP message with a checksum', () => {
    let m = new Message({ bytes: encoder.encode('#ABC\t1234\r\n') });
    expect(m.type).toBe('#ABC');
    expect(m.checksum).toBe('1234');
  });
  it('should parse a CP message with a checksum and arguments', () => {
    let m = new Message({ bytes: encoder.encode(
      '#CEPDT\t0100\t0A\t414D3035374E32FFFFFF\t11\r\n') });
    expect(m.type).toBe('#CEPDT');
    expect(m.checksum).toBe('11');
    expect(m.args).toEqual(['0100', '0A', '414D3035374E32FFFFFF'])
  });
  it('should parse a NMEA message', () => {
    let m = new Message({ bytes: encoder.encode('$PMTK001,622,3*36\r\n') });
    expect(m.type).toBe('$PMTK');
    expect(m.checksum).toBe('36');
    expect(m.args).toEqual(['001', '622', '3'])
  });
});
