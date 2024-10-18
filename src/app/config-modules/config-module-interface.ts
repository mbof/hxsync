import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { Config } from './device-configs';
import { DeviceModel } from './device-configs';
import { Document, Node, YAMLMap } from 'yaml';

export interface ConfigModuleConstructor {
  new (deviceModel: DeviceModel): ConfigModuleInterface;
}

export type YamlDiagnostics = {
  dsc_individual?: {
    used: number;
    remaining: number;
  };
  dsc_group?: {
    used: number;
    remaining: number;
  };
  waypoints?: {
    used: number;
    remaining: number;
  };
  routes?: {
    used: number;
    remaining: number;
  };
};

export type YamlContext = {
  configBatchWriter: ConfigBatchWriter;
  configOut: Config;
  previousConfig: Config;
  diagnosticsLog?: YamlDiagnostics;
};

export interface ConfigModuleInterface {
  maybeVisitYamlNode(node: YAMLMap, context: YamlContext): boolean;
  addRangesToRead(configBatchReader: ConfigBatchReader): void;
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void;
}
