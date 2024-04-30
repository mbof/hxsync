import { TestBed } from '@angular/core/testing';

import { DevicemgrService } from './devicemgr.service';

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
    const datFile = new Uint8Array(0x8000);
    datFile.set([0x03, 0x67]);
    service.connectDat(datFile);
    expect(service.getConnectionState()).toBe('dat-connected');
    expect(service.configSession._deviceConfig!.name).toBe('HX870');
  });
});
