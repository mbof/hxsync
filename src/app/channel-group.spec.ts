import {
  ChannelGroup,
  ChannelGroupData,
  parseChannelGroupData
} from './channel-group';
import { unhex } from './message';

const CHANNEL_GROUP_DATA: ChannelGroupData = {
  name: 'USA',
  enable: true,
  enable_dsc: true,
  enable_atis: false,
  model_name: 'HX890'
};

const CHANNEL_GROUP_BINARY_DATA = unhex('010100555341FFFF4858383930FFFFFF');

describe('ChannelGroup', () => {
  it('should write binary channel group config', () => {
    const cg = new ChannelGroup(CHANNEL_GROUP_DATA);
    const data = new Uint8Array(16);
    cg.fillConfig(data);
    expect(data).toEqual(CHANNEL_GROUP_BINARY_DATA);
  });
  it('should parse binary channel group config', () => {
    const cg = parseChannelGroupData(CHANNEL_GROUP_BINARY_DATA);
    expect(cg.cg).toEqual(CHANNEL_GROUP_DATA);
  });
});
