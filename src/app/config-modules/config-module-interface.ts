import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { Config } from './device-configs';
import { DeviceModel } from './device-configs';
import { Document, Node, YAMLMap } from 'yaml';

export interface ConfigModuleConstructor {
  new (deviceModel: DeviceModel): ConfigModuleInterface;
}

export type YamlContext = {
  configBatchWriter: ConfigBatchWriter;
  configOut: Config;
  previousConfig: Config;
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
