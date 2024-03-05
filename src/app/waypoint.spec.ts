import { hexarr, unhex } from './message';
import {
  DraftWaypoints,
  Waypoint,
  WaypointData,
  parseAndCheckWaypointData,
  parseLat,
  parseLon,
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
  // Four padding bytes
  0xff, 0xff, 0xff, 0xff,
  // Latitude
  0xf0, 0x45, 0x06, 0x78, 0x90, 'N'.charCodeAt(0),
  // Longitude
  0x01, 0x23, 0x03, 0x56, 0x70, 'W'.charCodeAt(0),
  // Name
  0x54, 0x65, 0x73, 0x74, 0x20, 0x77, 0x70, 0x20,
  0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00,
  // ID
  0x0B
]);

const testEncodedWaypoint2 = unhex(
  'FFFFFFFFF0332072004E0118194170574176616C6F6E2020202020202020000A'
);

describe('Waypoint', () => {
  it('should pack a waypoint', () => {
    const wp = new Waypoint(testWpData);
    const dest = new Uint8Array(32);
    dest.fill(0xaa, 0, 32);
    wp.fillConfig(dest, 0x1234);
    expect(dest).toEqual(testEncodedWaypoint);
  });
  it('should return readable lat / lon', () => {
    const wp = new Waypoint(testWpData);
    expect(wp.getLat()).toEqual('45° 06.7890’ N');
    expect(wp.getLon()).toEqual('123° 03.5670’ W');
    expect(wp.getMapLink()).toEqual(
      'https://www.google.com/maps/place/45.11315,-123.05945'
    );
  });
});

describe('waypointFromConfig', () => {
  it('should decode a waypoint', () => {
    const wp = waypointFromConfig(testEncodedWaypoint, 0x1234);
    expect(wp).toBeTruthy();
    expect(wp!.wp).toEqual(testWpData);
  });
});

describe('parseLat', () => {
  it('should parse a latitude', () => {
    const lat = parseLat('45N06.7890');
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 67890
    });
  });
});

it('should parse a latitude (format 2)', () => {
  const lat = parseLat(`45° 06.789' N `);
  expect(lat).toEqual({
    lat_deg: 45,
    lat_dir: 'N',
    lat_min: 67890
  });
});

it('should parse a latitude (format 3)', () => {
  const lat = parseLat(`45° 16’ 33.33” N `);
  expect(lat).toEqual({
    lat_deg: 45,
    lat_dir: 'N',
    lat_min: 165555
  });
});

it('should parse a latitude (format 4)', () => {
  const lat = parseLat(`45.123456`);
  expect(lat).toEqual({
    lat_deg: 45,
    lat_dir: 'N',
    lat_min: 74074
  });
});

it('should parse a latitude (format 4, negative)', () => {
  const lat = parseLat(`-45.123456`);
  expect(lat).toEqual({
    lat_deg: 45,
    lat_dir: 'S',
    lat_min: 74074
  });
});

describe('parseLon', () => {
  it('should parse a longitude', () => {
    const lon = parseLon('123W03.5670');
    expect(lon).toEqual({
      lon_deg: 123,
      lon_dir: 'W',
      lon_min: 35670
    });
  });
});

describe('parseAndCheckWaypointData', () => {
  it('should accept valid data', () => {
    const result = parseAndCheckWaypointData({
      name: 'Test waypoint',
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
    ).toThrow();
  });
  it('should reject non-ASCII names', () => {
    expect(() =>
      parseAndCheckWaypointData({
        name: 'Test wäypoint',
        lat: '45N06.7890',
        lon: '123W03.5670'
      })
    ).toThrow();
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

function getSampleWaypointArray() {
  const wp = waypointFromConfig(testEncodedWaypoint, 0x1234)!;
  const wp2 = new Waypoint({ ...wp.wp, id: 0, address: 0x1254 });
  const wp3 = new Waypoint({ ...wp.wp, id: 1, address: 0x1274 });
  const wp4 = new Waypoint({ ...wp.wp, id: 2, address: 0x1294 });
  return [wp, wp2, wp3, wp4];
}

describe('DraftWaypoints', () => {
  it('should create a set of draft waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 100);
    expect(draft).toBeTruthy();
    expect(draft.waypoints).toEqual(wpArr);
    expect(draft.waypoints).not.toBe(wpArr);
    expect(draft.dirty).toBeFalse();
  });
  it('should delete waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 100);
    draft.deleteWaypoint(wpArr[2]);
    expect(draft.waypoints).toEqual([wpArr[0], wpArr[1], wpArr[3]]);
    expect(draft.dirty).toBeTrue();
  });
  it('should edit waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 100);
    draft.editWaypoint(wpArr[2], 'New name', '10S34.5678', '100E45.6789');
    expect(draft.waypoints[0]).toBe(wpArr[0]);
    expect(draft.waypoints[1]).toBe(wpArr[1]);
    expect(draft.waypoints[3]).toBe(wpArr[3]);
    expect(draft.waypoints[2].wp.name).toBe('New name');
    expect(draft.waypoints[2].wp.lat_deg).toBe(10);
    expect(draft.waypoints[2].wp.lat_dir).toBe('S');
    expect(draft.waypoints[2].wp.lat_min).toBe(345678);
    expect(draft.waypoints[2].wp.lon_deg).toBe(100);
    expect(draft.waypoints[2].wp.lon_dir).toBe('E');
    expect(draft.waypoints[2].wp.lon_min).toBe(456789);
    expect(draft.dirty).toBeTrue();
  });
  it('should add waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 100);
    expect(draft.waypoints.length == 4);
    draft.addWaypoint({
      name: 'Avalon',
      lat: '33N20.720',
      lon: '118W19.417'
    });
    const dest = new Uint8Array(32);
    expect(draft.waypoints.length == 5);
    const addedWp = draft.waypoints[4];
    expect(addedWp.wp.name).toBe('Avalon');
    expect(addedWp.wp.id).toBe(3);
    addedWp.wp.address = 0x1234;
    addedWp.wp.id = 10;
    addedWp.fillConfig(dest, 0x1234);
    expect(dest).toEqual(testEncodedWaypoint2);
    expect(addedWp.wp.lat_deg).toBe(33);
    expect(addedWp.wp.lat_dir).toBe('N');
    expect(addedWp.wp.lat_min).toBe(207200);
    expect(addedWp.wp.lon_deg).toBe(118);
    expect(addedWp.wp.lon_dir).toBe('W');
    expect(addedWp.wp.lon_min).toBe(194170);
    expect(draft.dirty).toBeTrue();
  });
  it('should reject waypoints when full', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 4);
    expect(() =>
      draft.addWaypoint({
        name: 'New waypoint',
        lat: '10S34.5678',
        lon: '100E45.6789'
      })
    ).toThrow();
    expect(draft.dirty).toBeFalse();
  });
  it('should encode waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new DraftWaypoints(wpArr, 6);
    draft.addWaypoint({
      name: 'New waypoint',
      lat: '10S34.5678',
      lon: '100E45.6789'
    });
    expect(hexarr(draft.getBinaryData(0x1234))).toBe(
      'FFFFFFFFF010345678530100456789454E657720776179706F696E7420200003' +
        'FFFFFFFFF0450678904E0123035670575465737420777020202020202020000B' +
        'FFFFFFFFF0450678904E01230356705754657374207770202020202020200000' +
        'FFFFFFFFF0450678904E01230356705754657374207770202020202020200001' +
        'FFFFFFFFF0450678904E01230356705754657374207770202020202020200002' +
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
    );
  });
});
