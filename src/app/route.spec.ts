import { Route, RouteData, routeFromConfig } from './route';

const testRouteData: RouteData = {
  name: 'Test route',
  waypointIds: Array.from({ length: 30 }, (_, i) => i + 1)
};

// prettier-ignore
const testEncodedRouteData = new Uint8Array([
  // Padding to test offset
  0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,
  // Name
  0x54, 0x65, 0x73, 0x74, 0x20, 0x72, 0x6f, 0x75, 0x74, 0x65,
  // Padding after name
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
  // Waypoint IDs
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 0xFF,
  // Constant padding
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
  // Padding to test offset
  0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA
]);

const testShortRouteData: RouteData = {
  name: 'Test route 1234',
  waypointIds: Array.from({ length: 16 }, (_, i) => i + 1)
};

// prettier-ignore
const testEncodedShortRouteData = new Uint8Array([
  // Padding to test offset
  0xAA, 0xAA,
  // Name
  0x54, 0x65, 0x73, 0x74, 0x20, 0x72, 0x6f, 0x75, 0x74, 0x65, 0x20, 0x31,
  0x32, 0x33, 0x34,
  // Padding after name
  0xFF,
  // Waypoint IDs
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  // Padding to test offset
  0xAA, 0xAA
]);

describe('Route', () => {
  it('should pack a 64-byte route', () => {
    const route = new Route(testRouteData);
    const dest = new Uint8Array(80);
    dest.fill(0xaa);
    route.fillConfig(dest, 8, 31, 64);
    expect(dest).toEqual(new Uint8Array(testEncodedRouteData));
  });
  it('should pack a 32-byte route', () => {
    const route = new Route(testShortRouteData);
    const dest = new Uint8Array(36);
    dest.fill(0xaa);
    route.fillConfig(dest, 2, 16, 32);
    expect(dest).toEqual(new Uint8Array(testEncodedShortRouteData));
  });
});

describe('routeFromConfig', () => {
  it('should read a 64-byte route', () => {
    const route = routeFromConfig(testEncodedRouteData.subarray(8, 8 + 64), 31);
    expect(route!).toEqual(new Route(testRouteData));
  });
  it('should read a 32-byte route', () => {
    const route = routeFromConfig(
      testEncodedShortRouteData.subarray(2, 2 + 32),
      16
    );
    expect(route!).toEqual(new Route(testShortRouteData));
  });
});
