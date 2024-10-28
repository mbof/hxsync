import {
  BooleanControlBase,
  NumberControlBase,
  EnumControlBase
} from './preferences-base';

class WeatherAlertControlKnob extends BooleanControlBase {
  constructor() {
    super('weather_alert', 0x0038);
  }
}
class VoxControlKnob extends BooleanControlBase {
  constructor() {
    super('vox', 0x0040);
  }
}
class NoiseCancelRxControlKnob extends BooleanControlBase {
  constructor() {
    super('noise_cancel_rx', 0x0043);
  }
}
class NoiseCancelTxControlKnob extends BooleanControlBase {
  constructor() {
    super('noise_cancel_tx', 0x0045);
  }
}
class GpsPinningControlKnob extends BooleanControlBase {
  constructor() {
    super('gps_pinning', 0x0057);
  }
}
class SbasEnabledControlKnob extends BooleanControlBase {
  constructor() {
    super('sbas_enabled', 0x0058);
  }
}
class BacklightDimmerControlKnob extends NumberControlBase {
  constructor() {
    super('backlight_dimmer', 0x0030, 0, 5);
  }
}
class VolumeControlKnob extends NumberControlBase {
  constructor() {
    super('volume', 0x000c, 0, 15);
  }
}
class SquelchControlKnob extends NumberControlBase {
  constructor() {
    super('squelch', 0x000d, 0, 15);
  }
}
class ContrastControlKnob extends NumberControlBase {
  constructor() {
    super('contrast', 0x0031, 0, 30);
  }
}
class KeyBeepControlKnob extends NumberControlBase {
  constructor() {
    super('key_beep', 0x0032, 0, 5);
  }
}
class ScanResumeControlKnob extends NumberControlBase {
  constructor() {
    super('scan_resume', 0x0037, 1, 5);
  }
}
class VoxLevelControlKnob extends NumberControlBase {
  constructor() {
    super('vox_level', 0x0041, 0, 4);
  }
}
class NavTargetWaypointControlKnob extends NumberControlBase {
  constructor() {
    super('nav_target_waypoint', 0x004b, 1, 255);
  }
}
class NavTargetRouteControlKnob extends NumberControlBase {
  constructor() {
    super('nav_target_route', 0x004e, 1, 255);
  }
}
class NavTargetRoutePointControlKnob extends NumberControlBase {
  constructor() {
    super('nav_target_route_point', 0x004f, 1, 255);
  }
}
class NoiseCancelRxLevel extends NumberControlBase {
  constructor() {
    super('noise_cancel_rx_level', 0x0044, 0, 4);
  }
}
const multiWatchControlKnobEnum = ['dual', 'triple'] as const;
type MultiWatchControlKnobEnumType = (typeof multiWatchControlKnobEnum)[number];
class MultiWatchControlKnob extends EnumControlBase<MultiWatchControlKnobEnumType> {
  constructor() {
    super('multi_watch', 0x0034, multiWatchControlKnobEnum);
  }
}
const scanTypeControlKnobEnum = ['memory', 'priority'] as const;
type ScanTypeControlKnobEnumType = (typeof scanTypeControlKnobEnum)[number];
class ScanTypeControlKnob extends EnumControlBase<ScanTypeControlKnobEnumType> {
  constructor() {
    super('scan_type', 0x0036, scanTypeControlKnobEnum);
  }
}
const emergencyLedControlKnobEnum = [
  'continuous',
  'SOS',
  'Blink1',
  'Blink2',
  'Blink3'
] as const;
type EmergencyLedControlKnobEnumType =
  (typeof emergencyLedControlKnobEnum)[number];
class EmergencyLedControlKnob extends EnumControlBase<EmergencyLedControlKnobEnumType> {
  constructor() {
    super('emergency_led', 0x003a, emergencyLedControlKnobEnum);
  }
}
const waterHazardLedControlKnobEnum = ['off', 'on', 'power-on'] as const;
type WaterHazardLedControlKnobEnumType =
  (typeof waterHazardLedControlKnobEnum)[number];
class WaterHazardLedControlKnob extends EnumControlBase<WaterHazardLedControlKnobEnumType> {
  constructor() {
    super('water_hazard_led', 0x003b, waterHazardLedControlKnobEnum);
  }
}
const lampControlKnobEnum = [
  'off',
  '3s',
  '5s',
  '10s',
  'continuous',
  '20s',
  '30s'
] as const;
type LampControlKnobEnumType = (typeof lampControlKnobEnum)[number];
class LampControlKnob extends EnumControlBase<LampControlKnobEnumType> {
  constructor() {
    super('lamp', 0x003c, lampControlKnobEnum);
  }
}
const afPitchControlKnobEnum = [
  'normal',
  'high-low-cut',
  'high-low-boost',
  'low-boost',
  'high-boost'
] as const;
type AfPitchControlKnobEnumType = (typeof afPitchControlKnobEnum)[number];
class AfPitchControlKnob extends EnumControlBase<AfPitchControlKnobEnumType> {
  constructor() {
    super('af_pitch', 0x003d, afPitchControlKnobEnum);
  }
}
const batterySaveControlKnobEnum = ['off', '50%', '70%', '80%', '90%'] as const;
type BatterySaveControlKnobEnumType =
  (typeof batterySaveControlKnobEnum)[number];
class BatterySaveControlKnob extends EnumControlBase<BatterySaveControlKnobEnumType> {
  constructor() {
    super('battery_save', 0x003e, batterySaveControlKnobEnum);
  }
}
const voxDelayControlKnobEnum = [
  '0.5s',
  '1.0s',
  '1.5s',
  '2.0s',
  '3.0s'
] as const;
type VoxDelayControlKnobEnumType = (typeof voxDelayControlKnobEnum)[number];
class VoxDelayControlKnob extends EnumControlBase<VoxDelayControlKnobEnumType> {
  constructor() {
    super('vox_delay', 0x0042, voxDelayControlKnobEnum);
  }
}
const navDisplayRangeControlKnobEnum = [
  'auto',
  '2M',
  '5M',
  '10M',
  '25M'
] as const;
type NavDisplayRangeControlKnobEnumType =
  (typeof navDisplayRangeControlKnobEnum)[number];
class NavDisplayRangeControlKnob extends EnumControlBase<NavDisplayRangeControlKnobEnumType> {
  constructor() {
    super('nav_display_range', 0x004a, navDisplayRangeControlKnobEnum);
  }
}
const navArrivalRangeControlKnobEnum = [
  '0.05M',
  '0.1M',
  '0.2M',
  '0.5M',
  '1.0M'
] as const;
type NavArrivalRangeControlKnobEnumType =
  (typeof navArrivalRangeControlKnobEnum)[number];
class NavArrivalRangeControlKnob extends EnumControlBase<NavArrivalRangeControlKnobEnumType> {
  constructor() {
    super('nav_arrival_range', 0x004c, navArrivalRangeControlKnobEnum);
  }
}
const navRoutingOperationControlKnobEnum = ['auto', 'manual'] as const;
type NavRoutingOperationControlKnobEnumType =
  (typeof navRoutingOperationControlKnobEnum)[number];
class NavRoutingOperationControlKnob extends EnumControlBase<NavRoutingOperationControlKnobEnumType> {
  constructor() {
    super('nav_routing_operation', 0x004d, navRoutingOperationControlKnobEnum);
  }
}
const gpsPowerSaveControlKnobEnum = [
  'off',
  'auto',
  '50%',
  '75%',
  '90%'
] as const;
type GpsPowerSaveControlKnobEnumType =
  (typeof gpsPowerSaveControlKnobEnum)[number];
class GpsPowerSaveControlKnob extends EnumControlBase<GpsPowerSaveControlKnobEnumType> {
  constructor() {
    super('gps_power_save', 0x0051, gpsPowerSaveControlKnobEnum);
  }
}
const gpsLocationFormatControlKnobEnum = [
  'DDDMMSS',
  'DDDMM.MM',
  'DDDMM.MMMM'
] as const;
type GpsLocationFormatControlKnobEnumType =
  (typeof gpsLocationFormatControlKnobEnum)[number];
class GpsLocationFormatControlKnob extends EnumControlBase<GpsLocationFormatControlKnobEnumType> {
  constructor() {
    super('gps_location_format', 0x0052, gpsLocationFormatControlKnobEnum);
  }
}
const gpsTimeSetupControlKnobEnum = ['UTC', 'local'] as const;
type GpsTimeSetupControlKnobEnumType =
  (typeof gpsTimeSetupControlKnobEnum)[number];
class GpsTimeSetupControlKnob extends EnumControlBase<GpsTimeSetupControlKnobEnumType> {
  constructor() {
    super('gps_time_setup', 0x0053, gpsTimeSetupControlKnobEnum);
  }
}
const speedUnitsControlKnobEnum = ['knots', 'mph', 'km/h'] as const;
type SpeedUnitsControlKnobEnumType = (typeof speedUnitsControlKnobEnum)[number];
class SpeedUnitsControlKnob extends EnumControlBase<SpeedUnitsControlKnobEnumType> {
  constructor() {
    super('speed_units', 0x0054, speedUnitsControlKnobEnum);
  }
}
const distanceUnitsControlKnobEnum = ['nm', 'sm', 'km'] as const;
type DistanceUnitsControlKnobEnumType =
  (typeof distanceUnitsControlKnobEnum)[number];
class DistanceUnitsControlKnob extends EnumControlBase<DistanceUnitsControlKnobEnumType> {
  constructor() {
    super('distance_units', 0x0055, distanceUnitsControlKnobEnum);
  }
}
const altitudeUnitsControlKnobEnum = ['ft', 'm'] as const;
type AltitudeUnitsControlKnobEnumType =
  (typeof altitudeUnitsControlKnobEnum)[number];
class AltitudeUnitsControlKnob extends EnumControlBase<AltitudeUnitsControlKnobEnumType> {
  constructor() {
    super('altitude_units', 0x0056, altitudeUnitsControlKnobEnum);
  }
}
const mapOrientationControlKnobEnum = ['north-up', 'course-up'] as const;
type MapOrientationControlKnobEnumType =
  (typeof mapOrientationControlKnobEnum)[number];
class MapOrientationControlKnob extends EnumControlBase<MapOrientationControlKnobEnumType> {
  constructor() {
    super('map_orientation', 0x0059, mapOrientationControlKnobEnum);
  }
}
const gpsOutputSentencesControlKnobEnum = [
  'GGA',
  'GLL',
  'RMC',
  'VTG',
  'GSA',
  'GSV',
  'ZDA',
  'MSK'
] as const;
type GpsOutputSentencesControlKnobEnumType =
  (typeof gpsOutputSentencesControlKnobEnum)[number];
class GpsOutputSentencesControlKnob extends EnumControlBase<GpsOutputSentencesControlKnobEnumType> {
  constructor() {
    super('gps_output_sentences', 0x005a, gpsOutputSentencesControlKnobEnum);
  }
}
const gpsLoggerIntervalControlKnobEnum = [
  '5s',
  '15s',
  '30s',
  '1min',
  '5min'
] as const;
type GpsLoggerIntervalControlKnobEnumType =
  (typeof gpsLoggerIntervalControlKnobEnum)[number];
class GpsLoggerIntervalControlKnob extends EnumControlBase<GpsLoggerIntervalControlKnobEnumType> {
  constructor() {
    super('gps_logger_interval', 0x005b, gpsLoggerIntervalControlKnobEnum);
  }
}
class GpsEnabledControlKnob extends BooleanControlBase {
  constructor() {
    super('gps_enabled', 0x0050);
  }
}
export function makePreferenceControlKnobs() {
  return [
    new VolumeControlKnob(),
    new SquelchControlKnob(),
    new BacklightDimmerControlKnob(),
    new ContrastControlKnob(),
    new KeyBeepControlKnob(),
    new MultiWatchControlKnob(),
    new ScanTypeControlKnob(),
    new ScanResumeControlKnob(),
    new WeatherAlertControlKnob(),
    new EmergencyLedControlKnob(),
    new WaterHazardLedControlKnob(),
    new LampControlKnob(),
    new AfPitchControlKnob(),
    new BatterySaveControlKnob(),
    new VoxControlKnob(),
    new VoxLevelControlKnob(),
    new VoxDelayControlKnob(),
    new NoiseCancelRxControlKnob(),
    new NoiseCancelRxLevel(),
    new NoiseCancelTxControlKnob(),
    new NavDisplayRangeControlKnob(),
    new NavTargetWaypointControlKnob(),
    new NavArrivalRangeControlKnob(),
    new NavRoutingOperationControlKnob(),
    new NavTargetRouteControlKnob(),
    new NavTargetRoutePointControlKnob(),
    new GpsEnabledControlKnob(),
    new GpsPowerSaveControlKnob(),
    new GpsLocationFormatControlKnob(),
    new GpsTimeSetupControlKnob(),
    new SpeedUnitsControlKnob(),
    new DistanceUnitsControlKnob(),
    new AltitudeUnitsControlKnob(),
    new GpsPinningControlKnob(),
    new SbasEnabledControlKnob(),
    new MapOrientationControlKnob(),
    new GpsOutputSentencesControlKnob(),
    new GpsLoggerIntervalControlKnob()
  ];
}
export const preferenceIds = makePreferenceControlKnobs().map((c) => ({
  id: c.id,
  address: c.address,
  rangeId: { preference: c.id }
}));
export type PreferenceConfig = ReturnType<typeof makePreferenceControlKnobs>;
export type PreferenceSettings = { preference: string };
export function getPreferenceRangeId(id: string) {
  return preferenceIds.find((c) => c.id === id)?.rangeId;
}
