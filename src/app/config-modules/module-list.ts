import { ConfigModuleConstructor } from './config-module-interface';
import { DscConfig } from './dsc';
import { WaypointConfig } from './waypoints';

export const CONFIG_MODULE_CONSTRUCTORS: ConfigModuleConstructor[] = [
  DscConfig,
  WaypointConfig
];
