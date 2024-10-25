import { ConfigBatchWriter } from '../config-batch-writer';
import { DatConfigProtocol } from '../config-protocol';
import { createMockDat } from '../devicemgr.service.spec';
import { Document, YAMLMap, YAMLSeq, parseDocument } from 'yaml';
import { Config } from './device-configs';
import { unhex } from '../message';
import { ConfigBatchReader } from '../config-batch-reader';
import { ChannelConfig, marineChannelSections } from './channels';
import { channel } from 'process';

const CHANNELS_SECTION_YAML = `
- channels:
    group_1:
      intership: [ 6, 8 ]
      names:
        - 1001: VTS
        - 2003: ""
        - 05B: VTS
        - 6: SAFETY
        - 07A: VTS
        - 8: ""
      scrambler:
        - 05B: { type: 32, code: 8 }
    group_2:
      intership: [ 6, 8 ]
      names:
        - 1001: VTS
        - 2003: ""
        - 05B: VTS
        - 6: SAFETY
        - 07A: VTS
        - 8: ""
      scrambler:
        - 05B: { type: 32, code: 8 }
    group_3:
      intership: [ 6, 8 ]
      names:
        - 1001: VTS
        - 2003: ""
        - 05B: VTS
        - 6: SAFETY
        - 07A: VTS
        - 8: ""
      scrambler:
        - 05B: { type: 32, code: 8 }
`;

const CHANNELS_SECTION_YAML_2 = `
- channels:
    group_1:
      intership: [ 1001, 2003, 05B, 07A, 8 ]
      names:
        - 6: AAAAAA
      scrambler:
        - 1001: { type: 4, code: 0 }`;

const CHANNELS_SECTION_YAML_GX = `
- channels:
    group_1:
      intership: [ 6, 8 ]
    group_2:
      intership: [ 6, 8 ]
    group_3:
      intership: [ 6, 8 ]
`;

const CHANNELS_SECTION_YAML_GX_2 = `
- channels:
    group_1:
      intership: [ 1001, 2003, 05B, 07A, 8 ]`;

const CHANNELS_ENABLED_BYTES = unhex('FC0000000000000000000000');

const CHANNELS_FLAGS_BYTES_HX = unhex(
  `
  0130 0a00 0330 1400 0532 7fc8 0630 ff00
  0731 7f00 0830 ff00 ffff ffff ffff ffff` +
    `ffff ffff ffff ffff ffff ffff ffff ffff`.repeat((96 - 8) / 4)
);

const CHANNELS_FLAGS_BYTES_2_HX = unhex(
  `
  0130 8a80 0330 9400 0532 ff00 0630 7f00
  0731 ff00 0830 ff00 ffff ffff ffff ffff` +
    `ffff ffff ffff ffff ffff ffff ffff ffff`.repeat((96 - 8) / 4)
);

const CHANNELS_FLAGS_BYTES_GX = unhex(
  `01c4 03c8 05c2 86c0 07c1 88c0 ffff ffff` + 
  `ffff ffff ffff ffff ffff ffff ffff ffff`.repeat((96 - 8) / 8)
);

const CHANNELS_FLAGS_BYTES_2_GX = unhex(
  `81c4 83c8 85c2 06c0 87c1 88c0 ffff ffff` + 
  `ffff ffff ffff ffff ffff ffff ffff ffff`.repeat((96 - 8) / 8)
);

const CHANNELS_NAMES_BYTES_HX = unhex(
  `
  5654 53ff ffff ffff ffff ffff ffff ffff
  ffff ffff ffff ffff ffff ffff ffff ffff
  5654 53ff ffff ffff ffff ffff ffff ffff
  5341 4645 5459 ffff ffff ffff ffff ffff
`.repeat(96 / 4)
);

const CHANNELS_NAMES_BYTES_2_HX = unhex(
  `
  5654 53ff ffff ffff ffff ffff ffff ffff
  ffff ffff ffff ffff ffff ffff ffff ffff
  5654 53ff ffff ffff ffff ffff ffff ffff
  4141 4141 4141 ffff ffff ffff ffff ffff
` +
    `
  5654 53ff ffff ffff ffff ffff ffff ffff
  ffff ffff ffff ffff ffff ffff ffff ffff
  5654 53ff ffff ffff ffff ffff ffff ffff
  5341 4645 5459 ffff ffff ffff ffff ffff
`.repeat((96 - 4) / 4)
);

describe('ChannelConfig (HX)', () => {
  let channelConfigModule: ChannelConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    channelConfigModule = new ChannelConfig('HX890');
    datFile = createMockDat('HX890');
    // Group 1
    datFile.set(CHANNELS_ENABLED_BYTES, 0x120);
    datFile.set(CHANNELS_FLAGS_BYTES_HX, 0x700);
    datFile.set(CHANNELS_NAMES_BYTES_HX, 0x1100);
    // Group 2
    datFile.set(CHANNELS_ENABLED_BYTES, 0x140);
    datFile.set(CHANNELS_FLAGS_BYTES_HX, 0x900);
    datFile.set(CHANNELS_NAMES_BYTES_HX, 0x1d00);
    // Group 3
    datFile.set(CHANNELS_ENABLED_BYTES, 0x160);
    datFile.set(CHANNELS_FLAGS_BYTES_HX, 0xb00);
    datFile.set(CHANNELS_NAMES_BYTES_HX, 0x2900);
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should request the correct ranges to read', () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(9);
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_1', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x120,
      end: 0x12c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_2', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x140,
      end: 0x14c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_3', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x160,
      end: 0x16c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_1', 'names')
      )
    ).toEqual({
      start: 0x1100,
      end: 0x1700
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_2', 'names')
      )
    ).toEqual({
      start: 0x1d00,
      end: 0x2300
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_3', 'names')
      )
    ).toEqual({
      start: 0x2900,
      end: 0x2f00
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_1', 'flags')
      )
    ).toEqual({
      start: 0x700,
      end: 0x880
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_2', 'flags')
      )
    ).toEqual({
      start: 0x900,
      end: 0xa80
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_3', 'flags')
      )
    ).toEqual({
      start: 0xb00,
      end: 0xc80
    });
  });

  it('should produce correct YAML', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML);
  });

  it('should round-trip with no changes', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML);
    const yaml2 = parseDocument(CHANNELS_SECTION_YAML);
    const config2: Config = {};
    const result = channelConfigModule.maybeVisitYamlNode(
      (yaml2.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config2,
        previousConfig: config
      }
    );
    expect(result).toBeTrue();
    for (const section of marineChannelSections) {
      const flags_id = channelConfigModule.getMemoryRangeId(section, 'flags');
      const flags = configBatchWriter.data.get(flags_id);
      expect(flags![1]).toEqual(CHANNELS_FLAGS_BYTES_HX);
      const names_id = channelConfigModule.getMemoryRangeId(section, 'names');
      const names = configBatchWriter.data.get(names_id);
      expect(names![1]).toEqual(CHANNELS_NAMES_BYTES_HX);
    }
  });

  it('should write expected changes', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML);
    const yaml2 = parseDocument(CHANNELS_SECTION_YAML_2);
    const config2: Config = {};
    const result = channelConfigModule.maybeVisitYamlNode(
      (yaml2.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config2,
        previousConfig: config
      }
    );
    expect(result).toBeTrue();
    const group_1_flags_id = channelConfigModule.getMemoryRangeId(
      'group_1',
      'flags'
    );
    const group_1_flags = configBatchWriter.data.get(group_1_flags_id);
    expect(group_1_flags).toEqual([0x700, CHANNELS_FLAGS_BYTES_2_HX]);
    const group_1_names_id = channelConfigModule.getMemoryRangeId(
      'group_1',
      'names'
    );
    const group_1_names = configBatchWriter.data.get(group_1_names_id);
    expect(group_1_names).toEqual([0x1100, CHANNELS_NAMES_BYTES_2_HX]);
  });
});

describe('ChannelConfig (GX)', () => {
  let channelConfigModule: ChannelConfig;
  let datFile: Uint8Array;
  let configBatchWriter: ConfigBatchWriter;
  let configBatchReader: ConfigBatchReader;

  beforeEach(() => {
    channelConfigModule = new ChannelConfig('GX1400');
    datFile = createMockDat('GX1400');
    // Group 1
    datFile.set(CHANNELS_ENABLED_BYTES, 0x120);
    datFile.set(CHANNELS_FLAGS_BYTES_GX, 0x180);
    // Group 2
    datFile.set(CHANNELS_ENABLED_BYTES, 0x130);
    datFile.set(CHANNELS_FLAGS_BYTES_GX, 0x240);
    // Group 3
    datFile.set(CHANNELS_ENABLED_BYTES, 0x140);
    datFile.set(CHANNELS_FLAGS_BYTES_GX, 0x300);
    configBatchWriter = new ConfigBatchWriter(new DatConfigProtocol(datFile));
    configBatchReader = new ConfigBatchReader(new DatConfigProtocol(datFile));
  });

  it('should request the correct ranges to read', () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    expect(configBatchReader.ranges.size).toBe(6);
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_1', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x120,
      end: 0x12c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_2', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x130,
      end: 0x13c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_3', 'enabled_bitfield')
      )
    ).toEqual({
      start: 0x140,
      end: 0x14c
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_1', 'flags')
      )
    ).toEqual({
      start: 0x180,
      end: 0x240
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_2', 'flags')
      )
    ).toEqual({
      start: 0x240,
      end: 0x300
    });
    expect(
      configBatchReader.ranges.get(
        channelConfigModule.getMemoryRangeId('group_3', 'flags')
      )
    ).toEqual({
      start: 0x300,
      end: 0x3C0
    });
  });

  it('should produce correct YAML', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML_GX);
  });

  it('should round-trip with no changes', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML_GX);
    const yaml2 = parseDocument(CHANNELS_SECTION_YAML_GX);
    const config2: Config = {};
    const result = channelConfigModule.maybeVisitYamlNode(
      (yaml2.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config2,
        previousConfig: config
      }
    );
    expect(result).toBeTrue();
    for (const section of marineChannelSections) {
      const flags_id = channelConfigModule.getMemoryRangeId(section, 'flags');
      const flags = configBatchWriter.data.get(flags_id);
      expect(flags![1]).toEqual(CHANNELS_FLAGS_BYTES_GX);
    }
  });

  it('should write expected changes', async () => {
    channelConfigModule.addRangesToRead(configBatchReader);
    const results = await configBatchReader.read(() => {});
    const yaml = new Document();
    yaml.contents = new YAMLSeq();
    const config: Config = {};
    channelConfigModule.updateConfig(results, config, yaml);
    expect(yaml.toString()).toBe(CHANNELS_SECTION_YAML_GX);
    const yaml2 = parseDocument(CHANNELS_SECTION_YAML_GX_2);
    const config2: Config = {};
    const result = channelConfigModule.maybeVisitYamlNode(
      (yaml2.contents as YAMLSeq).items[0] as YAMLMap,
      {
        configBatchWriter,
        configOut: config2,
        previousConfig: config
      }
    );
    expect(result).toBeTrue();
    const group_1_flags_id = channelConfigModule.getMemoryRangeId(
      'group_1',
      'flags'
    );
    const group_1_flags = configBatchWriter.data.get(group_1_flags_id);
    expect(group_1_flags).toEqual([0x180, CHANNELS_FLAGS_BYTES_2_GX]);
  });
});
