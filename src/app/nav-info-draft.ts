import { DeviceConfig } from './devicemgr.service';
import { parseLat, parseLon } from './parseLatLon';
import { Route } from './route';
import {
  Waypoint,
  WpFormData,
  parseAndCheckWaypointData,
  WAYPOINTS_BYTE_SIZE
} from './waypoint';

export class NavInfoDraft {
  waypoints: Waypoint[];
  routes: Route[];
  dirtyWaypoints = false;
  dirtyRoutes = false;
  constructor(
    waypoints: Waypoint[],
    routes: Route[],
    private deviceConfig: DeviceConfig,
    private updateCallback?: (() => void) | undefined
  ) {
    this.waypoints = waypoints.slice();
    this.routes = Array.from(
      { length: routes.length },
      (_, i) => new Route(routes[i].route)
    );
  }

  private maybeUpdateCallback() {
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  deleteWaypoint(wpToDelete: Waypoint): void {
    const index = this.waypoints.findIndex(
      (wp) => wp.wp.address == wpToDelete.wp.address
    );
    this.waypoints.splice(index, 1);
    this.dirtyWaypoints = true;
    this.maybeUpdateCallback();
  }

  editWaypoint(
    wpToChange: Waypoint,
    name: string,
    lat_str: string,
    lon_str: string
  ): void {
    if (name.length > 15) {
      throw new Error(`Waypoint name too long ${name}`);
    }
    const lat = parseLat(lat_str);
    const lon = parseLon(lon_str);
    if (!lat || !lon) {
      throw new Error(`Unparseable position ${lat_str} ${lon_str}`);
    }
    const index = this.waypoints.findIndex(
      (wp) => wp.wp.address == wpToChange.wp.address
    );
    if (index == -1) {
      throw new Error(`Could not find waypoint at ${wpToChange.wp.address}`);
    }
    this.waypoints[index] = new Waypoint({
      ...this.waypoints[index].wp,
      ...lat,
      ...lon,
      name: name
    });
    this.dirtyWaypoints = true;
    this.maybeUpdateCallback();
  }

  addWaypoint(wpFormData: WpFormData): void {
    if (this.waypoints.length >= this.deviceConfig.waypointsNumber) {
      throw new Error('No more room for waypoints');
    }
    const { lat, lon } = parseAndCheckWaypointData(wpFormData);
    let nextId: number;
    // Find the first available ID
    for (nextId = 1; nextId < 255; nextId += 1) {
      if (!this.waypoints.find((wp) => wp.wp.id == nextId)) {
        break;
      }
    }
    this.waypoints.push(
      new Waypoint({
        ...lat,
        ...lon,
        name: wpFormData.name,
        id: nextId
      })
    );
    this.dirtyWaypoints = true;
    this.maybeUpdateCallback();
  }

  deleteRoute(routeToDelete: number): void {
    this.routes.splice(routeToDelete, 1);
    this.dirtyRoutes = true;
    this.maybeUpdateCallback();
  }

  addRoute(name: string): number {
    if (this.routes.length >= this.deviceConfig.routesNumber) {
      throw new Error(`No room for more routes (${this.routes.length})`);
    }
    this.routes.push(new Route({ name: name, waypointIds: [] }));
    this.dirtyRoutes = true;
    this.maybeUpdateCallback();
    return this.routes.length - 1;
  }

  insertWaypointInRoute(
    routeIndex: number,
    waypointId: number,
    waypointIndex: number
  ): void {
    const route = this.routes[routeIndex].route;
    if (route.waypointIds.length >= this.deviceConfig.numWaypointsPerRoute) {
      throw new Error(
        `No room for more waypoints (${route.waypointIds.length})`
      );
    }
    route.waypointIds.splice(waypointIndex, 0, waypointId);
    this.dirtyRoutes = true;
    this.maybeUpdateCallback();
  }

  deleteWaypointFromRoute(routeIndex: number, waypointIndex: number): void {
    this.routes[routeIndex].route.waypointIds.splice(waypointIndex, 1);
    this.dirtyRoutes = true;
    this.maybeUpdateCallback();
  }

  swapWaypointsInRoute(
    routeIndex: number,
    waypointIndexA: number,
    waypointIndexB: number
  ): void {
    if (waypointIndexA == waypointIndexB) {
      return;
    }
    const route = this.routes[routeIndex].route;
    const waypointIdA = route.waypointIds[waypointIndexA];
    const waypointIdB = route.waypointIds[waypointIndexB];
    if (waypointIndexA < waypointIndexB) {
      route.waypointIds.splice(waypointIndexB, 1, waypointIdA);
      route.waypointIds.splice(waypointIndexA, 1, waypointIdB);
    } else {
      route.waypointIds.splice(waypointIndexA, 1, waypointIdB);
      route.waypointIds.splice(waypointIndexB, 1, waypointIdA);
    }
    this.dirtyRoutes = true;
    this.maybeUpdateCallback();
  }

  getBinaryWaypointData(wpBaseAddress: number): Uint8Array {
    // Sort waypoints alphabetically
    this.waypoints.sort((wpA, wpB) => wpA.wp.name.localeCompare(wpB.wp.name));
    // Reassign addresses from the top
    let address = wpBaseAddress;
    for (let wp of this.waypoints) {
      wp.wp.address = address;
      address += WAYPOINTS_BYTE_SIZE;
    }
    // Prepare all waypoint data
    const wpData = new Uint8Array(
      WAYPOINTS_BYTE_SIZE * this.deviceConfig.waypointsNumber
    );
    wpData.fill(255);
    for (const wp of this.waypoints) {
      wp.fillConfig(wpData, wpBaseAddress);
    }
    return wpData;
  }

  getBinaryRouteData(): Uint8Array {
    // Sort routes alphabetically
    this.routes.sort((routeA, routeB) =>
      routeA.route.name.localeCompare(routeB.route.name)
    );
    // Prepare all route data
    const routeData = new Uint8Array(
      this.deviceConfig.routeBytes * this.deviceConfig.routesNumber
    );
    routeData.fill(255);
    for (const [index, route] of this.routes.entries()) {
      route.fillConfig(
        routeData,
        index * this.deviceConfig.routeBytes,
        this.deviceConfig.numWaypointsPerRoute,
        this.deviceConfig.routeBytes
      );
    }
    return routeData;
  }
}
