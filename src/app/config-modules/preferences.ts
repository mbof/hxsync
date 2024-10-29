import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { ConfigModuleInterface, YamlContext } from './config-module-interface';
import { Config, DeviceModel } from './device-configs';
import { Document, Node, Scalar, YAMLMap } from 'yaml';
import { controlKnobsData, makePreferenceControlKnobs, preferenceIds } from './preferences-knobs';

export class PreferencesConfig implements ConfigModuleInterface {
  private readonly deviceModel: DeviceModel;
  constructor(deviceModel: DeviceModel) {
    this.deviceModel = deviceModel;
  }
  maybeVisitYamlNode(node: YAMLMap, ctx: YamlContext): boolean {
    const preferencesNode = node.get('preferences');
    if (!preferencesNode) {
      return false;
    }
    if (
      this.deviceModel !== 'HX870' &&
      this.deviceModel !== 'HX890' &&
      this.deviceModel !== 'HX891BT'
    ) {
      throw new YamlError(
        `Unsupported configuration for ${this.deviceModel}`,
        node
      );
    }
    if (!preferencesNode || !(preferencesNode instanceof YAMLMap)) {
      throw new YamlError('Unexpected preferences node type', node);
    }
    ctx.configOut.preferences = makePreferenceControlKnobs();
    const items = preferencesNode.items;
    for (const item of items) {
      if (item.key instanceof Scalar) {
        const key = item.key.value;
        const value = item.value as Scalar;
        const controlKnob = ctx.configOut.preferences.find((c) => c.id === key);
        if (controlKnob) {
          controlKnob.parse(value);
          controlKnob.write(ctx.configBatchWriter);
        } else {
          throw new YamlError(`Unknown preference ${item.key.value}`, item.key);
        }
      } else {
        throw new YamlError(
          `Unexpected preference node type ${item.key.value}`,
          item.key
        );
      }
    }
    return true;
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    for (const preference of controlKnobsData) {
      configBatchReader.addRange(
        preference.id,
        preference.address,
        preference.address + 1
      );
    }
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void {
    if (
      this.deviceModel !== 'HX870' &&
      this.deviceModel !== 'HX890' &&
      this.deviceModel !== 'HX891BT'
    ) {
      return;
    }
    config.preferences = makePreferenceControlKnobs();
    const preferencesMap = yaml.createNode({});
    for (const knob of config.preferences) {
      const valueData = results.get(knob.id);
      if (valueData) {
        knob.read(valueData);
        knob.maybeAddNode(preferencesMap);
      }
    }
    const preferencesNode = yaml.createNode({
      preferences: preferencesMap
    });
    preferencesNode.spaceBefore = true;
    yaml.add(preferencesNode);
  }
}
