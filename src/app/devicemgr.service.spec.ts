import { TestBed } from '@angular/core/testing';

import {
  DEVICE_CONFIGS,
  DeviceConfig,
  DeviceModel,
  DevicemgrService
} from './devicemgr.service';

export function createMockDat(deviceModel: DeviceModel) {
  const deviceConfig = DEVICE_CONFIGS.find(
    (c: DeviceConfig) => (c.name = deviceModel)
  );
  const datFile = new Uint8Array(deviceConfig!.datLength);
  datFile.fill(0xaa);
  datFile.set(deviceConfig!.datMagic);
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
