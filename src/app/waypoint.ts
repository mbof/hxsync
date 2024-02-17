import { hex, hexarr, unhex, unhexInto } from './message';

export type WaypointData = {
  id: number;
  name: string;
  lat_deg: number;
  lat_dir: string;
  lat_min: number;
  lon_deg: number;
  lon_dir: string;
  lon_min: number;
  address?: number;
};

export function parseLat(
  lat: string
): { lat_deg: number; lat_dir: string; lat_min: number } | undefined {
  const parsed_lat = lat.toUpperCase().match(/(\d+)(N|S)(\d+)\.(\d+)/);
  if (!parsed_lat) {
    return undefined;
  }
  const [_unused, lat_deg_str, lat_dir, lat_min_str, lat_min_tenthousandths] =
    parsed_lat;
  const lat_deg = Number.parseInt(lat_deg_str, 10);
  const lat_min =
    Number.parseInt(lat_min_str, 10) * 10000 +
    Number.parseInt(lat_min_tenthousandths);
  return { lat_deg: lat_deg, lat_dir: lat_dir, lat_min: lat_min };
}

export function parseLon(
  lon: string
): { lon_deg: number; lon_dir: string; lon_min: number } | undefined {
  const parsed_lon = lon.toUpperCase().match(/(\d+)(E|W)(\d+)\.(\d+)/);
  if (!parsed_lon) {
    return undefined;
  }
  const [_unused, lon_deg_str, lon_dir, lon_min_str, lon_min_tenthousandths] =
    parsed_lon;
  const lon_deg = Number.parseInt(lon_deg_str, 10);
  const lon_min =
    Number.parseInt(lon_min_str, 10) * 10000 +
    Number.parseInt(lon_min_tenthousandths);
  return { lon_deg: lon_deg, lon_dir: lon_dir, lon_min: lon_min };
}

export class Waypoint {
  constructor(public wp: WaypointData) {}
  toString(): string {
    let wpStr = `${this.wp.id}, ${this.wp.name}, ${this.wp.lat_deg}${this.wp.lat_dir}${this.wp.lat_min}, ${this.wp.lon_deg}${this.wp.lon_dir}${this.wp.lon_min}`;
    if (this.wp.address) {
      return `@0x${hex(this.wp.address, 4)}: ` + wpStr;
    } else {
      return wpStr;
    }
  }
  getLat() {
    const lat_min_int = Math.floor(this.wp.lat_min / 10000)
      .toString(10)
      .padStart(2, '0');
    const lat_min_flt = (this.wp.lat_min % 10000).toString(10).padStart(4, '0');
    return `${this.wp.lat_deg}${this.wp.lat_dir}${lat_min_int}.${lat_min_flt}`;
  }
  getLon() {
    const lon_min_int = Math.floor(this.wp.lon_min / 10000)
      .toString(10)
      .padStart(2, '0');
    const lon_min_flt = (this.wp.lon_min % 10000).toString(10).padStart(4, '0');
    return `${this.wp.lon_deg}${this.wp.lon_dir}${lon_min_int}.${lon_min_flt}`;
  }
  getMapLink() {
    const lat_flt =
      (this.wp.lat_dir == 'N' ? 1 : -1) *
      (this.wp.lat_deg + this.wp.lat_min / 10000 / 60);
    const lon_flt =
      (this.wp.lon_dir == 'E' ? 1 : -1) *
      (this.wp.lon_deg + this.wp.lon_min / 10000 / 60);
    return `https://www.google.com/maps/place/${lat_flt},${lon_flt}`;
  }
  fillConfig(dest: Uint8Array, destAddressBase: number): void {
    if (!this.wp.address) {
      throw new Error('The waypoint must have an address');
    }
    const destOffset = this.wp.address - destAddressBase;
    if (destOffset < 0 || destOffset > dest.length - 32) {
      throw new Error(
        `Waypoint address ${this.wp.address} (offset ${destOffset}) is out of bounds`
      );
    }
    let name = this.wp.name;
    if (name.length >= 15) {
      console.log(`Waypoint name too long ${name}, truncating`);
      name = name.substring(0, 14);
    }
    name = name.padEnd(14, ' ');
    const destWaypoint = dest.subarray(destOffset, destOffset + 32);
    destWaypoint[31] = this.wp.id;
    const destName = destWaypoint.subarray(16, 31);
    const { written: nameByteLength } = encoder.encodeInto(name, destName);
    destName.fill(0, nameByteLength, 15);
    destWaypoint.fill(255, 0, 4);
    const destLat = destWaypoint.subarray(4, 9);
    let lat_hex = 'F';
    lat_hex += this.wp.lat_deg.toString(10).padStart(3, '0');
    lat_hex += this.wp.lat_min.toString(10).padStart(6, '0');
    if (lat_hex.length != 10) {
      throw new Error(`Encoded waypoint lat too long ${lat_hex}`);
    }
    unhexInto(lat_hex, destLat);
    destWaypoint[9] = this.wp.lat_dir.charCodeAt(0);
    const destLon = destWaypoint.subarray(10, 15);
    let lon_hex = this.wp.lon_deg.toString(10).padStart(4, '0');
    lon_hex += this.wp.lon_min.toString(10).padStart(6, '0');
    if (lat_hex.length != 10) {
      throw new Error(`Encoded waypoint lon too long ${lon_hex}`);
    }
    unhexInto(lon_hex, destLon);
    destWaypoint[15] = this.wp.lon_dir.charCodeAt(0);
  }
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function waypointFromConfig(
  wpData: Uint8Array,
  address?: number
): Waypoint | undefined {
  let id = wpData[31];
  if (id == 255) {
    return;
  }
  for (
    var lastChar = 30;
    lastChar >= 16 && [0, 255, 32].includes(wpData[lastChar]);
    lastChar -= 1
  );
  let name = decoder.decode(wpData.slice(16, lastChar + 1));
  let lat_str = hexarr(wpData.slice(4, 9)).slice(1);
  let lat_deg = Number(lat_str.slice(0, 3));
  let lat_min = Number(lat_str.slice(3, 9));
  let lat_dir = decoder.decode(wpData.slice(9, 10));
  let lon_str = hexarr(wpData.slice(10, 15));
  let lon_deg = Number(lon_str.slice(0, 4));
  let lon_min = Number(lon_str.slice(4, 10));
  let lon_dir = decoder.decode(wpData.slice(15, 16));

  return new Waypoint({
    id: id,
    name: name,
    lat_deg: lat_deg,
    lat_min: lat_min,
    lat_dir: lat_dir,
    lon_deg: lon_deg,
    lon_min: lon_min,
    lon_dir: lon_dir,
    address: address
  });
}

export function parseAndCheckWaypointData({ name, lat, lon }: WpFormData) {
  if (name.length == 0) {
    throw new Error(`No name was provided`);
  }
  if (name.length >= 15) {
    throw new Error(`Waypoint name too long ${name}`);
  }
  if (!/^[\x20-\x7F]+$/.test(name)) {
    throw new Error(`Name contains bad characters ${name}`);
  }
  const parsedLat = parseLat(lat);
  const parsedLon = parseLon(lon);
  if (!parsedLat || !parsedLon) {
    throw new Error(`Unparseable position ${lat} ${lon}`);
  }
  return { lat: parsedLat, lon: parsedLon };
}

export const WAYPOINTS_BYTE_SIZE = 32;

export class DraftWaypoints {
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
export type WpFormData = {
  name: string;
  lat: string;
  lon: string;
};
