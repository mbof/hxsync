import { ConfigModuleInterface, YamlContext } from './config-module-interface';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { Config, DeviceModel } from './device-configs';
import { Document, Node, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import {
  badChars,
  fillPaddedString,
  readPaddedString,
  stringCompare
} from '../util';

const FM_PRESETS_START = 0x0500;
const FM_PRESETS_NUM_PRESETS = 20;
const FM_PRESETS_SIZE = 16;
const FM_SUPPORTED_MODELS: DeviceModel[] = ['HX890', 'HX891BT'];

export type FmPresetConfig = {
  name: string;
  mhz: number; // up to 1 decimal place
};

export class FmConfig implements ConfigModuleInterface {
  private deviceModel: DeviceModel;

  constructor(deviceModel: DeviceModel) {
    this.deviceModel = deviceModel;
  }

  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    if (FM_SUPPORTED_MODELS.includes(this.deviceModel)) {
      configBatchReader.addRange(
        'fm_presets',
        FM_PRESETS_START,
        FM_PRESETS_START + FM_PRESETS_NUM_PRESETS * FM_PRESETS_SIZE
      );
    }
  }

  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void {
    if (!FM_SUPPORTED_MODELS.includes(this.deviceModel)) {
      return;
    }
    const fmPresets = results.get('fm_presets');
    if (!fmPresets) {
      throw new Error('Missing FM presets data in results');
    }
    const presets: FmPresetConfig[] = [];
    for (let i = 0; i < FM_PRESETS_NUM_PRESETS; i++) {
      const offset = i * FM_PRESETS_SIZE;
      const preset = fmPresets.subarray(offset, offset + 16);
      const active = preset[0] === 1;
      if (active) {
        const mhz =
          (preset[1] >> 4) * 100 + (preset[1] & 0xf) * 10 + (preset[2] >> 4);
        const khz =
          (preset[2] & 0xf) * 100 + (preset[3] >> 4) * 10 + (preset[3] & 0xf);
        const name = readPaddedString(preset.subarray(4, 16));
        presets.push({ name, mhz: mhz + khz * 0.001 });
      }
    }
    presets.sort((a, b) => stringCompare(a.name, b.name));
    config.fmPresets = presets;

    const fmPresetsNode = yaml.createNode({
      fm_presets: presets.map((p) => {
        return { [p.name]: p.mhz };
      })
    });
    fmPresetsNode.spaceBefore = true;
    yaml.add(fmPresetsNode);
  }

  maybeVisitYamlNode(node: YAMLMap, context: YamlContext): boolean {
    const fmPresetsNode = node.get('fm_presets');
    if (!fmPresetsNode) {
      return false;
    }
    if (!(fmPresetsNode instanceof YAMLSeq)) {
      throw new YamlError(
        'FM presets should be a sequence of items like "- Station name: 123.4 MHz"',
        node
      );
    }
    if (!FM_SUPPORTED_MODELS.includes(this.deviceModel)) {
      throw new YamlError(
        `FM presets are not supported on ${this.deviceModel}`,
        fmPresetsNode
      );
    }
    if (fmPresetsNode.items.length > FM_PRESETS_NUM_PRESETS) {
      throw new YamlError(
        `Too many FM presets, max is ${FM_PRESETS_NUM_PRESETS}`,
        fmPresetsNode
      );
    }
    const fmPresetData = new Uint8Array(
      FM_PRESETS_NUM_PRESETS * FM_PRESETS_SIZE
    );
    fmPresetData.fill(0xff);
    const fmPresets: FmPresetConfig[] = [];
    for (const preset of fmPresetsNode.items) {
      if (!(preset instanceof YAMLMap)) {
        throw new YamlError(
          'Each FM preset should be like "- Station name: 123.4 MHz"',
          preset
        );
      }
      const keys = preset.items;
      if (keys.length !== 1) {
        throw new YamlError(
          'Each FM preset should be like "- Station name: 123.4 MHz"',
          preset
        );
      }
      const name = keys[0].key;
      if (!(name instanceof Scalar) || typeof name.value !== 'string') {
        throw new YamlError('FM preset name should be a string', preset);
      }
      const value = keys[0].value;
      if (!(value instanceof Scalar) || typeof value.value !== 'number') {
        throw new YamlError(
          'FM preset value should be a number of MHz like "103.4"',
          preset
        );
      }
      const mhz = Math.floor(value.value);
      const khz = Math.round((value.value * 1000) % 1000);
      if (mhz < 65 || mhz > 108) {
        throw new YamlError(
          'FM frequency should be between 65 and 108.9 MHz',
          preset
        );
      }
      if (khz % 100 !== 0) {
        throw new YamlError(
          'FM frequency can only be set to the nearest 0.1 MHz',
          preset
        );
      }
      if (name.value.length > 12) {
        throw new YamlError(
          'FM preset name should be 12 characters or less',
          name
        );
      }
      const maybeBadChars = badChars(name.value);
      if (maybeBadChars) {
        throw new YamlError(
          `FM preset name contains invalid characters: ${maybeBadChars}`,
          name
        );
      }
      fmPresets.push({ name: name.value, mhz: mhz + khz * 0.001 });
    }
    fmPresets.sort((a, b) => stringCompare(a.name, b.name));
    for (let i = 0; i < fmPresets.length; i++) {
      const { name, mhz } = fmPresets[i];
      const khz = Math.round((mhz * 1000) % 1000);
      const offset = i * FM_PRESETS_SIZE;
      fmPresetData[offset] = 1;
      fmPresetData[offset + 1] =
        ((Math.floor(mhz / 100) & 0xf) << 4) |
        (Math.floor((mhz % 100) / 10) & 0xf);
      fmPresetData[offset + 2] =
        (mhz % 10 << 4) | (Math.floor(khz / 100) & 0xf);
      fmPresetData[offset + 3] =
        ((Math.floor((khz % 100) / 10) & 0xf) << 4) | khz % 10;
      fillPaddedString(fmPresetData.subarray(offset + 4, offset + 16), name);
    }
    context.configOut.fmPresets = fmPresets;
    context.configBatchWriter.prepareWrite(
      'fm_presets',
      FM_PRESETS_START,
      fmPresetData
    );
    return true;
  }
}
