import { unhex } from './message';
import {
  Waypoint,
  WaypointData,
  parseAndCheckWaypointData,
  waypointFromConfig
} from './waypoint';

const testWpData: WaypointData = {
  id: 11,
  name: 'Test wp',
  lat_deg: 45,
  lat_min: 67890,
  lat_dir: 'N',
  lon_deg: 123,
  lon_min: 35670,
  lon_dir: 'W',
  address: 0x1234
};
// prettier-ignore
const testEncodedWaypoint = new Uint8Array([
  // Origin DSC - all F's when none, plus a 0 nibble
  0xff, 0xff, 0xff, 0xff, 0xf0,
  // Latitude
  0x45, 0x06, 0x78, 0x90, 'N'.charCodeAt(0),
  // Longitude
  0x01, 0x23, 0x03, 0x56, 0x70, 'W'.charCodeAt(0),
  // Name
  0x54, 0x65, 0x73, 0x74, 0x20, 0x77, 0x70, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  // ID
  0x0B
]);

const testWpData2: WaypointData = {
  id: 10,
  name: 'Avalonnnnnnnnn!',
  lat_deg: 33,
  lat_min: 207200,
  lat_dir: 'N',
  lon_deg: 118,
  lon_min: 194170,
  lon_dir: 'W',
  address: 0x1234
};

const testEncodedWaypoint2 = unhex(
  'FFFFFFFFF0332072004E0118194170574176616C6F6E6E6E6E6E6E6E6E6E210A'
);

const testEncodedWaypoint3 = unhex(
  'FFFFFFFFFF110600004E001000600045303031575054FFFFFFFFFFFFFFFFFF01'
);

const testEncodedWaypoint4 = unhex(
  '9876543210110600004E001000600045303031575054FFFFFFFFFFFFFFFFFF01'
);

describe('Waypoint', () => {
  it('should pack a waypoint', () => {
    const wp = new Waypoint(testWpData);
    const dest = new Uint8Array(32);
    dest.fill(0xaa, 0, 32);
    wp.fillConfig(dest, 0x1234);
    expect(dest).toEqual(testEncodedWaypoint);
  });
  it('should pack a waypoint with a long name', () => {
    const wp = new Waypoint(testWpData2);
    const dest = new Uint8Array(32);
    dest.fill(0xaa, 0, 32);
    wp.fillConfig(dest, 0x1234);
    expect(dest).toEqual(testEncodedWaypoint2);
  });
  it('should return readable lat / lon', () => {
    const wp = new Waypoint(testWpData);
    expect(wp.getLat()).toEqual('45° 06.7890’ N');
    expect(wp.getLon()).toEqual('123° 03.5670’ W');
    expect(wp.getMapLink()).toEqual(
      'https://www.google.com/maps/place/45.11315,-123.05945'
    );
  });
  it('should keep the origin DSC when round-tripping data', () => {
    const wp = waypointFromConfig(testEncodedWaypoint4, 0x1234);
    const dest = new Uint8Array(32);
    dest.fill(0xaa, 0, 32);
    wp!.fillConfig(dest, 0x1234);
    expect(dest).toEqual(testEncodedWaypoint4);
  });
});

describe('waypointFromConfig', () => {
  it('should decode a waypoint', () => {
    const wp = waypointFromConfig(testEncodedWaypoint, 0x1234);
    expect(wp).toBeTruthy();
    expect(wp!.wp.dsc_origin).toEqual(
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xf0])
    );
    delete wp!.wp.dsc_origin;
    expect(wp!.wp).toEqual(testWpData);
  });
  it('should decode an 0xF-padded waypoint', () => {
    const wp = waypointFromConfig(testEncodedWaypoint3, 0x1234);
    expect(wp).toBeTruthy();
    // 11° 06.0000’ N 10° 00.6000’ E
    expect(wp!.wp.lat_deg).toBe(11);
    expect(wp!.wp.lat_dir).toBe('N');
    expect(wp!.wp.lat_min).toBe(60000);
    expect(wp!.wp.lon_deg).toBe(10);
    expect(wp!.wp.lon_dir).toBe('E');
    expect(wp!.wp.lon_min).toBe(6000);
  });
});

describe('parseAndCheckWaypointData', () => {
  it('should accept valid data', () => {
    const result = parseAndCheckWaypointData({
      name: 'Test wp!-[]#<>',
      lat: '45N06.7890',
      lon: '123W03.5670'
    });
    expect(result.lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 67890
    });
    expect(result.lon).toEqual({
      lon_deg: 123,
      lon_dir: 'W',
      lon_min: 35670
    });
  });
  it('should reject long names', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test waypoint but too long',
        lat: '45N06.7890',
        lon: '123W03.5670'
      })
    ).toThrow(
      new Error(
        'Waypoint name too long "Test waypoint but too long". Consider "Test waypoint".'
      )
    );
  });
  it('should reject non-ASCII names', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test wäypoint',
        lat: '45N06.7890',
        lon: '123W03.5670'
      })
    ).toThrow(new Error('Waypoint name cannot contain ä'));
  });
  it('should reject unsupported characters', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test {($~)}',
        lat: '45N06.7890',
        lon: '123W03.5670'
      })
    ).toThrow(new Error('Waypoint name cannot contain {($~)}'));
  });
  it('should reject non-parseable lat / lon', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test waypoint',
        lat: '45Z06.7890',
        lon: '123W03.5670'
      })
    ).toThrow();
  });
  it('should reject bad latitude', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test waypoint',
        lat: '453N06.7890',
        lon: '123W03.5670'
      })
    ).toThrow(new Error('Bad latitude 453N06.7890'));
  });
  it('should reject bad longitude', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test waypoint',
        lat: '45N06.7890',
        lon: '183W03.5670'
      })
    ).toThrow(new Error('Bad longitude 183W03.5670'));
  });
});
