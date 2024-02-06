import { ConfigProtocol } from './configprotocol';
import { DevicemgrService } from './devicemgr.service';

const dev = new DevicemgrService();

describe('ConfigProtocol', () => {
  it('should create an instance', () => {
    expect(new ConfigProtocol(dev)).toBeTruthy();
  });
});
