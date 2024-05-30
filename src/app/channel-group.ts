import { fillPaddedString, readPaddedString } from './util';

export type ChannelGroupData = {
  name: string;
  enable: boolean;
  enable_dsc: boolean;
  enable_atis: boolean;
  model_name: string;
};

export class ChannelGroup {
  constructor(readonly cg: ChannelGroupData) {
    if (cg.name.length == 0) {
      throw new Error('A channel group must have a name');
    }
    if (cg.name.length > 4) {
      throw new Error('A channel group name can have at most 4 characters');
    }
    if (cg.model_name.length == 0) {
      throw new Error('A channel group must have a model name');
    }
    if (cg.model_name.length > 6) {
      throw new Error(
        'A channel group model name can have at most 6 characters'
      );
    }
  }
  fillConfig(data: Uint8Array) {
    data[0] = this.cg.enable ? 1 : 0;
    data[1] = this.cg.enable_dsc ? 1 : 0;
    data[2] = this.cg.enable_atis ? 1 : 0;
    fillPaddedString(data.subarray(3, 7), this.cg.name);
    data[7] = 0xff;
    fillPaddedString(data.subarray(8, 16), this.cg.model_name);
  }
}

export function parseChannelGroupData(data: Uint8Array) {
  return new ChannelGroup({
    name: readPaddedString(data.subarray(3, 7)),
    enable: data[0] != 0,
    enable_dsc: data[1] != 0,
    enable_atis: data[2] != 0,
    model_name: readPaddedString(data.subarray(8, 16))
  });
}
