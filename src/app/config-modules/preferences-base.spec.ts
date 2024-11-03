import { Scalar, YAMLMap } from 'yaml';
import { ConfigBatchWriter } from '../config-batch-writer';
import {
  NumberControlBase,
  EnumControlBase,
  BooleanControlBase,
  createKnob
} from './preferences-base';

describe('NumberControlBase', () => {
  let knob: NumberControlBase;
  let configBatchWriter: ConfigBatchWriter;

  beforeEach(() => {
    knob = new NumberControlBase('volume', 0x000c, 0, 15);
    configBatchWriter = jasmine.createSpyObj<ConfigBatchWriter>(
      'ConfigBatchWriter',
      ['prepareWrite']
    );
  });

  it('should create an instance', () => {
    expect(knob).toBeTruthy();
  });

  it('should parse a valid number scalar', () => {
    const node = new Scalar(10);
    knob.parse(node);
    expect(knob.value).toBe(10);
  });

  it('should throw an error when parsing a non-number scalar', () => {
    const node = new Scalar('abc');
    expect(() => knob.parse(node)).toThrowError(/must be a number/);
  });

  it('should throw an error when parsing a number outside the valid range', () => {
    const node = new Scalar(20);
    expect(() => knob.parse(node)).toThrowError(/must be between 0 and 15/);
  });

  it('should read a value from a Uint8Array', () => {
    const data = new Uint8Array([5]);
    knob.read(data);
    expect(knob.value).toBe(5);
  });

  it('should handle an empty Uint8Array when reading', () => {
    const data = new Uint8Array([]);
    knob.read(data);
    expect(knob.value).toBeUndefined();
  });

  it('should add a node to the YAML map when the value is valid', () => {
    knob.value = 10;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(1);
    expect(yamlMap.items[0].key).toBe('volume');
    expect(yamlMap.items[0].value).toBe(10);
  });

  it('should not add a node to the YAML map when the value is undefined', () => {
    knob.value = undefined;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(0);
  });

  it('should not add a node to the YAML map when the value is out of range', () => {
    knob.value = 20;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(0);
  });

  it('should write a value to the config batch writer', () => {
    knob.value = 10;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).toHaveBeenCalledWith(
      'volume',
      0x000c,
      new Uint8Array([10])
    );
  });

  it('should not write a value to the config batch writer when the value is undefined', () => {
    knob.value = undefined;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).not.toHaveBeenCalled();
  });
});

describe('EnumControlBase', () => {
  let knob: EnumControlBase;
  let configBatchWriter: ConfigBatchWriter;

  beforeEach(() => {
    knob = new EnumControlBase('multi_watch', 0x0034, ['dual', 'triple']);
    configBatchWriter = jasmine.createSpyObj<ConfigBatchWriter>(
      'ConfigBatchWriter',
      ['prepareWrite']
    );
  });

  it('should create an instance', () => {
    expect(knob).toBeTruthy();
  });

  it('should parse a valid enum scalar', () => {
    const node = new Scalar('dual');
    knob.parse(node);
    expect(knob.value).toBe('dual');
    expect(knob.valueIndex).toBe(0);
  });

  it('should throw an error when parsing a non-string scalar', () => {
    const node = new Scalar(10);
    expect(() => knob.parse(node)).toThrowError(/must be in \[dual, triple]/);
  });

  it('should throw an error when parsing an invalid enum value', () => {
    const node = new Scalar('quad');
    expect(() => knob.parse(node)).toThrowError(/must be in \[dual, triple]/);
  });

  it('should read a value from a Uint8Array', () => {
    const data = new Uint8Array([1]);
    knob.read(data);
    expect(knob.value).toBe('triple');
    expect(knob.valueIndex).toBe(1);
  });

  it('should handle an empty Uint8Array when reading', () => {
    const data = new Uint8Array([]);
    knob.read(data);
    expect(knob.value).toBeUndefined();
    expect(knob.valueIndex).toBeUndefined();
  });

  it('should add a node to the YAML map when the value is valid', () => {
    knob.value = 'dual';
    knob.valueIndex = 0;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(1);
    expect(yamlMap.items[0].key).toBe('multi_watch');
    expect(yamlMap.items[0].value).toBe('dual');
  });

  it('should not add a node to the YAML map when the value is undefined', () => {
    knob.value = undefined;
    knob.valueIndex = undefined;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(0);
  });

  it('should write a value to the config batch writer', () => {
    knob.valueIndex = 1;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).toHaveBeenCalledWith(
      'multi_watch',
      0x0034,
      new Uint8Array([1])
    );
  });

  it('should not write a value to the config batch writer when the value is undefined', () => {
    knob.valueIndex = undefined;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).not.toHaveBeenCalled();
  });
});

describe('BooleanControlBase', () => {
  let knob: BooleanControlBase;
  let configBatchWriter: ConfigBatchWriter;

  beforeEach(() => {
    knob = new BooleanControlBase('weather_alert', 0x0038);
    configBatchWriter = jasmine.createSpyObj<ConfigBatchWriter>(
      'ConfigBatchWriter',
      ['prepareWrite']
    );
  });

  it('should create an instance', () => {
    expect(knob).toBeTruthy();
  });

  it('should parse a valid boolean scalar', () => {
    const node = new Scalar(true);
    knob.parse(node);
    expect(knob.value).toBe(true);
  });

  it('should throw an error when parsing a non-boolean scalar', () => {
    const node = new Scalar('abc');
    expect(() => knob.parse(node)).toThrowError(/must be a boolean/);
  });

  it('should read a true value from a Uint8Array', () => {
    const data = new Uint8Array([1]);
    knob.read(data);
    expect(knob.value).toBe(true);
  });

  it('should read a false value from a Uint8Array', () => {
    const data = new Uint8Array([0]);
    knob.read(data);
    expect(knob.value).toBe(false);
  });

  it('should handle an empty Uint8Array when reading', () => {
    const data = new Uint8Array([]);
    knob.read(data);
    expect(knob.value).toBeUndefined();
  });

  it('should add a node to the YAML map when the value is valid', () => {
    knob.value = true;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(1);
    expect(yamlMap.items[0].key).toBe('weather_alert');
    expect(yamlMap.items[0].value).toBe(true);
  });

  it('should not add a node to the YAML map when the value is undefined', () => {
    knob.value = undefined;
    const yamlMap = new YAMLMap();
    knob.maybeAddNode(yamlMap);
    expect(yamlMap.items.length).toBe(0);
  });

  it('should write a value to the config batch writer', () => {
    knob.value = true;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).toHaveBeenCalledWith(
      'weather_alert',
      0x0038,
      new Uint8Array([1])
    );
  });

  it('should write a value to the config batch writer', () => {
    knob.value = false;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).toHaveBeenCalledWith(
      'weather_alert',
      0x0038,
      new Uint8Array([0])
    );
  });

  it('should not write a value to the config batch writer when the value is undefined', () => {
    knob.value = undefined;
    knob.write(configBatchWriter);
    expect(configBatchWriter.prepareWrite).not.toHaveBeenCalled();
  });
});

describe('createKnob', () => {
  it('should create a knob', () => {
    const knob = createKnob({
      id: 'volume',
      address: 0x000c,
      params: {
        type: 'number',
        min: 0,
        max: 15
      }
    });
    expect(knob).toBeTruthy();
  });
});
