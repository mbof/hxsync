import { ChannelGroupConfig } from './channel-groups';
import { ChannelConfig } from './channels';
import { ConfigModuleConstructor } from './config-module-interface';
import { DscConfig } from './dsc';
import { RouteConfig } from './routes';
import { WaypointConfig } from './waypoints';

export const CONFIG_MODULE_CONSTRUCTORS: ConfigModuleConstructor[] = [
  DscConfig,
  WaypointConfig,
  RouteConfig,
  ChannelGroupConfig,
  ChannelConfig
];
