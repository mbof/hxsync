import {
  WAYPOINT_DEVICE_CONFIGS,
  WaypointDeviceConfig
} from './waypoints';
import {
  ROUTE_DEVICE_CONFIGS,
  RouteDeviceConfig
} from './routes';
import { DSC_DEVICE_CONFIGS, DscDeviceConfig } from './dsc';
import { ChannelGroup } from '../channel-group';
import { MmsiDirectory } from '../mmsi';
import { NavInfoDraft } from '../nav-info-draft';
import { Waypoint } from '../waypoint';

export type DeviceModel = 'HX890' | 'HX870' | 'GX1400';
export const DEVICES: DeviceModel[] = ['HX870', 'HX890', 'GX1400'];
export const GPS_DEVICES: DeviceModel[] = ['HX870', 'HX890'];

export type DatConfig = {
  length: number;
  magic: Uint8Array;
};

export type DeviceConfig = {
  name: DeviceModel;
  usbFilter?: SerialPortFilter;
  waypoints?: WaypointDeviceConfig;
  routes?: RouteDeviceConfig;
  dsc?: DscDeviceConfig;
  dat?: DatConfig;
  hasGps: boolean;
};

export const USB_DEVICE_CONFIGS = new Map<DeviceModel, SerialPortFilter>([
  ['HX890', { usbVendorId: 9898, usbProductId: 30 }],
  ['HX870', { usbVendorId: 9898, usbProductId: 16 }]
]);

export const DAT_DEVICE_CONFIGS = new Map<DeviceModel, DatConfig>([
  [
    'HX890',
    {
      length: 65536,
      magic: new Uint8Array([3, 122])
    }
  ],
  [
    'HX870',
    {
      length: 32768,
      magic: new Uint8Array([3, 103])
    }
  ],
  [
    'GX1400',
    {
      length: 8192,
      magic: new Uint8Array([5, 120])
    }
  ]
]);

export const DEVICE_CONFIGS = new Map(
  DEVICES.map((model) => [
    model,
    {
      name: model,
      usbFilter: USB_DEVICE_CONFIGS.get(model),
      waypoints: WAYPOINT_DEVICE_CONFIGS.get(model),
      routes: ROUTE_DEVICE_CONFIGS.get(model),
      dsc: DSC_DEVICE_CONFIGS.get(model),
      dat: DAT_DEVICE_CONFIGS.get(model),
      hasGps: GPS_DEVICES.includes(model)
    }
  ])
);

export type Config = {
  mmsi?: string;
  waypoints?: Array<Waypoint>;
  draftWaypoints?: NavInfoDraft;
  atis?: string;
  gpslog?: Uint8Array;
  mmsiDirectory?: MmsiDirectory;
  channelGroups?: ChannelGroup[];
};

export type MemoryRangeId =
  | 'individual_mmsi_names'
  | 'individual_mmsi_numbers'
  | 'group_mmsi_names'
  | 'group_mmsi_numbers'
  | 'waypoints'
  | 'routes'
  | 'channel_groups';
