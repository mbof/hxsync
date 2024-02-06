import { Message } from './message';

const encoder = new TextEncoder();

describe('Message', () => {
  // Message parsing tests
  it('should parse a CP message with no arguments', () => {
    let m = new Message({ bytes: encoder.encode('#CMDOK\r\n') });
    expect(m.type).toBe('#CMDOK');
    expect(m.validate()).toBeTrue();
  });
  it('should parse a CP message with a checksum', () => {
    let m = new Message({ bytes: encoder.encode('#CVRRQ\t6E\r\n') });
    expect(m.type).toBe('#CVRRQ');
    expect(m.checksum_recv).toBe('6E');
    expect(m.validate()).toBeTrue();
  });
  it('should parse a CP message with a checksum and arguments', () => {
    let m = new Message({ bytes: encoder.encode(
      '#CEPDT\t0100\t0A\t414D3035374E32FFFFFF\t11\r\n') });
    expect(m.type).toBe('#CEPDT');
    expect(m.checksum_recv).toBe('11');
    expect(m.args).toEqual(['0100', '0A', '414D3035374E32FFFFFF'])
    expect(m.validate()).toBeTrue();
  });
  it('should parse a NMEA message', () => {
    let m = new Message({ bytes: encoder.encode('$PMTK001,622,3*36\r\n') });
    expect(m.type).toBe('$PMTK');
    expect(m.checksum_recv).toBe('36');
    expect(m.args).toEqual(['001', '622', '3'])
    expect(m.validate()).toBeTrue();
  });

  // Message checksum validation tests
  it('should detect a CP message with a wrong checksum', () => {
    let m = new Message({ bytes: encoder.encode('#CVRRQ\tFF\r\n') });
    expect(m.validate()).toBeFalse();
  });
  it('should detect a CP message with a wrong checksum', () => {
    let m = new Message({ bytes: encoder.encode(
      '#CEPDT\t0100\t0A\t414D3035374E32FFFFFF\tAA\r\n') });
    expect(m.validate()).toBeFalse();
  });
  it('should detect a NMEA message with a wrong checksum', () => {
    let m = new Message({ bytes: encoder.encode('$PMTK001,622,3*72\r\n') });
    expect(m.validate()).toBeFalse();
  });

  // Message encoding tests
  it('should properly encode a unary message without checksum', () => {
    let m = new Message({type: '#CMDOK'});
    expect(m.toString()).toBe('#CMDOK\r\n');
  });
  it('should properly encode a unary message with checksum', () => {
    let m = new Message({type: '#CVRRQ'});
    expect(m.toString()).toBe('#CVRRQ\t6E\r\n');
  });
  it('should properly encode a command message with arguments', () => {
    let m = new Message({type: '#CEPDT', args: ['0100', '0A', '414D3035374E32FFFFFF']});
    expect(m.toString()).toBe('#CEPDT\t0100\t0A\t414D3035374E32FFFFFF\t11\r\n');
  });
  it('should properly encode a NMEA message with 1 argument', () => {
    let m = new Message({type: '$PMTK', args: ['183']});
    expect(m.toString()).toBe('$PMTK183*38\r\n');
  });
  it('should properly encode a NMEA message with 3 arguments', () => {
    let m = new Message({type: '$PMTK', args: ['001', '183', '3']});
    expect(m.toString()).toBe('$PMTK001,183,3*3A\r\n');
  });
});
