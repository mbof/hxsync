import { Document, Node } from 'yaml';
import { BatchReaderResults, ConfigBatchReader } from '../config-batch-reader';
import { Config } from '../config-session';
import {DeviceModel} from '../devicemgr.service';
import { MMSI_NAME_BYTE_SIZE, Mmsi, MmsiDirectory, numberOffsetFromIndex } from '../mmsi';

type DscDeviceConfig = {
  name: DeviceModel;
  individualMmsiNamesAddress: number;
  individualMmsiNumbersAddress: number;
  individualMmsiNum: number;
  groupMmsiNamesAddress: number;
  groupMmsiNumbersAddress: number;
  groupMmsiNum: number;
};

const CONFIGS: DscDeviceConfig[] = [
  {
    name: 'HX890',
    individualMmsiNamesAddress: 0x4500,
    individualMmsiNumbersAddress: 0x4200,
    individualMmsiNum: 100,
    groupMmsiNamesAddress: 0x5100,
    groupMmsiNumbersAddress: 0x5000,
    groupMmsiNum: 20
  },
  {
    name: 'HX870',
    individualMmsiNamesAddress: 0x3730,
    individualMmsiNumbersAddress: 0x3500,
    individualMmsiNum: 100,
    groupMmsiNamesAddress: 0x3e80,
    groupMmsiNumbersAddress: 0x3e00,
    groupMmsiNum: 20
  }
];

export class DscConfig {
  readonly deviceConfig?: DscDeviceConfig;
  constructor (deviceModel: DeviceModel) {
    this.deviceConfig = CONFIGS.find((c) => c.name == deviceModel);
  }
  addRangesToRead(configBatchReader: ConfigBatchReader) {
    if (!this.deviceConfig) {
      return;
    }
    const individualMmsiNum = this.deviceConfig.individualMmsiNum;
    const individualMmsiNamesSize = MMSI_NAME_BYTE_SIZE * individualMmsiNum;
    const individualMmsiNumbersSize = numberOffsetFromIndex(individualMmsiNum);
    const groupMmsiNum = this.deviceConfig.groupMmsiNum;
    const groupMmsiNamesSize = MMSI_NAME_BYTE_SIZE * groupMmsiNum;
    const groupMmsiNumbersSize = numberOffsetFromIndex(groupMmsiNum);
    configBatchReader.addRange(
      'individual_mmsi_names',
      this.deviceConfig.individualMmsiNamesAddress,
      individualMmsiNamesSize
    );
    configBatchReader.addRange(
      'individual_mmsi_numbers',
      this.deviceConfig.individualMmsiNumbersAddress,
      individualMmsiNumbersSize
    );
    configBatchReader.addRange(
      'group_mmsi_names',
      this.deviceConfig.groupMmsiNamesAddress,
      groupMmsiNamesSize
    );
    configBatchReader.addRange(
      'individual_mmsi_numbers',
      this.deviceConfig.groupMmsiNumbersAddress,
      groupMmsiNumbersSize
    );
  }
  updateConfig(results: BatchReaderResults, config: Config, yaml: Document<Node, true>) {
    const mmsiDirectory = new MmsiDirectory(
      this.deviceConfig!.individualMmsiNum,
      this.deviceConfig!.groupMmsiNum
    );
    mmsiDirectory.initFromConfig(
      results.get('individual_mmsi_names')!,
      results.get('individual_mmsi_numbers')!,
      results.get('group_mmsi_names')!,
      results.get('group_mmsi_numbers')!
    );
    config.mmsiDirectory = mmsiDirectory;

    const dsc_directory = new Map<string, string>();
    for (const [index, mmsi] of mmsiDirectory.individualMmsis.entries()) {
      let name = mmsi.name;
      if (mmsiDirectory.individualMmsis.find((mmsi2, index2) => index2 != index && mmsi2.name == mmsi.name)) {
        // There's a duplicate MMSI name. Let's give them disambiguating names.
        name = `${name} [${index}]`;
      }
      dsc_directory.set(name, mmsi.number);
    }
    const dsc = yaml.createNode(dsc_directory);
    yaml.add(dsc);

    const group_directory = new Map<string, string>();
    for (const [index, mmsi] of mmsiDirectory.groupMmsis.entries()) {
      let name = mmsi.name;
      if (mmsiDirectory.groupMmsis.find((mmsi2, index2) => index2 != index && mmsi2.name == mmsi.name)) {
        // There's a duplicate MMSI name. Let's give them disambiguating names.
        name = `${name} [${index}]`;
      }
      group_directory.set(name, mmsi.number);
    }
    const group = yaml.createNode(group_directory);
    yaml.add(group);
  }
}
