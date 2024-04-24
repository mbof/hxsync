import { parseLat, parseLon } from './parseLatLon';

describe('parseLat', () => {
  it('should parse a latitude', () => {
    const lat = parseLat('45N06.7890');
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 67890
    });
  });
  it('should parse a latitude (format 2)', () => {
    const lat = parseLat(`45° 06.789' N `);
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 67890
    });
  });
  it('should parse a latitude (format 3)', () => {
    const lat = parseLat(`45° 16’ 33.33” N `);
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 165555
    });
  });
  it('should parse a latitude (format 4)', () => {
    const lat = parseLat(`45.123456`);
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'N',
      lat_min: 74074
    });
  });
  it('should parse a latitude (format 4, negative)', () => {
    const lat = parseLat(`-45.123456`);
    expect(lat).toEqual({
      lat_deg: 45,
      lat_dir: 'S',
      lat_min: 74074
    });
  });
});

describe('parseLon', () => {
  it('should parse a longitude', () => {
    const lon = parseLon('123W03.5670');
    expect(lon).toEqual({
      lon_deg: 123,
      lon_dir: 'W',
      lon_min: 35670
    });
  });
});
