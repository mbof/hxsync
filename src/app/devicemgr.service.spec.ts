import { TestBed } from '@angular/core/testing';

import { DevicemgrService } from './devicemgr.service';
import { DEVICE_CONFIGS, DeviceModel } from './config-modules/device-configs';

export function createMockDat(deviceModel: DeviceModel) {
  const deviceConfig = DEVICE_CONFIGS.get(deviceModel);
  const datFile = new Uint8Array(deviceConfig!.dat!.length);
  datFile.fill(0xaa);
  datFile.set(deviceConfig!.dat!.magic);
  return datFile;
}

describe('DevicemgrService', () => {
  let service: DevicemgrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DevicemgrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('should open a DAT file', () => {
    const datFile = createMockDat('HX870');
    service.connectDat(datFile);
    expect(service.getConnectionState()).toBe('dat-connected');
    expect(service.configSession._deviceConfig!.name).toBe('HX870');
  });
});
