import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { Config } from '../config-session';
import { DeviceModel } from '../devicemgr.service';
import { Document, Node, YAMLMap } from 'yaml';

export interface ConfigModuleConstructor {
  new (deviceModel: DeviceModel): ConfigModuleInterface;
}

export interface ConfigModuleInterface {
  maybeVisitYamlNode(
    node: YAMLMap,
    configBatchWriter: ConfigBatchWriter,
    config: Config
  ): boolean;
  addRangesToRead(configBatchReader: ConfigBatchReader): void;
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void;
}