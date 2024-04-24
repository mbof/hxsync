import { hexarr, unhex } from './message';
import { NavInfoDraft } from './nav-info-draft';
import { Waypoint, waypointFromConfig } from './waypoint';
import { DeviceConfig } from './devicemgr.service';
import { Route, RouteData } from './route';

// prettier-ignore
const testEncodedWaypoint = new Uint8Array([
  // Four padding bytes
  0xff, 0xff, 0xff, 0xff,
  // Latitude
  0xf0, 0x45, 0x06, 0x78, 0x90, 'N'.charCodeAt(0),
  // Longitude
  0x01, 0x23, 0x03, 0x56, 0x70, 'W'.charCodeAt(0),
  // Name
  0x54, 0x65, 0x73, 0x74, 0x20, 0x77, 0x70, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  // ID
  0x0B
]);

const testEncodedWaypoint2 = unhex(
  'FFFFFFFFF0332072004E0118194170574176616C6F6EFFFFFFFFFFFFFFFFFF0A'
);

const testRouteData: RouteData = {
  name: 'Test route',
  waypointIds: Array.from({ length: 30 }, (_, i) => i + 1)
};

const testRouteData2: RouteData = {
  name: 'Test route 2',
  waypointIds: Array.from({ length: 10 }, (_, i) => i + 1)
};

function makeFakeDeviceConfig(waypointsNumber: number): DeviceConfig {
  return {
    name: 'foo',
    usbFilter: { usbProductId: 0, usbVendorId: 2 },
    waypointsStartAddress: 0x1234,
    waypointsNumber: waypointsNumber,
    routesStartAddress: 0x5678,
    routeBytes: 64,
    numWaypointsPerRoute: 32,
    routesNumber: 2
  };
}

function getSampleWaypointArray() {
  const wp = waypointFromConfig(testEncodedWaypoint, 0x1234)!;
  const wp2 = new Waypoint({ ...wp.wp, id: 0, address: 0x1254 });
  const wp3 = new Waypoint({ ...wp.wp, id: 1, address: 0x1274 });
  const wp4 = new Waypoint({ ...wp.wp, id: 2, address: 0x1294 });
  return [wp, wp2, wp3, wp4];
}
describe('NavInfoDraft', () => {
  it('should create a set of draft waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(100));
    expect(draft).toBeTruthy();
    expect(draft.waypoints).toEqual(wpArr);
    expect(draft.waypoints).not.toBe(wpArr);
    expect(draft.dirtyWaypoints).toBeFalse();
  });
  it('should delete waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(100));
    draft.deleteWaypoint(wpArr[2]);
    expect(draft.waypoints).toEqual([wpArr[0], wpArr[1], wpArr[3]]);
    expect(draft.dirtyWaypoints).toBeTrue();
  });
  it('should ripple waypoint deletions to routes', () => {
    const wpArr = getSampleWaypointArray();
    const route1 = new Route({
      name: 'Route 1',
      waypointIds: [0, 1, 2, 1, 2, 0]
    });
    const route2 = new Route({
      name: 'Route 2',
      waypointIds: [0, 1, 0, 1]
    });
    const draft = new NavInfoDraft(wpArr, [route1, route2], makeFakeDeviceConfig(100));
    draft.deleteWaypoint(wpArr[2]);
    expect(draft.routes[0].route.waypointIds).toEqual([0, 2, 2, 0]);
    expect(draft.routes.length).toEqual(2);
    draft.deleteWaypoint(wpArr[1]);
    expect(draft.routes[0].route.waypointIds).toEqual([2, 2]);
    expect(draft.routes.length).toEqual(1);
    expect(draft.dirtyWaypoints).toBeTrue();
  });
  it('should edit waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(100));
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
    expect(draft.dirtyWaypoints).toBeTrue();
  });
  it('should add waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(100));
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
    addedWp.wp.address = 4660;
    addedWp.wp.id = 10;
    addedWp.fillConfig(dest, 4660);
    expect(dest).toEqual(testEncodedWaypoint2);
    expect(addedWp.wp.lat_deg).toBe(33);
    expect(addedWp.wp.lat_dir).toBe('N');
    expect(addedWp.wp.lat_min).toBe(207200);
    expect(addedWp.wp.lon_deg).toBe(118);
    expect(addedWp.wp.lon_dir).toBe('W');
    expect(addedWp.wp.lon_min).toBe(194170);
    expect(draft.dirtyWaypoints).toBeTrue();
  });
  it('should reject waypoints when full', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(4));
    expect(() =>
      draft.addWaypoint({
        name: 'New waypoint',
        lat: '10S34.5678',
        lon: '100E45.6789'
      })
    ).toThrow();
    expect(draft.dirtyWaypoints).toBeFalse();
  });
  it('should encode waypoints', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(6));
    draft.addWaypoint({
      name: 'New waypoint',
      lat: '10S34.5678',
      lon: '100E45.6789'
    });
    expect(hexarr(draft.getBinaryWaypointData(4660))).toBe(
      'FFFFFFFFF010345678530100456789454E657720776179706F696E74FFFFFF03' +
        'FFFFFFFFF0450678904E01230356705754657374207770FFFFFFFFFFFFFFFF0B' +
        'FFFFFFFFF0450678904E01230356705754657374207770FFFFFFFFFFFFFFFF00' +
        'FFFFFFFFF0450678904E01230356705754657374207770FFFFFFFFFFFFFFFF01' +
        'FFFFFFFFF0450678904E01230356705754657374207770FFFFFFFFFFFFFFFF02' +
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
    );
  });
  it('should support route editing', () => {
    const wpArr = getSampleWaypointArray();
    const draft = new NavInfoDraft(wpArr, [], makeFakeDeviceConfig(6));
    const routeId = draft.addRoute('Route 1');
    draft.insertWaypointInRoute(routeId, 1, 0);
    draft.insertWaypointInRoute(routeId, 2, 1);
    draft.insertWaypointInRoute(routeId, 3, 1);
    const route = draft.routes[0];
    expect(route.route.name).toBe('Route 1');
    expect(route.route.waypointIds).toEqual([1, 3, 2]);
    draft.swapWaypointsInRoute(0, 0, 2);
    expect(route.route.waypointIds).toEqual([2, 3, 1]);
    draft.swapWaypointsInRoute(0, 1, 0);
    expect(route.route.waypointIds).toEqual([3, 2, 1]);
    draft.deleteWaypointFromRoute(routeId, 0);
    expect(route.route.waypointIds).toEqual([2, 1]);
    const routeId2 = draft.addRoute('Route 2');
    expect(() => draft.addRoute('Route 3')).toThrow(
      new Error('No room for more routes (2)')
    );
    draft.deleteRoute(routeId);
    expect(draft.routes[0].route.name).toBe('Route 2');
  });
  it('should encode routes', () => {
    const wpArr = getSampleWaypointArray();
    const route1 = new Route(testRouteData);
    const route2 = new Route(testRouteData2);
    const draft = new NavInfoDraft(
      wpArr,
      [route1, route2],
      makeFakeDeviceConfig(6)
    );
    const encodedRouteData = draft.getBinaryRouteData();
    expect(hexarr(encodedRouteData)).toBe(
      '5465737420726F757465FFFFFFFFFFFF' +
        '0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1EFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' +
        '5465737420726F7574652032FFFFFFFF' +
        '0102030405060708090AFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
    );
  });
});
