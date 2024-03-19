import { parseLat, parseLon } from './parseLatLon';
import {
  Waypoint,
  WpFormData,
  parseAndCheckWaypointData,
  WAYPOINTS_BYTE_SIZE
} from './waypoint';

export class NavInfoDraft {
  waypoints: Waypoint[];
  dirty = false;
  constructor(
    waypoints: Waypoint[],
    private maxWaypoints: number,
    private updateCallback?: (() => void) | undefined
  ) {
    this.waypoints = waypoints.slice();
  }

  private maybeUpdateCallback() {
    this.dirty = true;
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  deleteWaypoint(wpToDelete: Waypoint): void {
    const index = this.waypoints.findIndex(
      (wp) => wp.wp.address == wpToDelete.wp.address
    );
    this.waypoints.splice(index, 1);
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
    this.maybeUpdateCallback();
  }

  addWaypoint(wpFormData: WpFormData): void {
    if (this.waypoints.length >= this.maxWaypoints) {
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
    this.maybeUpdateCallback();
  }

  getBinaryData(wpBaseAddress: number): Uint8Array {
    // Sort waypoints alphabetically
    this.waypoints.sort((wpA, wpB) => wpA.wp.name.localeCompare(wpB.wp.name));
    // Reassign addresses from the top
    let address = wpBaseAddress;
    for (let wp of this.waypoints) {
      wp.wp.address = address;
      address += WAYPOINTS_BYTE_SIZE;
    }
    // Prepare all waypoint data
    const wpData = new Uint8Array(WAYPOINTS_BYTE_SIZE * this.maxWaypoints);
    wpData.fill(255);
    for (const wp of this.waypoints) {
      wp.fillConfig(wpData, wpBaseAddress);
    }
    return wpData;
  }
}
