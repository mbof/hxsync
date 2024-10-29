import { ControlKnob, createKnob } from './preferences-base.js';

export const controlKnobsData = [
  {
    id: 'volume',
    address: 0x000c,
    params: {
      type: 'number',
      min: 0,
      max: 15
    }
  },
  {
    id: 'squelch',
    address: 0x000d,
    params: {
      type: 'number',
      min: 0,
      max: 15
    }
  },
  {
    id: 'backlight_dimmer',
    address: 0x0030,
    params: {
      type: 'number',
      min: 0,
      max: 5
    }
  },
  {
    id: 'contrast',
    address: 0x0031,
    params: {
      type: 'number',
      min: 0,
      max: 30
    }
  },
  {
    id: 'key_beep',
    address: 0x0032,
    params: {
      type: 'number',
      min: 0,
      max: 5
    }
  },
  {
    id: 'multi_watch',
    address: 0x0034,
    params: {
      type: 'enum',
      values: ['dual', 'triple']
    }
  },
  {
    id: 'scan_type',
    address: 0x0036,
    params: {
      type: 'enum',
      values: ['memory', 'priority']
    }
  },
  {
    id: 'scan_resume',
    address: 0x0037,
    params: {
      type: 'number',
      min: 1,
      max: 5
    }
  },
  {
    id: 'weather_alert',
    address: 0x0038,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'emergency_led',
    address: 0x003a,
    params: {
      type: 'enum',
      values: ['continuous', 'SOS', 'Blink1', 'Blink2', 'Blink3']
    }
  },
  {
    id: 'water_hazard_led',
    address: 0x003b,
    params: {
      type: 'enum',
      values: ['off', 'on', 'power-on']
    }
  },
  {
    id: 'lamp',
    address: 0x003c,
    params: {
      type: 'enum',
      values: ['off', '3s', '5s', '10s', 'continuous', '20s', '30s']
    }
  },
  {
    id: 'af_pitch',
    address: 0x003d,
    params: {
      type: 'enum',
      values: [
        'normal',
        'high-low-cut',
        'high-low-boost',
        'low-boost',
        'high-boost'
      ]
    }
  },
  {
    id: 'battery_save',
    address: 0x003e,
    params: {
      type: 'enum',
      values: ['off', '50%', '70%', '80%', '90%']
    }
  },
  {
    id: 'vox',
    address: 0x0040,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'vox_level',
    address: 0x0041,
    params: {
      type: 'number',
      min: 0,
      max: 4
    }
  },
  {
    id: 'vox_delay',
    address: 0x0042,
    params: {
      type: 'enum',
      values: ['0.5s', '1.0s', '1.5s', '2.0s', '3.0s']
    }
  },
  {
    id: 'noise_cancel_rx',
    address: 0x0043,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'noise_cancel_rx_level',
    address: 0x0044,
    params: {
      type: 'number',
      min: 0,
      max: 4
    }
  },
  {
    id: 'noise_cancel_tx',
    address: 0x0045,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'nav_display_range',
    address: 0x004a,
    params: {
      type: 'enum',
      values: ['auto', '2M', '5M', '10M', '25M']
    }
  },
  {
    id: 'nav_target_waypoint',
    address: 0x004b,
    params: {
      type: 'number',
      min: 1,
      max: 255
    }
  },
  {
    id: 'nav_arrival_range',
    address: 0x004c,
    params: {
      type: 'enum',
      values: ['0.05M', '0.1M', '0.2M', '0.5M', '1.0M']
    }
  },
  {
    id: 'nav_routing_operation',
    address: 0x004d,
    params: {
      type: 'enum',
      values: ['auto', 'manual']
    }
  },
  {
    id: 'nav_target_route',
    address: 0x004e,
    params: {
      type: 'number',
      min: 1,
      max: 255
    }
  },
  {
    id: 'nav_target_route_point',
    address: 0x004f,
    params: {
      type: 'number',
      min: 1,
      max: 255
    }
  },
  {
    id: 'gps_enabled',
    address: 0x0050,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'gps_power_save',
    address: 0x0051,
    params: {
      type: 'enum',
      values: ['off', 'auto', '50%', '75%', '90%']
    }
  },
  {
    id: 'gps_location_format',
    address: 0x0052,
    params: {
      type: 'enum',
      values: ['DDDMMSS', 'DDDMM.MM', 'DDDMM.MMMM']
    }
  },
  {
    id: 'gps_time_setup',
    address: 0x0053,
    params: {
      type: 'enum',
      values: ['UTC', 'local']
    }
  },
  {
    id: 'speed_units',
    address: 0x0054,
    params: {
      type: 'enum',
      values: ['knots', 'mph', 'km/h']
    }
  },
  {
    id: 'distance_units',
    address: 0x0055,
    params: {
      type: 'enum',
      values: ['nm', 'sm', 'km']
    }
  },
  {
    id: 'altitude_units',
    address: 0x0056,
    params: {
      type: 'enum',
      values: ['ft', 'm']
    }
  },
  {
    id: 'gps_pinning',
    address: 0x0057,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'sbas_enabled',
    address: 0x0058,
    params: {
      type: 'boolean'
    }
  },
  {
    id: 'map_orientation',
    address: 0x0059,
    params: {
      type: 'enum',
      values: ['north-up', 'course-up']
    }
  },
  {
    id: 'gps_output_sentences',
    address: 0x005a,
    params: {
      type: 'enum',
      values: ['GGA', 'GLL', 'RMC', 'VTG', 'GSA', 'GSV', 'ZDA', 'MSK']
    }
  },
  {
    id: 'gps_logger_interval',
    address: 0x005b,
    params: {
      type: 'enum',
      values: ['5s', '15s', '30s', '1min', '5min']
    }
  }
] as const;

export type PreferenceId = (typeof controlKnobsData)[number]['id'];
export const preferenceIds: PreferenceId[] = controlKnobsData.map((c) => c.id);
export type PreferenceConfig = ControlKnob[];
export type PreferenceRangeId = PreferenceId;
export function makePreferenceControlKnobs(): PreferenceConfig {
  return controlKnobsData.map((kd) => createKnob(kd));
}
