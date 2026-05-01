import { Parser } from 'binary-parser';
import { hexarr } from './message';
import { haversine } from './util';

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
  let parser = new Parser().endianness('little');
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

export function parseWaypoint(
  parser: Parser,
  data: Uint8Array,
  verify: boolean = true
) {
  if (
    data.slice(0, 6).every((byte) => byte === 0xff) ||
    data.slice(0, 6).every((byte) => byte === 0x00)
  ) {
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
      const waypoint = parseWaypoint(
        parser,
        data.slice(offset, offset + parser.sizeOf()),
        true
      );
      if (waypoint) {
        waypoints.push(waypoint);
      } else {
        break;
      }
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
    this.header = parseHeader(data.slice(0, 0x10), verify);
    this.mask = data.slice(0x10, 0x3c);
    this.unknown_3c = data.slice(0x3c, 0x40);
    this.waypoints = parseWaypointsLog(this.header, data.slice(0x40));
  }
}

export interface TimezoneInfo {
  isLocal: boolean;
  is24h: boolean;
  offsetMinutes: number;
}

export function parseTimezone(byte: number): TimezoneInfo {
  const isLocal = (byte & 0x80) !== 0;
  const is24h = (byte & 0x40) !== 0;
  const isPositive = (byte & 0x20) !== 0;
  const offsetHalfHours = byte & 0x1f;
  return {
    isLocal,
    is24h,
    offsetMinutes: (isPositive ? 1 : -1) * offsetHalfHours * 30
  };
}

export class LocusSession {
  waypoints: any[] = [];
  startTime: number = 0;
  endTime: number = 0;
  distance: number = 0; // in nautical miles
  maxSpeed: number = 0; // in knots
  avgSpeed: number = 0; // in knots

  constructor(waypoints: any[]) {
    this.waypoints = waypoints;
    if (waypoints.length > 0) {
      this.startTime = waypoints[0].utc;
      this.endTime = waypoints[waypoints.length - 1].utc;
      this.calculateStats();
    }
  }

  private calculateStats() {
    let totalDistMeters = 0;
    let maxSpeedKnots = 0;
    const METERS_PER_NM = 1852;

    for (let i = 0; i < this.waypoints.length; i++) {
      const wp = this.waypoints[i];
      let impliedSpeedKnots = 0;

      if (i > 0) {
        const prev = this.waypoints[i - 1];
        const distMeters = haversine(prev.lat, prev.lon, wp.lat, wp.lon);
        totalDistMeters += distMeters;
      }

      // Calculate implied speed using central difference if possible,
      // otherwise use segment speed.
      if (i > 0 && i < this.waypoints.length - 1) {
        const prev = this.waypoints[i - 1];
        const next = this.waypoints[i + 1];
        const distMeters = haversine(prev.lat, prev.lon, next.lat, next.lon);
        const timeDiffSeconds = next.utc - prev.utc;
        if (timeDiffSeconds > 0) {
          const speedMps = distMeters / timeDiffSeconds;
          impliedSpeedKnots = (speedMps * 3600) / METERS_PER_NM;
        }
      } else if (i > 0) {
        // Last point segment speed
        const prev = this.waypoints[i - 1];
        const distMeters = haversine(prev.lat, prev.lon, wp.lat, wp.lon);
        const timeDiffSeconds = wp.utc - prev.utc;
        if (timeDiffSeconds > 0) {
          const speedMps = distMeters / timeDiffSeconds;
          impliedSpeedKnots = (speedMps * 3600) / METERS_PER_NM;
        }
      } else if (this.waypoints.length > 1) {
        // First point segment speed
        const next = this.waypoints[1];
        const distMeters = haversine(wp.lat, wp.lon, next.lat, next.lon);
        const timeDiffSeconds = next.utc - wp.utc;
        if (timeDiffSeconds > 0) {
          const speedMps = distMeters / timeDiffSeconds;
          impliedSpeedKnots = (speedMps * 3600) / METERS_PER_NM;
        }
      }

      wp.impliedSpeedKnots = impliedSpeedKnots;

      if (impliedSpeedKnots > maxSpeedKnots) {
        maxSpeedKnots = impliedSpeedKnots;
      }
    }

    this.distance = totalDistMeters / METERS_PER_NM;
    this.maxSpeed = maxSpeedKnots;
    const durationSeconds = this.endTime - this.startTime;
    if (durationSeconds > 0) {
      this.avgSpeed = this.distance / (durationSeconds / 3600);
    }
  }

  getGpx() {
    let gpx: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Nghx" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns="http://www.topografix.com/GPX/1/1"
 xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
`
    ];
    gpx.push('<trk><trkseg>');
    for (let waypoint of this.waypoints) {
      pushGpxWaypoint(gpx, waypoint);
    }
    gpx.push('</trkseg></trk></gpx>');
    return gpx;
  }
}

function pushGpxWaypoint(dest: string[], waypoint: any) {
  dest.push(`<trkpt lat="${waypoint.lat}" lon="${waypoint.lon}">`);
  dest.push(`<ele>${waypoint.hgt}</ele>`);
  dest.push(
    `<time>${new Date(waypoint.utc * 1000).toISOString().replace('Z', '')}</time>`
  );
  if (waypoint.impliedSpeedKnots || waypoint.trk) {
    let comment: { speed_knots?: number; trk?: number } = {};
    if (waypoint.impliedSpeedKnots) {
      comment.speed_knots = Number(waypoint.impliedSpeedKnots.toFixed(2));
    }
    if (waypoint.trk) {
      comment.trk = waypoint.trk;
    }
    dest.push(`<cmt>${JSON.stringify(comment)}</cmt>`);
  }
  if (waypoint.valid == FixQuality.DGPS) {
    dest.push(`<fix>dgps</fix>`);
  }
  if (waypoint.nsat) {
    dest.push(`<sat>${waypoint.nsat}</sat>`);
  }
  if (waypoint.hdop) {
    dest.push(`<hdop>${waypoint.hdop}</hdop>`);
  }
  dest.push(`</trkpt>`);
}

export class Locus {
  sectors: LocusSector[];
  sessions: LocusSession[] = [];

  constructor(data: Uint8Array, verify: boolean = true) {
    this.sectors = [];
    let allWaypoints: any[] = [];
    for (
      let sector_offset = 0;
      sector_offset + 0x1000 <= data.length;
      sector_offset += 0x1000
    ) {
      const sector_data = data.slice(sector_offset, sector_offset + 0x1000);
      const sector = new LocusSector(sector_data, verify);
      this.sectors.push(sector);
      allWaypoints.push(...sector.waypoints);
    }

    // Split into sessions (1 hour gap)
    if (allWaypoints.length > 0) {
      allWaypoints.sort((a, b) => a.utc - b.utc);
      let currentSessionPoints: any[] = [allWaypoints[0]];
      for (let i = 1; i < allWaypoints.length; i++) {
        const wp = allWaypoints[i];
        const prev = allWaypoints[i - 1];
        if (wp.utc - prev.utc > 3600) {
          this.sessions.push(new LocusSession(currentSessionPoints));
          currentSessionPoints = [];
        }
        currentSessionPoints.push(wp);
      }
      if (currentSessionPoints.length > 0) {
        this.sessions.push(new LocusSession(currentSessionPoints));
      }
    }
  }

  getGpx() {
    let gpx: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Nghx" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns="http://www.topografix.com/GPX/1/1"
 xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
`
    ];
    for (let session of this.sessions) {
      gpx.push('<trk><trkseg>');
      for (let waypoint of session.waypoints) {
        pushGpxWaypoint(gpx, waypoint);
      }
      gpx.push('</trkseg></trk>');
    }
    gpx.push('</gpx>');
    return gpx;
  }
}
