import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { ConfigModuleInterface, YamlContext } from './config-module-interface';
import { Config, DeviceModel } from './device-configs';
import { Document, Node, Scalar, YAMLMap } from 'yaml';

export type PreferenceConfig = {
  volume?: number;
  squelch?: number;
  backlight_dimmer?: BacklightDimmerControlKnobEnumType;
  contrast?: number;
  key_beep?: number;
  multi_watch?: MultiWatchControlKnobEnumType;
  scan_type?: ScanTypeControlKnobEnumType;
  scan_resume?: number;
  weather_alert?: boolean;
  emergency_led?: EmergencyLedControlKnobEnumType;
  water_hazard_led?: WaterHazardLedControlKnobEnumType;
  lamp?: LampControlKnobEnumType;
  af_pitch?: AfPitchControlKnobEnumType;
  battery_save?: BatterySaveControlKnobEnumType;
  vox?: boolean;
  vox_level?: number;
  vox_delay?: VoxDelayControlKnobEnumType;
  noise_cancel_rx?: boolean;
  noise_cancel_rx_level?: number;
  noise_cancel_tx?: boolean;
  nav_display_range?: 'auto' | '2M' | '5M' | '10M' | '25M';
  nav_target_waypoint?: number;
  nav_arrival_range?: '0.05M' | '0.1M' | '0.2M' | '0.5M' | '1.0M';
  nav_routing_operation?: 'auto' | 'manual';
  nav_target_route?: number;
  nav_target_route_point?: number;
  gps_enabled?: GpsEnabledControlKnobEnumType;
  gps_power_save?: GpsPowerSaveControlKnobEnumType;
  gps_location_format?: GpsLocationFormatControlKnobEnumType;
  gps_time_setup?: GpsTimeSetupControlKnobEnumType;
  speed_units?: SpeedUnitsControlKnobEnumType;
  distance_units?: DistanceUnitsControlKnobEnumType;
  altitude_units?: AltitudeUnitsControlKnobEnumType;
  gps_pinning?: boolean;
  sbas_enabled?: boolean;
  map_orientation?: MapOrientationControlKnobEnumType;
  gps_output_sentences?: GpsOutputSentencesControlKnobEnumType;
  gps_logger_interval?: GpsLoggerIntervalControlKnobEnumType;
};

export const preferenceSettings = [
  'volume', // numeric (0=min, 15=max)
  'squelch', // numeric (0=open, 15=max)
  'backlight_dimmer', // numeric (0=off, 5=max)
  'contrast', // numeric (0=min, 30=max)
  'key_beep', // numeric (0=min, 5=max)
  'multi_watch', // 0x00=dual, 0x01=triple
  'scan_type', // 0x00=memory, 0x01=priority
  'scan_resume', // numeric (1=min, 5=max)
  'weather_alert', // 0x00=off, 0x01=on
  'emergency_led', // 0x00=continuous, 0x01=SOS, 0x02=Blink1, 0x03=Blink2, 0x04=Blink3
  'water_hazard_led', // 0x00=off, 0x01=on, 0x02=power-on
  'lamp', // 0x00=off, 0x01=3s, 0x02=5s, 0x03=10s, 0x04=continuous, 0x05=20s, 0x06=30s
  'af_pitch', // 0x00=normal, 0x01=high-low-cut, 0x02=high-low-boost, 0x03=low-boost, 0x04=high-boost
  'battery_save', // 0x00=off, 0x01=50%, 0x02=70%, 0x03=80%, 0x04=90%
  'vox', // 0x00=off, 0x01=on
  'vox_level', // numeric (0=min, 4=max)
  'vox_delay', // 0x00=0.5s, 0x01=1.0s, 0x02=1.5s, 0x03=2.0s, 0x04=3.0s
  'noise_cancel_rx', // 0x00=off, 0x01=on
  'noise_cancel_rx_level', // 0x00=1, 0x01=2, 0x02=3, 0x03=4
  'noise_cancel_tx', // 0x00=off, 0x01=on
  'nav_display_range', // 0x00=auto, 0x01=2M, 0x02=5M, 0x03=10M, 0x04=25M
  'nav_target_waypoint', // numeric (one-based index)
  'nav_arrival_range', // 0x00=0.05M, 0x01=0.1M, 0x02=0.2M, 0x03=0.5M, 0x04=1.0M
  'nav_routing_operation', // 0x00=auto, 0x01=manual
  'nav_target_route', // numeric (one-based index)
  'nav_target_route_point', // numeric (one-based waypoint index)
  'gps_enabled', // 0x00=off, 0x01=on
  'gps_power_save', // 0x00=off, 0x01=auto, 0x02=50%, 0x03=75%, 0x04=90%
  'gps_location_format', // 0x00=ddd°mm′ss″, 0x01=ddd°mm.mm′, 0x02=ddd°mm.mmmm′
  'gps_time_setup', // bitmask; see below
  'speed_units', // 0x00=knots, 0x01=mph, 0x02=km/h
  'distance_units', // 0x00=nm, 0x01=sm, 0x02=km
  'altitude_units', // 0x00=feet, 0x01=metres
  'gps_pinning', // 0x00=no, 0x01=yes
  'sbas_enabled', // 0x00=off, 0x01=on
  'map_orientation', // 0x00=north-up, 0x01=course-up
  'gps_output_sentences', // bitmask; see below
  'gps_logger_interval' // 0x00=5s, 0x01=15s, 0x02=30s, 0x03=1min, 0x04=5min
] as const;
export type PreferenceSettings = (typeof preferenceSettings)[number];

interface ControlKnob {
  id: PreferenceSettings;
  address: number;
  parse(configOut: PreferenceConfig, nodeIn: Scalar): void;
  write(configBatchWriter: ConfigBatchWriter, config: PreferenceConfig): void;
}

class NumberControlBase {
  readonly id: PreferenceSettings;
  readonly address: number;
  readonly min: number;
  readonly max: number;

  constructor(
    id: PreferenceSettings,
    address: number,
    min: number,
    max: number
  ) {
    this.id = id;
    this.address = address;
    this.min = min;
    this.max = max;
  }

  validate(nodeIn: Scalar): number {
    if (typeof nodeIn.value != 'number') {
      throw new YamlError(`${this.id} must be a number`, nodeIn);
    }
    if (nodeIn.value < this.min || nodeIn.value > this.max) {
      throw new YamlError(
        `${this.id} must be between ${this.min} and ${this.max}`,
        nodeIn
      );
    }
    return nodeIn.value;
  }

  write(configBatchWriter: ConfigBatchWriter, config: PreferenceConfig) {
    if (config[this.id]) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([config[this.id] as number])
      );
    }
  }
}

class EnumControlBase<const T> {
  constructor(
    readonly id: PreferenceSettings,
    readonly address: number,
    readonly values: readonly T[]
  ) {}

  validate<T>(nodeIn: Scalar): T {
    if (
      typeof nodeIn.value != 'string' ||
      this.values.find((v) => v === nodeIn.value) === undefined
    ) {
      throw new YamlError(
        `${this.id} must be in [${this.values.join(', ')}]`,
        nodeIn
      );
    }
    return nodeIn.value as T;
  }

  write(configBatchWriter: ConfigBatchWriter, config: PreferenceConfig) {
    if (config[this.id]) {
      const enumValue = this.values.findIndex((v) => v === config[this.id]);
      if (enumValue === -1) {
        throw new Error(`Invalid enum value ${config[this.id]}`);
      }
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([enumValue])
      );
    }
  }
}

class BooleanControlBase {
  constructor(
    readonly id: PreferenceSettings,
    readonly address: number
  ) {}

  validate(nodeIn: Scalar): boolean {
    if (typeof nodeIn.value != 'boolean') {
      throw new YamlError(`${this.id} must be a boolean`, nodeIn);
    }
    return nodeIn.value;
  }

  write(configBatchWriter: ConfigBatchWriter, config: PreferenceConfig) {
    if (config[this.id]) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([config[this.id] ? 1 : 0])
      );
    }
  }
}

class WeatherAlertControlKnob
  extends BooleanControlBase
  implements ControlKnob
{
  constructor() {
    super('weather_alert', 0x0038);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.weather_alert = this.validate(nodeIn);
  }
}

class VoxControlKnob extends BooleanControlBase implements ControlKnob {
  constructor() {
    super('vox', 0x0040);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.vox = this.validate(nodeIn);
  }
}

class NoiseCancelRxControlKnob
  extends BooleanControlBase
  implements ControlKnob
{
  constructor() {
    super('noise_cancel_rx', 0x0043);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.noise_cancel_rx = this.validate(nodeIn);
  }
}

class NoiseCancelTxControlKnob
  extends BooleanControlBase
  implements ControlKnob
{
  constructor() {
    super('noise_cancel_tx', 0x0045);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.noise_cancel_tx = this.validate(nodeIn);
  }
}

class GpsPinningControlKnob extends BooleanControlBase implements ControlKnob {
  constructor() {
    super('gps_pinning', 0x0057);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_pinning = this.validate(nodeIn);
  }
}

class SbasEnabledControlKnob extends BooleanControlBase implements ControlKnob {
  constructor() {
    super('sbas_enabled', 0x0058);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.sbas_enabled = this.validate(nodeIn);
  }
}

const backlightDimmerControlKnobEnum = [
  'off',
  '1',
  '2',
  '3',
  '4',
  '5'
] as const;
type BacklightDimmerControlKnobEnumType =
  (typeof backlightDimmerControlKnobEnum)[number];
class BacklightDimmerControlKnob
  extends EnumControlBase<BacklightDimmerControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('backlight_dimmer', 0x0030, backlightDimmerControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.backlight_dimmer = this.validate(nodeIn);
  }
}

class VolumeControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('volume', 0x000c, 0, 15);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.volume = this.validate(nodeIn);
  }
}

class SquelchControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('squelch', 0x000d, 0, 15);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.squelch = this.validate(nodeIn);
  }
}

class ContrastControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('contrast', 0x0031, 0, 30);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.contrast = this.validate(nodeIn);
  }
}

class KeyBeepControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('key_beep', 0x0032, 0, 5);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.key_beep = this.validate(nodeIn);
  }
}

class ScanResumeControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('scan_resume', 0x0037, 1, 5);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.scan_resume = this.validate(nodeIn);
  }
}

class VoxLevelControlKnob extends NumberControlBase implements ControlKnob {
  constructor() {
    super('vox_level', 0x0041, 0, 4);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.vox_level = this.validate(nodeIn);
  }
}

class NavTargetWaypointControlKnob
  extends NumberControlBase
  implements ControlKnob
{
  constructor() {
    super('nav_target_waypoint', 0x004b, 1, 255);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_target_waypoint = this.validate(nodeIn);
  }
}

class NavTargetRouteControlKnob
  extends NumberControlBase
  implements ControlKnob
{
  constructor() {
    super('nav_target_route', 0x004e, 1, 255);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_target_route = this.validate(nodeIn);
  }
}

class NavTargetRoutePointControlKnob
  extends NumberControlBase
  implements ControlKnob
{
  constructor() {
    super('nav_target_route_point', 0x004f, 1, 255);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_target_route_point = this.validate(nodeIn);
  }
}

class NoiseCancelRxLevel extends NumberControlBase implements ControlKnob {
  constructor() {
    super('noise_cancel_rx_level', 0x0044, 0, 4);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar): void {
    configOut.noise_cancel_rx_level = this.validate(nodeIn);
  }
}

const multiWatchControlKnobEnum = ['dual', 'triple'] as const;
type MultiWatchControlKnobEnumType = (typeof multiWatchControlKnobEnum)[number];
class MultiWatchControlKnob
  extends EnumControlBase<MultiWatchControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('multi_watch', 0x0034, multiWatchControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.multi_watch = this.validate(nodeIn);
  }
}

const scanTypeControlKnobEnum = ['memory', 'priority'] as const;
type ScanTypeControlKnobEnumType = (typeof scanTypeControlKnobEnum)[number];
class ScanTypeControlKnob
  extends EnumControlBase<ScanTypeControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('scan_type', 0x0036, scanTypeControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.scan_type = this.validate(nodeIn);
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
class EmergencyLedControlKnob
  extends EnumControlBase<EmergencyLedControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('emergency_led', 0x003a, emergencyLedControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.emergency_led = this.validate(nodeIn);
  }
}

const waterHazardLedControlKnobEnum = ['off', 'on', 'power-on'] as const;
type WaterHazardLedControlKnobEnumType =
  (typeof waterHazardLedControlKnobEnum)[number];
class WaterHazardLedControlKnob
  extends EnumControlBase<WaterHazardLedControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('water_hazard_led', 0x003b, waterHazardLedControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.water_hazard_led = this.validate(nodeIn);
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
class LampControlKnob
  extends EnumControlBase<LampControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('lamp', 0x003c, lampControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.lamp = this.validate(nodeIn);
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
class AfPitchControlKnob
  extends EnumControlBase<AfPitchControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('af_pitch', 0x003d, afPitchControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.af_pitch = this.validate(nodeIn);
  }
}

const batterySaveControlKnobEnum = ['off', '50%', '70%', '80%', '90%'] as const;
type BatterySaveControlKnobEnumType =
  (typeof batterySaveControlKnobEnum)[number];
class BatterySaveControlKnob
  extends EnumControlBase<BatterySaveControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('battery_save', 0x003e, batterySaveControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.battery_save = this.validate(nodeIn);
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
class VoxDelayControlKnob
  extends EnumControlBase<VoxDelayControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('vox_delay', 0x0042, voxDelayControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.vox_delay = this.validate(nodeIn);
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
class NavDisplayRangeControlKnob
  extends EnumControlBase<NavDisplayRangeControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('nav_display_range', 0x004a, navDisplayRangeControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_display_range = this.validate(nodeIn);
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
class NavArrivalRangeControlKnob
  extends EnumControlBase<NavArrivalRangeControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('nav_arrival_range', 0x004c, navArrivalRangeControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_arrival_range = this.validate(nodeIn);
  }
}

const navRoutingOperationControlKnobEnum = ['auto', 'manual'] as const;
type NavRoutingOperationControlKnobEnumType =
  (typeof navRoutingOperationControlKnobEnum)[number];
class NavRoutingOperationControlKnob
  extends EnumControlBase<NavRoutingOperationControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('nav_routing_operation', 0x004d, navRoutingOperationControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.nav_routing_operation = this.validate(nodeIn);
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
class GpsPowerSaveControlKnob
  extends EnumControlBase<GpsPowerSaveControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_power_save', 0x0051, gpsPowerSaveControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_power_save = this.validate(nodeIn);
  }
}

const gpsLocationFormatControlKnobEnum = [
  'DDDMMSS',
  'DDDMM.MM',
  'DDDMM.MMMM'
] as const;
type GpsLocationFormatControlKnobEnumType =
  (typeof gpsLocationFormatControlKnobEnum)[number];
class GpsLocationFormatControlKnob
  extends EnumControlBase<GpsLocationFormatControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_location_format', 0x0052, gpsLocationFormatControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_location_format = this.validate(nodeIn);
  }
}

const gpsTimeSetupControlKnobEnum = ['UTC', 'local'] as const;
type GpsTimeSetupControlKnobEnumType =
  (typeof gpsTimeSetupControlKnobEnum)[number];
class GpsTimeSetupControlKnob
  extends EnumControlBase<GpsTimeSetupControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_time_setup', 0x0053, gpsTimeSetupControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_time_setup = this.validate(nodeIn);
  }
}

const speedUnitsControlKnobEnum = ['knots', 'mph', 'km/h'] as const;
type SpeedUnitsControlKnobEnumType = (typeof speedUnitsControlKnobEnum)[number];
class SpeedUnitsControlKnob
  extends EnumControlBase<SpeedUnitsControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('speed_units', 0x0054, speedUnitsControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.speed_units = this.validate(nodeIn);
  }
}

const distanceUnitsControlKnobEnum = ['nm', 'sm', 'km'] as const;
type DistanceUnitsControlKnobEnumType =
  (typeof distanceUnitsControlKnobEnum)[number];
class DistanceUnitsControlKnob
  extends EnumControlBase<DistanceUnitsControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('distance_units', 0x0055, distanceUnitsControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.distance_units = this.validate(nodeIn);
  }
}

const altitudeUnitsControlKnobEnum = ['ft', 'm'] as const;
type AltitudeUnitsControlKnobEnumType =
  (typeof altitudeUnitsControlKnobEnum)[number];
class AltitudeUnitsControlKnob
  extends EnumControlBase<AltitudeUnitsControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('altitude_units', 0x0056, altitudeUnitsControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.altitude_units = this.validate(nodeIn);
  }
}

const mapOrientationControlKnobEnum = ['north-up', 'course-up'] as const;
type MapOrientationControlKnobEnumType =
  (typeof mapOrientationControlKnobEnum)[number];
class MapOrientationControlKnob
  extends EnumControlBase<MapOrientationControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('map_orientation', 0x0059, mapOrientationControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.map_orientation = this.validate(nodeIn);
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
class GpsOutputSentencesControlKnob
  extends EnumControlBase<GpsOutputSentencesControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_output_sentences', 0x005a, gpsOutputSentencesControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_output_sentences = this.validate(nodeIn);
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
class GpsLoggerIntervalControlKnob
  extends EnumControlBase<GpsLoggerIntervalControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_logger_interval', 0x005b, gpsLoggerIntervalControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_logger_interval = this.validate(nodeIn);
  }
}

const gpsEnabledControlKnobEnum = ['off', 'on'] as const;
type GpsEnabledControlKnobEnumType = (typeof gpsEnabledControlKnobEnum)[number];
class GpsEnabledControlKnob
  extends EnumControlBase<GpsEnabledControlKnobEnumType>
  implements ControlKnob
{
  constructor() {
    super('gps_enabled', 0x0050, gpsEnabledControlKnobEnum);
  }
  parse(configOut: PreferenceConfig, nodeIn: Scalar) {
    configOut.gps_enabled = this.validate(nodeIn);
  }
}

const preferenceControlKnobs = [
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
] as const;

export class PreferencesConfig implements ConfigModuleInterface {
  private readonly deviceModel: DeviceModel;
  constructor(deviceModel: DeviceModel) {
    this.deviceModel = deviceModel;
  }
  maybeVisitYamlNode(node: YAMLMap, ctx: YamlContext): boolean {
    const preferencesNode = node.get('preferences');
    if (!preferencesNode) {
      return false;
    }
    if (
      this.deviceModel !== 'HX870' &&
      this.deviceModel !== 'HX890' &&
      this.deviceModel !== 'HX891BT'
    ) {
      throw new YamlError(
        `Unsupported configuration for ${this.deviceModel}`,
        node
      );
    }
    if (!preferencesNode || !(preferencesNode instanceof YAMLMap)) {
      throw new YamlError('Unexpected preferences node type', node);
    }
    ctx.configOut.preferences = {};
    const items = preferencesNode.items;
    for (const item of items) {
      if (item.key instanceof Scalar) {
        const key = item.key.value;
        const value = item.value as Scalar;
        const controlKnob = preferenceControlKnobs.find((c) => c.id === key);
        if (controlKnob) {
          controlKnob.parse(ctx.configOut.preferences, value);
        } else {
          throw new YamlError(`Unknown preference ${item.key.value}`, item.key);
        }
      } else {
        throw new YamlError(
          `Unexpected preference node type ${item.key.value}`,
          item.key
        );
      }
    }
    return true;
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    for (const knob of preferenceControlKnobs) {
      configBatchReader.addRange(knob.id, knob.address, knob.address + 1);
    }
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void {
    config.preferences = {};

    for (const knob of preferenceControlKnobs) {
      const id: PreferenceSettings = knob.id;
      const value = results.get(knob.id);
      if (value) {
        if (value.length === 1) {
          if (knob instanceof NumberControlBase) {
            (config.preferences[id] as number) = value[0];
          } else if (knob instanceof EnumControlBase) {
            (config.preferences[id] as string) = knob.values[value[0]];
          } else if (knob instanceof BooleanControlBase) {
            (config.preferences[id] as boolean) = value[0] === 1;
          }
        }
      }
    }
    const preferencesNode = yaml.createNode({
      preferences: config.preferences
    });
    preferencesNode.spaceBefore = true;
    yaml.add(preferencesNode);
  }
}

export function getPreferenceControlKnob(
  id: PreferenceSettings
): ControlKnob | undefined {
  return preferenceControlKnobs.find((c) => c.id === id);
}

export function writePreference(
  configBatchWriter: ConfigBatchWriter,
  config: PreferenceConfig,
  id: PreferenceSettings
): void {
  const controlKnob = getPreferenceControlKnob(id);
  if (controlKnob) {
    controlKnob.write(configBatchWriter, config);
  }
}
