import { Scalar, YAMLMap, YAMLSeq, Document, Node } from 'yaml';
import { ConfigBatchWriter } from '../config-batch-writer';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { PreferenceId } from './preferences-knobs';
import { DeviceModel } from './device-configs';

export type ControlKnobData = {
  readonly id: PreferenceId;
  readonly address: number;
  readonly params:
    | {
        readonly type: 'number';
        readonly min: number;
        readonly max: number;
      }
    | {
        readonly type: 'enum';
        readonly values: readonly (string | number)[];
        readonly base?: number;
      }
    | {
        readonly type: 'boolean';
      }
    | {
        readonly type: 'soft_key_page';
      }
    | {
        readonly type: 'auto_individual_reply';
      };
};

export interface ControlKnob {
  id: PreferenceId;
  address: number;
  parse(nodeIn: Scalar | YAMLSeq): void;
  read(data: Uint8Array): void;
  maybeAddNode(yaml: YAMLMap, yamlDoc: Document<Node, true>): void;
  write(
    configBatchWriter: ConfigBatchWriter,
    previousControlKnob?: ControlKnob
  ): void;
}

export class NumberControlBase implements ControlKnob {
  readonly id: PreferenceId;
  readonly address: number;
  readonly min: number;
  readonly max: number;
  value?: number;

  constructor(id: PreferenceId, address: number, min: number, max: number) {
    this.id = id;
    this.address = address;
    this.min = min;
    this.max = max;
  }

  parse(nodeIn: Scalar | YAMLSeq) {
    if (!(nodeIn instanceof Scalar) || typeof nodeIn.value != 'number') {
      throw new YamlError(`${this.id} must be a number`, nodeIn);
    }
    if (nodeIn.value < this.min || nodeIn.value > this.max) {
      throw new YamlError(
        `${this.id} must be between ${this.min} and ${this.max}`,
        nodeIn
      );
    }
    this.value = nodeIn.value;
  }

  read(data: Uint8Array) {
    if (data.length > 0) {
      this.value = data[0];
    }
  }

  maybeAddNode(yaml: YAMLMap, _yamlDoc: Document<Node, true>) {
    if (
      this.value !== undefined &&
      this.value >= this.min &&
      this.value <= this.max
    ) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(
    configBatchWriter: ConfigBatchWriter,
    _previousControlKnob?: ControlKnob
  ) {
    if (this.value !== undefined) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([this.value])
      );
    }
  }
}
export class EnumControlBase implements ControlKnob {
  value?: string | number;
  valueIndex?: number;

  constructor(
    readonly id: PreferenceId,
    readonly address: number,
    readonly values: readonly (string | number)[],
    readonly base: number
  ) {}

  parse(nodeIn: Scalar | YAMLSeq): void {
    if (!(nodeIn instanceof Scalar)) {
      throw new YamlError(
        `${this.id} must be in [${this.values.join(', ')}]`,
        nodeIn
      );
    }
    let valueIndex;
    if (
      !['string', 'number'].includes(typeof nodeIn.value) ||
      (valueIndex = this.values.findIndex((v) => v === nodeIn.value)) == -1
    ) {
      throw new YamlError(
        `${this.id} must be in [${this.values.join(', ')}]`,
        nodeIn
      );
    }
    this.valueIndex = valueIndex;
    this.value = this.values[valueIndex];
  }

  read(data: Uint8Array) {
    if (data.length == 0) {
      this.valueIndex = undefined;
      this.value = undefined;
      return;
    }
    this.valueIndex = data[0] - this.base;
    if (this.valueIndex >= 0 && this.valueIndex < this.values.length) {
      this.value = this.values[this.valueIndex];
    }
  }

  maybeAddNode(yaml: YAMLMap, _yamlDoc: Document<Node, true>) {
    if (this.value !== undefined) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(
    configBatchWriter: ConfigBatchWriter,
    _previousControlKnob?: ControlKnob
  ) {
    if (this.valueIndex !== undefined) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([this.valueIndex + this.base])
      );
    }
  }
}
export class BooleanControlBase implements ControlKnob {
  value?: boolean;
  constructor(
    readonly id: PreferenceId,
    readonly address: number
  ) {}

  parse(nodeIn: Scalar): void {
    if (typeof nodeIn.value != 'boolean') {
      throw new YamlError(`${this.id} must be a boolean`, nodeIn);
    }
    this.value = nodeIn.value;
  }

  read(data: Uint8Array) {
    if (data.length == 0) {
      this.value = undefined;
    } else {
      this.value = !!data[0];
    }
  }

  maybeAddNode(yaml: YAMLMap, _yamlDoc: Document<Node, true>) {
    if (this.value !== undefined) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(
    configBatchWriter: ConfigBatchWriter,
    _previousControlKnob?: ControlKnob
  ) {
    if (this.value !== undefined) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([this.value ? 1 : 0])
      );
    }
  }
}

const softKeys = [
  'none', // 00
  'tx_power', // 01
  'wx_or_ch', // 02
  'scan', // 03
  'dual_watch', // 04
  'mark', // 05
  'compass', // 06
  'waypoint', // 07
  'mob', // 08
  'scan_mem', // 09
  'preset', // 0a
  'strobe', // 0b
  'ch_name', // 0c
  'logger', // 0d
  'noise_canceling', // 0e
  'fm', // 0f
  'night_or_day' // 10
] as const;

type softKey = (typeof softKeys)[number];

const getSoftKeyIndex = (softKeyName: string) =>
  softKeys.findIndex((v) => v === softKeyName);

export class SoftKeyPageControlBase implements ControlKnob {
  value?: softKey[];

  constructor(
    readonly id: PreferenceId,
    readonly address: number,
    readonly deviceModel: DeviceModel
  ) {}

  parse(nodeIn: Scalar | YAMLSeq): void {
    if (!(nodeIn instanceof YAMLSeq) || nodeIn.items.length != 3) {
      throw new YamlError(
        `${this.id} must be a list of three items in [${softKeys.join(', ')}]`,
        nodeIn
      );
    }
    this.value = [];

    for (const item of nodeIn.items) {
      if (!(item instanceof Scalar) || typeof item.value !== 'string') {
        throw new YamlError(
          `${this.id} must be a list of three items in [${softKeys.join(', ')}]`,
          nodeIn
        );
      }
      let valueIndex = getSoftKeyIndex(item.value);
      if (valueIndex === -1) {
        throw new YamlError(
          `Unknown ${this.id} item '${item.value}'. Values must be in [${softKeys.join(', ')}]`,
          item
        );
      }
      this.value.push(softKeys[valueIndex]);
    }
  }

  read(data: Uint8Array) {
    this.value = [];
    for (const byte of data) {
      let newValue: softKey = 'none';
      if (byte < softKeys.length) {
        newValue = softKeys[byte];
      }
      this.value.push(newValue);
    }
  }

  maybeAddNode(yaml: YAMLMap, yamlDoc: Document<Node, true>) {
    if (this.value !== undefined) {
      const softKeyListNode = yamlDoc.createNode(this.value);
      softKeyListNode.flow = true;
      yaml.add({ key: this.id, value: softKeyListNode });
    }
  }
  write(
    configBatchWriter: ConfigBatchWriter,
    _previousControlKnob?: ControlKnob
  ) {
    if (this.value !== undefined) {
      const data = new Uint8Array(3);
      for (let i = 0; i < 3; i++) {
        let softKeyIndex = getSoftKeyIndex(this.value[i]);
        if (this.deviceModel === 'HX870' && softKeyIndex > 0x0e) {
          softKeyIndex = 0; // None
        }
        data[i] = softKeyIndex;
      }
      configBatchWriter.prepareWrite(this.id, this.address, data);
    }
  }
}

const autoIndividualReplyValues = ['off', 'able', 'unable'] as const;
type AutoIndividualReplyValue = (typeof autoIndividualReplyValues)[number];

export class AutoIndividualReplyControlBase implements ControlKnob {
  value?: AutoIndividualReplyValue;
  rawValue?: number;

  constructor(
    readonly id: PreferenceId,
    readonly address: number,
    readonly deviceModel: DeviceModel
  ) {}

  parse(nodeIn: Scalar | YAMLSeq): void {
    if (
      !(nodeIn instanceof Scalar) ||
      !autoIndividualReplyValues.includes(
        nodeIn.value as AutoIndividualReplyValue
      )
    ) {
      throw new YamlError(
        `${this.id} must be in [${autoIndividualReplyValues.join(', ')}]`,
        nodeIn
      );
    }
    this.value = nodeIn.value as AutoIndividualReplyValue;
  }

  read(data: Uint8Array) {
    if (data.length > 0) {
      const byte = data[0];
      this.rawValue = byte;
      if (byte & 0x80) {
        if (byte & 0x40) {
          this.value = 'able';
        } else {
          this.value = 'unable';
        }
      } else {
        this.value = 'off';
      }
    } else {
      this.value = undefined;
    }
  }

  maybeAddNode(yaml: YAMLMap, _yamlDoc: Document<Node, true>) {
    if (this.value !== undefined) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(
    configBatchWriter: ConfigBatchWriter,
    previousControlKnob?: ControlKnob
  ) {
    if (this.value !== undefined) {
      if (
        !previousControlKnob ||
        !(previousControlKnob instanceof AutoIndividualReplyControlBase) ||
        previousControlKnob.rawValue === undefined
      ) {
        throw new Error(
          'Unexpected missing previous value of auto_individual_reply'
        );
      }
      let data = previousControlKnob.rawValue;
      if (this.value === 'off') {
        data = data & ~0x80; // Clear top bit
      } else {
        data = data | 0x80; // Set top bit
        if (this.value === 'able') {
          data = data | 0x40; // Set second top bit
        } else if (this.value === 'unable') {
          data = data & ~0x40; // Clear second top bit
        }
      }
      const byteArray = new Uint8Array(1);
      byteArray[0] = data;
      configBatchWriter.prepareWrite(this.id, this.address, byteArray);
    }
  }
}

export function createKnob(
  kd: ControlKnobData,
  deviceModel: DeviceModel
): ControlKnob {
  switch (kd.params.type) {
    case 'number':
      return new NumberControlBase(
        kd.id,
        kd.address,
        kd.params.min,
        kd.params.max
      );
    case 'boolean':
      return new BooleanControlBase(kd.id, kd.address);
    case 'enum':
      return new EnumControlBase(
        kd.id,
        kd.address,
        kd.params.values,
        kd.params.base || 0
      );
    case 'soft_key_page':
      return new SoftKeyPageControlBase(kd.id, kd.address, deviceModel);
    case 'auto_individual_reply':
      return new AutoIndividualReplyControlBase(kd.id, kd.address, deviceModel);
  }
}
