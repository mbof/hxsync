function parseAngleInternal(
  angle: string,
  axis: 'lat' | 'lon'
): { deg: number; dir: string; min: number; } | undefined {
  // Format 1: decimal minutes 32N34.0005
  let parsedAngle = axis == 'lat'
    ? angle.toUpperCase().match(/^ *(\d+) *(N|S) *(\d+)\.(\d+) *$/)
    : angle.toUpperCase().match(/^ *(\d+) *(E|W) *(\d+)\.(\d+) *$/);

  if (parsedAngle) {
    const [_unused, degStr, dir, minStr, minDecimalsStr] = parsedAngle;
    const minTenThousandthsStr = minDecimalsStr.slice(0, 4).padEnd(4, '0');
    const deg = Number.parseInt(degStr, 10);
    const min = Number.parseInt(minStr, 10) * 10000 +
      Number.parseInt(minTenThousandthsStr, 10);
    return { deg, dir, min };
  }

  // Format 2: decimal minutes 32° 34.0005' N
  parsedAngle =
    axis == 'lat'
      ? angle
        .toUpperCase()
        .match(/^ *(\d+) *° *(\d+)\.(\d+) *['‘’`]? *(N|S) *$/)
      : angle
        .toUpperCase()
        .match(/^ *(\d+) *° *(\d+)\.(\d+) *['‘’`]? *(E|W) *$/);

  if (parsedAngle) {
    const [_unused, degStr, minStr, minDecimalsStr, dir] = parsedAngle;
    const minTenThousandthsStr = minDecimalsStr.slice(0, 4).padEnd(4, '0');
    const deg = Number.parseInt(degStr, 10);
    const min = Number.parseInt(minStr, 10) * 10000 +
      Number.parseInt(minTenThousandthsStr, 10);
    return { deg, dir, min };
  }

  // Format 3: degrees, minutes, decimal seconds 32° 34' 23.1" N
  parsedAngle =
    axis == 'lat'
      ? angle
        .toUpperCase()
        .match(/^ *(\d+) *° *(\d+) *['‘’`] *(\d+|\d+\.\d+) *["“”]? *(N|S) *$/)
      : angle
        .toUpperCase()
        .match(
          /^ *(\d+) *° *(\d+) *['‘’`] *(\d+|\d+\.\d+) *["“”]? *(E|W) *$/
        );

  if (parsedAngle) {
    const [_unused, degStr, minStr, secStr, dir] = parsedAngle;
    const deg = Number.parseInt(degStr, 10);
    const min = Number.parseInt(minStr, 10) * 10000 +
      Math.round((Number.parseFloat(secStr) * 10000) / 60);
    return { deg, dir, min };
  }

  // Format 4: decimal degrees 32.12536, sign = direction
  parsedAngle = angle.match(/^ *([+-]?\d+(\.\d+)?) *$/);
  if (parsedAngle) {
    const [_unused, degStr] = parsedAngle;
    const degFloat = Number.parseFloat(degStr);
    let dir: string;
    if (axis == 'lat') {
      dir = degFloat > 0 ? 'N' : 'S';
    } else {
      dir = degFloat > 0 ? 'E' : 'W';
    }
    const deg = Math.floor(Math.abs(degFloat));
    const min = Math.round((Math.abs(degFloat) - deg) * 60 * 10000);
    return { deg, dir, min };
  }

  return undefined;
}

export function parseLat(
  lat: string
): { lat_deg: number; lat_dir: string; lat_min: number; } | undefined {
  const angle = parseAngleInternal(lat, 'lat');
  if (!angle) {
    return undefined;
  }
  return { lat_deg: angle.deg, lat_dir: angle.dir, lat_min: angle.min };
}

export function parseLon(
  lon: string
): { lon_deg: number; lon_dir: string; lon_min: number; } | undefined {
  const angle = parseAngleInternal(lon, 'lon');
  if (!angle) {
    return undefined;
  }
  return { lon_deg: angle.deg, lon_dir: angle.dir, lon_min: angle.min };
}
