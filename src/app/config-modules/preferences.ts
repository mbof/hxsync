import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import {
  ConfigModuleInterface,
  YamlContext,
  YamlDiagnostics
} from './config-module-interface';
import { Config, DeviceModel } from './device-configs';
import { Document, Node, Scalar, YAMLMap } from 'yaml';
import {
  controlKnobsData,
  makePreferenceControlKnobs,
  preferenceIds
} from './preferences-knobs';
import {
  ControlKnob,
  EnumControlBase,
  NumberControlBase
} from './preferences-base';
import { NodeBase } from 'yaml/dist/nodes/Node';

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
          maybeAddDiagnostics(ctx, controlKnob, value);
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

function maybeAddDiagnostics(
  ctx: YamlContext,
  controlKnob: ControlKnob,
  node: NodeBase
) {
  if (!ctx.diagnosticsLog) {
    ctx.diagnosticsLog = {};
  }
  const diagnosticsLog = ctx.diagnosticsLog;
  if (!diagnosticsLog.warnings) {
    diagnosticsLog.warnings = [];
  }
  const warnings = diagnosticsLog.warnings;
  if (
    controlKnob instanceof NumberControlBase &&
    controlKnob.id === 'volume' &&
    controlKnob.value == 0
  ) {
    warnings.push({
      message: 'Volume is 0; increase to hear transmissions',
      range: node.range
    });
  } else if (
    controlKnob instanceof NumberControlBase &&
    controlKnob.id === 'squelch' &&
    controlKnob.value !== undefined &&
    controlKnob.value >= 14
  ) {
    warnings.push({
      message:
        'Squelch is high; consider decreasing to avoid missing transmissions',
      range: node.range
    });
  } else if (
    controlKnob instanceof EnumControlBase &&
    controlKnob.id === 'gps_enabled'
  ) {
    switch (controlKnob.value) {
      case 'off':
        warnings.push({
          message:
            'GPS is disabled; consider enabling to make location easier in an emergency',
          range: node.range
        });
        break;
      case 'always':
        warnings.push({
          message:
            'GPS is always on, which will drain battery even when the device is off',
          range: node.range
        });
        break;
    }
  }
}
