import { ControlKnob, createKnob } from './preferences-base';

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
    id: 'backlight_timer',
    address: 0x003c,
    params: {
      type: 'enum',
      values: ['off', '3 sec', '5 sec', '10 sec', 'continuous', '20 sec', '30 sec']
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
    address: 0x0004,
    params: {
      type: 'enum',
      values: ['off', 'multi', 'scan']
    }
  },
  {
    id: 'multi_watch_type',
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
      values: ['continuous', 'SOS', 'blink1', 'blink2', 'blink3']
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
    id: 'audio_filter',
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
      values: ['0.5 sec', '1.0 sec', '1.5 sec', '2.0 sec', '3.0 sec']
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
      max: 3
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
      values: ['auto', 2, 5, 10, 25]
    }
  },
  {
    id: 'nav_arrival_range',
    address: 0x004c,
    params: {
      type: 'enum',
      values: [0.05, 0.1, 0.2, 0.5, 1]
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
    id: 'gps_enabled',
    address: 0x0050,
    params: {
      type: 'enum',
      values: ['off', 'yes', 'always']
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
    id: 'speed_units',
    address: 0x0054,
    params: {
      type: 'enum',
      values: ['kn', 'mph', 'km/h']
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
    id: 'gps_logger_interval',
    address: 0x005b,
    params: {
      type: 'enum',
      values: ['5 sec', '15 sec', '30 sec', '1 min', '5 min']
    }
  },
  {
    id: 'dsc_no_action_timer',
    address: 0x00c8,
    params: {
      type: 'enum',
      values: ['1 min', '3 min', '5 min', '10 min', '15 min']
    }
  },
  {
    id: 'dsc_channel_switch_timer',
    address: 0x00c9,
    params: {
      type: 'enum',
      values: ['off', '10 sec', '30 sec', '60 sec', '120 sec']
    }
  },
  {
    id: 'dsc_pos_fix_wait',
    address: 0x00ca,
    params: {
      type: 'enum',
      values: ['15 sec', '30 sec', '60 sec', '90 sec', '120 sec']
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
