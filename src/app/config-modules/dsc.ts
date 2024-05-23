import { Document, Node, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { BatchReaderResults, ConfigBatchReader } from '../config-batch-reader';
import { Config } from '../config-session';
import { DeviceModel } from '../devicemgr.service';
import {
  MMSI_NAME_BYTE_SIZE,
  Mmsi,
  MmsiDirectory,
  numberOffsetFromIndex
} from '../mmsi';
import { ConfigModuleInterface } from './config-module-interface';
import { ConfigBatchWriter } from '../config-batch-writer';

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

export class DscConfig implements ConfigModuleInterface {
  readonly deviceConfig: DscDeviceConfig;
  individualMmsiNamesSize: number;
  individualMmsiNumbersSize: number;
  groupMmsiNamesSize: number;
  groupMmsiNumbersSize: number;
  constructor(deviceModel: DeviceModel) {
    const deviceConfig = CONFIGS.find((c) => c.name == deviceModel);
    if (!deviceConfig) {
      throw new Error(`Unsupported device ${deviceModel}`);
    }
    this.deviceConfig = deviceConfig;
    this.individualMmsiNamesSize =
      MMSI_NAME_BYTE_SIZE * this.deviceConfig.individualMmsiNum;
    this.individualMmsiNumbersSize = numberOffsetFromIndex(
      this.deviceConfig.individualMmsiNum
    );
    this.groupMmsiNamesSize =
      MMSI_NAME_BYTE_SIZE * this.deviceConfig.groupMmsiNum;
    this.groupMmsiNumbersSize = numberOffsetFromIndex(
      this.deviceConfig.groupMmsiNum
    );
  }
  // Smells:
  // - the individual and group directories may be split into two modules.
  // - not sure we need the MmsiDirectory structure.
  maybeVisitYamlNode(
    node: YAMLMap,
    configBatchWriter: ConfigBatchWriter,
    config: Config
  ): boolean {
    return (
      this.maybeVisitYamlNodeIndividual(node, configBatchWriter, config) ||
      this.maybeVisitYamlNodeGroup(node, configBatchWriter, config)
    );
  }
  maybeVisitYamlNodeIndividual(
    node: YAMLMap,
    configBatchWriter: ConfigBatchWriter,
    config: Config
  ): boolean {
    const dsc_dir = node.get('dsc_directory');
    if (dsc_dir && dsc_dir instanceof YAMLSeq) {
      if (!config.mmsiDirectory) {
        config.mmsiDirectory = new MmsiDirectory(
          this.deviceConfig!.individualMmsiNum,
          this.deviceConfig!.groupMmsiNum
        );
      }
      config.mmsiDirectory.individualMmsis = dsc_dir.items.map((node) => {
        if (
          node instanceof YAMLMap &&
          node.items.length == 1 &&
          node.items[0].key instanceof Scalar &&
          node.items[0].value instanceof Scalar
        ) {
          const name = node.items[0].key.value;
          const mmsi = node.items[0].value.value;
          if (typeof name == 'string' && typeof mmsi == 'string') {
            return new Mmsi(name, mmsi);
          }
        }
        throw new Error(`Unknown node type at ${node.range[0]}`);
      });
      const individualMmsiNamesData = new Uint8Array(
        this.individualMmsiNamesSize
      );
      const individualMmsiNumbersData = new Uint8Array(
        this.individualMmsiNumbersSize
      );
      config.mmsiDirectory.fillIndividualConfig(
        individualMmsiNamesData,
        individualMmsiNumbersData
      );
      configBatchWriter.prepareWrite(
        'individual_mmsi_names',
        this.deviceConfig!.individualMmsiNamesAddress,
        individualMmsiNamesData
      );
      configBatchWriter.prepareWrite(
        'individual_mmsi_numbers',
        this.deviceConfig!.individualMmsiNumbersAddress,
        individualMmsiNumbersData
      );
      return true;
    }
    return false;
  }
  maybeVisitYamlNodeGroup(
    node: YAMLMap,
    configBatchWriter: ConfigBatchWriter,
    config: Config
  ): boolean {
    const group_dir = node.get('group_directory');
    if (group_dir && group_dir instanceof YAMLSeq) {
      if (!config.mmsiDirectory) {
        config.mmsiDirectory = new MmsiDirectory(
          this.deviceConfig!.individualMmsiNum,
          this.deviceConfig!.groupMmsiNum
        );
      }
      config.mmsiDirectory.groupMmsis = group_dir.items.map((node) => {
        if (
          node instanceof YAMLMap &&
          node.items.length == 1 &&
          node.items[0].key instanceof Scalar &&
          node.items[0].value instanceof Scalar
        ) {
          const name = node.items[0].key.value;
          const mmsi = node.items[0].value.value;
          if (typeof name == 'string' && typeof mmsi == 'string') {
            return new Mmsi(name, mmsi);
          }
        }
        throw new Error(`Unknown node type at ${node.range[0]}`);
      });
      const groupMmsiNamesData = new Uint8Array(this.groupMmsiNamesSize);
      const groupMmsiNumbersData = new Uint8Array(this.groupMmsiNumbersSize);
      config.mmsiDirectory.fillGroupConfig(
        groupMmsiNamesData,
        groupMmsiNumbersData
      );
      configBatchWriter.prepareWrite(
        'group_mmsi_names',
        this.deviceConfig!.groupMmsiNamesAddress,
        groupMmsiNamesData
      );
      configBatchWriter.prepareWrite(
        'group_mmsi_numbers',
        this.deviceConfig!.groupMmsiNumbersAddress,
        groupMmsiNumbersData
      );
      return true;
    }
    return false;
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
      this.deviceConfig.individualMmsiNamesAddress + individualMmsiNamesSize
    );
    configBatchReader.addRange(
      'individual_mmsi_numbers',
      this.deviceConfig.individualMmsiNumbersAddress,
      this.deviceConfig.individualMmsiNumbersAddress + individualMmsiNumbersSize
    );
    configBatchReader.addRange(
      'group_mmsi_names',
      this.deviceConfig.groupMmsiNamesAddress,
      this.deviceConfig.groupMmsiNamesAddress + groupMmsiNamesSize
    );
    configBatchReader.addRange(
      'group_mmsi_numbers',
      this.deviceConfig.groupMmsiNumbersAddress,
      this.deviceConfig.groupMmsiNumbersAddress + groupMmsiNumbersSize
    );
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ) {
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
    const dsc_directory = mmsiDirectory.individualMmsis.map((mmsi) => ({
      [mmsi.name]: mmsi.number
    }));
    const dsc = yaml.createNode({ dsc_directory });
    dsc.commentBefore =
      ' DSC directory for individual calls. Wrap MMSIs in quotes.\n' +
      ' Example:\n' +
      ' - dsc_directory:\n' +
      '     - Alpha: "123456789"\n' +
      '     - Bravo: "987654321"';
    dsc.spaceBefore = true;
    yaml.add(dsc);

    const group_directory = mmsiDirectory.groupMmsis.map((mmsi) => ({
      [mmsi.name]: mmsi.number
    }));
    const group = yaml.createNode({ group_directory });
    group.commentBefore =
      ' DSC directory for group calls. Wrap MMSIs in quotes.\n' +
      ' Example:\n' +
      ' - group_directory:\n' +
      '     - Golf: "012345678"\n' +
      '     - Foxtrot: "098765432"';
    group.spaceBefore = true;
    yaml.add(group);
  }
}
