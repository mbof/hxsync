import { Scalar, YAMLMap } from 'yaml';
import { ConfigBatchWriter } from '../config-batch-writer';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { PreferenceId } from './preferences-knobs';

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
        readonly values: readonly string[];
      }
    | {
        readonly type: 'boolean';
      };
};

export interface ControlKnob {
  id: PreferenceId;
  address: number;
  parse(nodeIn: Scalar): void;
  read(data: Uint8Array): void;
  maybeAddNode(yaml: YAMLMap): void;
  write(configBatchWriter: ConfigBatchWriter): void;
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

  parse(nodeIn: Scalar) {
    if (typeof nodeIn.value != 'number') {
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

  maybeAddNode(yaml: YAMLMap) {
    if (
      this.value !== undefined &&
      this.value >= this.min &&
      this.value <= this.max
    ) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(configBatchWriter: ConfigBatchWriter) {
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
  value?: string;
  valueIndex?: number;

  constructor(
    readonly id: PreferenceId,
    readonly address: number,
    readonly values: readonly string[]
  ) {}

  parse(nodeIn: Scalar): void {
    let valueIndex;
    if (
      typeof nodeIn.value != 'string' ||
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
    this.valueIndex = data[0];
    if (this.valueIndex < this.values.length) {
      this.value = this.values[this.valueIndex];
    }
  }

  maybeAddNode(yaml: YAMLMap) {
    if (this.value !== undefined) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(configBatchWriter: ConfigBatchWriter) {
    if (this.valueIndex !== undefined) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([this.valueIndex])
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

  maybeAddNode(yaml: YAMLMap) {
    if (this.value !== undefined) {
      yaml.add({ key: this.id, value: this.value });
    }
  }

  write(configBatchWriter: ConfigBatchWriter) {
    if (this.value !== undefined) {
      configBatchWriter.prepareWrite(
        this.id,
        this.address,
        new Uint8Array([this.value ? 1 : 0])
      );
    }
  }
}

export function createKnob(kd: ControlKnobData): ControlKnob {
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
      return new EnumControlBase(kd.id, kd.address, kd.params.values);
  }
}
