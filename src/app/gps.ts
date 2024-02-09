import { Parser } from 'binary-parser';
import { hexarr } from './message';

function checksum(data: Uint8Array): number {
  return data.reduce((x, y) => x ^ y);
}

enum LocusContent {
  UTC = 1 << 0, // 4 bytes int
  VALID = 1 << 1, // 1 byte uint
  LAT = 1 << 2, // 4 bytes float
  LON = 1 << 3, // 4 bytes float
  HGT = 1 << 4, // 2 bytes int
  SPD = 1 << 5, // 2 bytes uint
  TRK = 1 << 6, // 2 bytes int
  HDOP = 1 << 10, // 2 bytes
  NSAT = 1 << 12 // 1 byte uint
}

export function makeParser(content: number): Parser {
  let content_size = 0;
  let parser = new Parser().endianness('little');
  const attributes: string[] = [];
  const labels: string[] = [];
  if (content & LocusContent.UTC) {
    parser.int32('utc');
  }
  if (content & LocusContent.VALID) {
    parser.uint8('valid');
  }
  if (content & LocusContent.LAT) {
    parser.floatle('lat');
  }
  if (content & LocusContent.LON) {
    parser.floatle('lon');
  }
  if (content & LocusContent.HGT) {
    parser.int16('hgt');
  }
  if (content & LocusContent.SPD) {
    parser.uint16('spd');
  }
  if (content & LocusContent.TRK) {
    parser.int16('trk');
  }
  if (content & LocusContent.HDOP) {
    parser.int16('hdop');
  }
  if (content & LocusContent.NSAT) {
    parser.uint8('nsat');
  }
  parser.uint8('checksum');
  return parser;
}

export enum LoggingMode {
  ALWAYSLOCATE = 1 << 0,
  FIXONLY = 1 << 1,
  NORMAL = 1 << 2,
  INTERVAL = 1 << 3,
  DISTANCE = 1 << 4,
  SPEED = 1 << 5
}

export enum FixQuality {
  INVALID = 0,
  SPS = 1,
  DGPS = 2,
  PPS = 3,
  RTK = 4,
  FRTK = 5,
  ESTIMATED = 6,
  MANUAL = 7,
  SIMULATOR = 8
}

class LocusError extends Error {}

export function parseHeader(data: Uint8Array, verify: boolean = true) {
  if (data.length < 16) {
    throw new Error('Insufficient data for parsing header');
  }
  // <HBBHHHHHBB
  let headerParser = new Parser()
    .endianness('little')
    .uint16('sectorId')
    .uint8('loggingType')
    .uint8('loggingMode')
    .uint16('logContent')
    .uint16('unknown_06')
    .uint16('intervalSetting')
    .uint16('distanceSetting')
    .uint16('speedSetting')
    .uint8('unknown_0e')
    .uint8('checksum');
  let header = headerParser.parse(data.slice(0, 16));
  if (verify && header.checksum !== checksum(data.slice(0, 15))) {
    throw new LocusError(`Invalid header checksum in ${hexarr(data)}`);
  }
  return header;
}

export function parseWaypoint(parser: Parser, data: Uint8Array, verify: boolean = true) {
  if (data.slice(0, 6).every((byte) => byte === 0xff) || data.slice(0, 6).every((byte) => byte === 0x00)) {
    return undefined;
  }
  const parsed = parser.parse(data);
  if (verify && parsed.checksum !== checksum(data.slice(0, data.length - 1))) {
    throw new LocusError(`Checksum mismatch in waypoint data: ${hexarr(data)}`);
  }
  return parsed;
}

function parseWaypointsLog(header: any, data: Uint8Array) {
  const parser = makeParser(header.logContent);
  let waypoints: any[] = [];
  for (let offset = 0; offset < data.length; offset += parser.sizeOf()) {
    try {
      const waypoint = parseWaypoint(parser, data.slice(offset, offset + parser.sizeOf()), true);
      waypoints.push(waypoint);
    } catch (error) {
      if (error instanceof LocusError) {
        break;
      } else {
        throw error;
      }
    }
  }
  return waypoints;
}

export class LocusSector {
  header: any;
  mask: Uint8Array;
  unknown_3c: Uint8Array;
  waypoints: any[] = [];

  constructor(data: Uint8Array, verify: boolean = true) {
    this.header = parseHeader(data.slice(0, 0x12), verify);
    this.mask = data.slice(0x11, 0x3c);
    this.unknown_3c = data.slice(0x3c, 0x40);
    this.waypoints = parseWaypointsLog(this.header, data.slice(0x40));
  }
}

function pushGpxWaypoint(dest: string[], waypoint: any) {
  dest.push(`<wpt lat="${waypoint.lat}" lon="${waypoint.lon}">`);
  dest.push(`<ele>${waypoint.hgt}</ele><time>${waypoint.utc}</time><fix>${waypoint.valid}</fix>`);
  if (waypoint.spd) {
    dest.push(`<spd>${waypoint.spd}</spd>`);
  }
  if (waypoint.trk) {
    dest.push(`<trk>${waypoint.trk}</trk>`);
  }
  if (waypoint.hdop) {
    dest.push(`<hdop>${waypoint.hdop}</hdop>`);
  }
  if (waypoint.nsat) {
    dest.push(`<sat>${waypoint.nsat}</sat>`);
  }
  dest.push(`</wpt>`);
}

export class Locus {
  sectors: LocusSector[];

  constructor(data: Uint8Array, verify: boolean = true) {
    this.sectors = [];
    for (let sector_offset = 0; sector_offset + 0x1000 <= data.length; sector_offset += 0x1000) {
      const sector_data = data.slice(sector_offset, sector_offset + 0x1000);
      this.sectors.push(new LocusSector(sector_data, verify));
    }
  }

  getGpx() {
    let gpx: string[] = [
      `<?xml version="1.0"?>
<gpx
 version="1.0"
 creator="Nghx"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns="http://www.topografix.com/GPX/1/0"
 xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd">
`
    ];
    gpx.push('<trk><trkseg>');
    for (let sector of this.sectors) {
      for (let waypoint of sector.waypoints) {
        if (waypoint) {
          pushGpxWaypoint(gpx, waypoint);
        }
      }
    }
    gpx.push('</trkseg></trk>');
    gpx.push('</gpx>');
    return gpx;
  }
}
