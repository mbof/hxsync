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
});
