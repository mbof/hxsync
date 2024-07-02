import { hexarr, unhex } from './message';
import { Mmsi, MmsiDirectory } from './mmsi';

const mmsi1 = new Mmsi('Alpha', '123456789');
const mmsi2 = new Mmsi('Bravo', '987654321');
const mmsi3 = new Mmsi('Charlie', '888888888');
const mmsi4 = new Mmsi('D23456789012345', '999999999');

const nameData =
  '416C706861FFFFFFFFFFFFFFFFFFFFFF' +
  '427261766FFFFFFFFFFFFFFFFFFFFFFF' +
  '436861726C6965FFFFFFFFFFFFFFFFFF' +
  '443233343536373839303132333435FF';

const numberData = '123456789098765432108888888880FF9999999990';

describe('Mmsi', () => {
  it('should create an instance', () => {
    expect(new Mmsi('Alpha', '123456789')).toBeTruthy();
  });
  it('should encode a number', () => {
    const nameBytes = new Uint8Array(16);
    const numberBytes = new Uint8Array(5);
    mmsi1.fillConfig(nameBytes, numberBytes, 0);
    expect(hexarr(nameBytes)).toEqual('416C706861FFFFFFFFFFFFFFFFFFFFFF');
    expect(hexarr(numberBytes)).toEqual('1234567890');
  });
  it('should encode a number at the correct offset', () => {
    const nameBytes = new Uint8Array(64);
    const numberBytes = new Uint8Array(21);
    mmsi1.fillConfig(nameBytes, numberBytes, 0);
    mmsi2.fillConfig(nameBytes, numberBytes, 1);
    mmsi3.fillConfig(nameBytes, numberBytes, 2);
    mmsi4.fillConfig(nameBytes, numberBytes, 3);
    expect(hexarr(nameBytes)).toEqual(nameData);
    expect(hexarr(numberBytes)).toEqual(numberData);
  });
  it('should reject a name that is too long', () => {
    const badName = 'AlphaBetaCharlieD';
    expect(() => {
      const mmsi = new Mmsi(badName, mmsi1.number);
    }).toThrow();
  });
  it('should reject a number that is too long', () => {
    const badNumber = '1234567899';
    expect(() => {
      const mmsi = new Mmsi(mmsi1.name, badNumber);
    }).toThrow();
  });
  it('should reject a number that is too short', () => {
    const badNumber = '1234567';
    expect(() => {
      const mmsi = new Mmsi(mmsi1.name, badNumber);
    }).toThrow();
  });
});

const csvData =
  'name,mmsi\n' +
  'Alpha,123456789\n' +
  'Bravo,987654321\n' +
  'Charlie,888888888\n' +
  'D23456789012345,999999999\n' +
  'Alpha,G023456789\n' +
  'Bravo,G087654321\n' +
  'Charlie,G088888888\n' +
  'D23456789012345,G099999999\n';

describe('MmsiDirectory', () => {
  it('should decode a few MMSI', () => {
    const mmsiDirectory = new MmsiDirectory(4, 4);
    const nameBytes = unhex(nameData);
    const numberBytes = unhex(numberData);
    mmsiDirectory.initFromConfig(
      nameBytes,
      numberBytes,
      nameBytes,
      numberBytes
    );
    expect(mmsiDirectory.individualMmsis.map((mmsi) => mmsi.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
      'D23456789012345'
    ]);
    expect(mmsiDirectory.individualMmsis.map((mmsi) => mmsi.number)).toEqual([
      '123456789',
      '987654321',
      '888888888',
      '999999999'
    ]);
    expect(mmsiDirectory.groupMmsis.map((mmsi) => mmsi.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
      'D23456789012345'
    ]);
    expect(mmsiDirectory.groupMmsis.map((mmsi) => mmsi.number)).toEqual([
      '123456789',
      '987654321',
      '888888888',
      '999999999'
    ]);
  });
  it('should export to CSV', () => {
    const mmsiDirectory = new MmsiDirectory(4, 4);
    const nameBytes = unhex(nameData);
    const numberBytes = unhex(numberData);
    mmsiDirectory.initFromConfig(
      nameBytes,
      numberBytes,
      nameBytes,
      numberBytes
    );
    mmsiDirectory.groupMmsis.forEach(
      (mmsi) => (mmsi.number = '0' + mmsi.number.slice(1))
    );
    expect(mmsiDirectory.toCsv()).toBe(csvData);
  });
  it('should import from CSV', () => {
    const mmsiDirectory = new MmsiDirectory(4, 4);
    mmsiDirectory.initFromCsv(csvData);
    expect(mmsiDirectory.individualMmsis.map((mmsi) => mmsi.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
      'D23456789012345'
    ]);
    expect(mmsiDirectory.individualMmsis.map((mmsi) => mmsi.number)).toEqual([
      '123456789',
      '987654321',
      '888888888',
      '999999999'
    ]);
    expect(mmsiDirectory.groupMmsis.map((mmsi) => mmsi.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
      'D23456789012345'
    ]);
    expect(mmsiDirectory.groupMmsis.map((mmsi) => mmsi.number)).toEqual([
      '023456789',
      '087654321',
      '088888888',
      '099999999'
    ]);
  });
  it('should write configuration data', () => {
    const mmsiDirectory = new MmsiDirectory(4, 4);
    mmsiDirectory.individualMmsis = [mmsi1, mmsi2, mmsi3, mmsi4];
    mmsiDirectory.groupMmsis = [mmsi1, mmsi2, mmsi3, mmsi4];
    const individualMmsiNameBytes = new Uint8Array(64);
    const individualMmsiNumberBytes = new Uint8Array(21);
    const groupMmsiNameBytes = new Uint8Array(64);
    const groupMmsiNumberBytes = new Uint8Array(21);
    mmsiDirectory.fillConfig(
      individualMmsiNameBytes,
      individualMmsiNumberBytes,
      groupMmsiNameBytes,
      groupMmsiNumberBytes
    );
    expect(individualMmsiNameBytes).toEqual(unhex(nameData));
    expect(individualMmsiNumberBytes).toEqual(unhex(numberData));
    expect(groupMmsiNameBytes).toEqual(unhex(nameData));
    expect(groupMmsiNumberBytes).toEqual(unhex(numberData));
  });
  it('should reject writing config data with duplicates', () => {
    const mmsiDirectory = new MmsiDirectory(4, 4);
    mmsiDirectory.individualMmsis = [mmsi1, mmsi2, mmsi2, mmsi4];
    mmsiDirectory.groupMmsis = [mmsi1, mmsi2, mmsi3, mmsi4];
    const individualMmsiNameBytes = new Uint8Array(64);
    const individualMmsiNumberBytes = new Uint8Array(21);
    const groupMmsiNameBytes = new Uint8Array(64);
    const groupMmsiNumberBytes = new Uint8Array(21);
    expect(() => 
      mmsiDirectory.fillConfig(
        individualMmsiNameBytes,
        individualMmsiNumberBytes,
        groupMmsiNameBytes,
        groupMmsiNumberBytes
      )).toThrowError('Duplicate MMSI 987654321');
    mmsiDirectory.individualMmsis = [mmsi1, mmsi2, mmsi3, mmsi4];
    mmsiDirectory.groupMmsis = [mmsi1, mmsi3, mmsi3, mmsi4];
    expect(() => 
      mmsiDirectory.fillConfig(
        individualMmsiNameBytes,
        individualMmsiNumberBytes,
        groupMmsiNameBytes,
        groupMmsiNumberBytes
      )).toThrowError('Duplicate MMSI 888888888');
  });
});
