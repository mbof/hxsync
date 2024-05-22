import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { Config } from '../config-session';
import { DeviceModel } from '../devicemgr.service';
import { Document, Node } from 'yaml';

export interface ConfigModuleConstructor {
  new (deviceModel: DeviceModel): ConfigModuleInterface;
}

export interface ConfigModuleInterface {
  addRangesToRead(configBatchReader: ConfigBatchReader): void;
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void;
}
