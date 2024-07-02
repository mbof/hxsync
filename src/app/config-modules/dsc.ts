import { Document, Node, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { BatchReaderResults, ConfigBatchReader } from '../config-batch-reader';
import { Config } from './device-configs';
import { DeviceModel } from './device-configs';
import {
  MMSI_NAME_BYTE_SIZE,
  Mmsi,
  MmsiDirectory,
  numberOffsetFromIndex
} from '../mmsi';
import { ConfigModuleInterface } from './config-module-interface';
import { ConfigBatchWriter } from '../config-batch-writer';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';

export type DscDeviceConfig = {
  individualNamesAddress: number;
  individualNumbersAddress: number;
  individualNum: number;
  groupNamesAddress: number;
  groupNumbersAddress: number;
  groupNum: number;
};

export const DSC_DEVICE_CONFIGS: Map<DeviceModel, DscDeviceConfig> = new Map([
  [
    'HX890',
    {
      individualNamesAddress: 0x4500,
      individualNumbersAddress: 0x4200,
      individualNum: 100,
      groupNamesAddress: 0x5100,
      groupNumbersAddress: 0x5000,
      groupNum: 20
    }
  ],
  [
    'HX870',
    {
      individualNamesAddress: 0x3730,
      individualNumbersAddress: 0x3500,
      individualNum: 100,
      groupNamesAddress: 0x3e80,
      groupNumbersAddress: 0x3e00,
      groupNum: 20
    }
  ],
  [
    'GX1400',
    {
      individualNamesAddress: 0x940,
      individualNumbersAddress: 0x800,
      individualNum: 60,
      groupNamesAddress: 0xda0,
      groupNumbersAddress: 0xd00,
      groupNum: 30
    }
  ]
]);

export class DscConfig implements ConfigModuleInterface {
  readonly deviceConfig: DscDeviceConfig;
  individualMmsiNamesSize: number;
  individualMmsiNumbersSize: number;
  groupMmsiNamesSize: number;
  groupMmsiNumbersSize: number;
  constructor(deviceModel: DeviceModel) {
    const deviceConfig = DSC_DEVICE_CONFIGS.get(deviceModel);
    if (!deviceConfig) {
      throw new Error(`Unsupported device ${deviceModel}`);
    }
    this.deviceConfig = deviceConfig;
    this.individualMmsiNamesSize =
      MMSI_NAME_BYTE_SIZE * this.deviceConfig.individualNum;
    this.individualMmsiNumbersSize = numberOffsetFromIndex(
      this.deviceConfig.individualNum
    );
    this.groupMmsiNamesSize = MMSI_NAME_BYTE_SIZE * this.deviceConfig.groupNum;
    this.groupMmsiNumbersSize = numberOffsetFromIndex(
      this.deviceConfig.groupNum
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
    const dsc_dir = node.get('individual_directory');
    if (dsc_dir && dsc_dir instanceof YAMLSeq) {
      if (!config.mmsiDirectory) {
        config.mmsiDirectory = new MmsiDirectory(
          this.deviceConfig!.individualNum,
          this.deviceConfig!.groupNum
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
            try {
              return new Mmsi(name, mmsi);
            } catch (e: Error | any) {
              throw new YamlError(e?.message || 'Error parsing MMSI', node.range![0]);
            }
          }
        }
        throw new YamlError(`Unknown node type`, node.range[0]);
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
        this.deviceConfig!.individualNamesAddress,
        individualMmsiNamesData
      );
      configBatchWriter.prepareWrite(
        'individual_mmsi_numbers',
        this.deviceConfig!.individualNumbersAddress,
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
          this.deviceConfig!.individualNum,
          this.deviceConfig!.groupNum
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
        this.deviceConfig!.groupNamesAddress,
        groupMmsiNamesData
      );
      configBatchWriter.prepareWrite(
        'group_mmsi_numbers',
        this.deviceConfig!.groupNumbersAddress,
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
    const individualMmsiNum = this.deviceConfig.individualNum;
    const individualMmsiNamesSize = MMSI_NAME_BYTE_SIZE * individualMmsiNum;
    const individualMmsiNumbersSize = numberOffsetFromIndex(individualMmsiNum);
    const groupMmsiNum = this.deviceConfig.groupNum;
    const groupMmsiNamesSize = MMSI_NAME_BYTE_SIZE * groupMmsiNum;
    const groupMmsiNumbersSize = numberOffsetFromIndex(groupMmsiNum);
    configBatchReader.addRange(
      'individual_mmsi_names',
      this.deviceConfig.individualNamesAddress,
      this.deviceConfig.individualNamesAddress + individualMmsiNamesSize
    );
    configBatchReader.addRange(
      'individual_mmsi_numbers',
      this.deviceConfig.individualNumbersAddress,
      this.deviceConfig.individualNumbersAddress + individualMmsiNumbersSize
    );
    configBatchReader.addRange(
      'group_mmsi_names',
      this.deviceConfig.groupNamesAddress,
      this.deviceConfig.groupNamesAddress + groupMmsiNamesSize
    );
    configBatchReader.addRange(
      'group_mmsi_numbers',
      this.deviceConfig.groupNumbersAddress,
      this.deviceConfig.groupNumbersAddress + groupMmsiNumbersSize
    );
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ) {
    const mmsiDirectory = new MmsiDirectory(
      this.deviceConfig!.individualNum,
      this.deviceConfig!.groupNum
    );
    mmsiDirectory.initFromConfig(
      results.get('individual_mmsi_names')!,
      results.get('individual_mmsi_numbers')!,
      results.get('group_mmsi_names')!,
      results.get('group_mmsi_numbers')!
    );
    config.mmsiDirectory = mmsiDirectory;
    const individual_directory = mmsiDirectory.individualMmsis.map((mmsi) => ({
      [mmsi.name]: mmsi.number
    }));
    const dsc = yaml.createNode({ individual_directory });
    dsc.spaceBefore = true;
    yaml.add(dsc);

    const group_directory = mmsiDirectory.groupMmsis.map((mmsi) => ({
      [mmsi.name]: mmsi.number
    }));
    const group = yaml.createNode({ group_directory });
    group.spaceBefore = true;
    yaml.add(group);
  }
}
