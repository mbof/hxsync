import { hex, hexarr, unhex, unhexInto } from './message';
import { parseLat, parseLon } from './parseLatLon';

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
    return `${this.wp.lat_deg}° ${lat_min_int}.${lat_min_flt}’ ${this.wp.lat_dir}`;
  }
  getLon() {
    const lon_min_int = Math.floor(this.wp.lon_min / 10000)
      .toString(10)
      .padStart(2, '0');
    const lon_min_flt = (this.wp.lon_min % 10000).toString(10).padStart(4, '0');
    return `${this.wp.lon_deg}° ${lon_min_int}.${lon_min_flt}’ ${this.wp.lon_dir}`;
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
    const destWaypoint = dest.subarray(destOffset, destOffset + 32);
    destWaypoint[31] = this.wp.id;
    const destName = destWaypoint.subarray(16, 31);
    const { written: nameByteLength } = encoder.encodeInto(name, destName);
    destName.fill(255, nameByteLength, 15);
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
  let lat_str = hexarr(wpData.slice(5, 9));
  let lat_deg = Number(lat_str.slice(0, 2));
  let lat_min = Number(lat_str.slice(2, 9));
  let lat_dir = decoder.decode(wpData.slice(9, 10));
  let lon_str = hexarr(wpData.slice(10, 15)).slice(1);
  let lon_deg = Number(lon_str.slice(0, 3));
  let lon_min = Number(lon_str.slice(3, 10));
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
    throw new Error(
      `Waypoint name too long "${name}". Consider "${name.trim().substring(0, 14).trim()}".`
    );
  }
  if (!/^[-!"#%&'*+,.:<>\?\[\]_0-9A-Za-z ]+$/.test(name)) {
    const badCharRe = /[^-!"#%&'*+,.:<>\?\[\]_0-9A-Za-z ]/g;
    const badCharIterator = name.matchAll(badCharRe);
    let badChars = '';
    for (let badCharMatch of badCharIterator) {
      const badChar = badCharMatch[0];
      if (!badChars.includes(badChar)) {
        badChars = badChars + badChar;
      }
    }
    throw new Error(`Waypoint name cannot contain ${badChars}`);
  }
  const parsedLat = parseLat(lat);
  const parsedLon = parseLon(lon);
  if (!parsedLat || !parsedLon) {
    throw new Error(`Unparseable position ${lat} ${lon}`);
  }
  if (
    parsedLat.lat_deg > 90 ||
    parsedLat.lat_deg < 0 ||
    parsedLat.lat_min < 0 ||
    parsedLat.lat_min > 60 * 10000
  ) {
    throw new Error(`Bad latitude ${lat}`);
  }
  if (
    parsedLon.lon_deg > 180 ||
    parsedLon.lon_deg < 0 ||
    parsedLon.lon_min < 0 ||
    parsedLon.lon_min > 60 * 10000
  ) {
    throw new Error(`Bad longitude ${lon}`);
  }
  if (!['N', 'S'].includes(parsedLat.lat_dir)) {
    throw new Error(`Bad latitude direction in ${lat}`);
  }
  if (!['E', 'W'].includes(parsedLon.lon_dir)) {
    throw new Error(`Bad longitude direction in ${lon}`);
  }
  return { lat: parsedLat, lon: parsedLon };
}

export const WAYPOINTS_BYTE_SIZE = 32;

export type WpFormData = {
  name: string;
  lat: string;
  lon: string;
};
