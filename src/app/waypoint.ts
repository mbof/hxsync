import { hex, hexarr, unhex } from './message';

export class Waypoint {
  constructor(
    public wp: {
      id: number;
      name: string;
      lat_deg: number;
      lat_dir: string;
      lat_min: number;
      lon_deg: number;
      lon_dir: string;
      lon_min: number;
      address?: number;
    }
  ) { }
  toString(): string {
    let wpStr = `${this.wp.id}, ${this.wp.name}, ${this.wp.lat_deg}${this.wp.lat_dir}${this.wp.lat_min}, ${this.wp.lon_deg}${this.wp.lon_dir}${this.wp.lon_min}`;
    if (this.wp.address) {
      return `@0x${hex(this.wp.address, 4)}: ` + wpStr;
    } else {
      return wpStr;
    }
  }
  getLat() {
    const lat_min_int = Math.floor(this.wp.lat_min / 10000).toString(10).padStart(2, '0');
    const lat_min_flt = (this.wp.lat_min % 10000).toString(10).padStart(4, '0');
    return `${this.wp.lat_deg}${this.wp.lat_dir}${lat_min_int}.${lat_min_flt}`;
  }
  getLon() {
    const lon_min_int = Math.floor(this.wp.lon_min / 10000).toString(10).padStart(2, '0');
    const lon_min_flt = (this.wp.lon_min % 10000).toString(10).padStart(4, '0');
    return `${this.wp.lon_deg}${this.wp.lon_dir}${lon_min_int}.${lon_min_flt}`;
  }
}

const decoder = new TextDecoder();

export function waypointFromConfig(wpData: Uint8Array, address?: number): Waypoint | undefined {
  let id = wpData[31];
  if (id == 255) {
    return;
  }
  for (var lastChar = 30; lastChar >= 16 && [0, 255, 32].includes(wpData[lastChar]); lastChar -= 1);
  let name = decoder.decode(wpData.slice(16, lastChar + 1));
  let lat_str = hexarr(wpData.slice(4, 9)).slice(1);
  let lat_deg = Number(lat_str.slice(0, 3));
  let lat_min = Number(lat_str.slice(3, 9));
  let lat_dir = decoder.decode(wpData.slice(9, 10));
  let lon_str = hexarr(wpData.slice(10, 15));
  let lon_deg = Number(lon_str.slice(0, 4));
  let lon_min = Number(lat_str.slice(4, 10));
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
