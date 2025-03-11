import { Component } from '@angular/core';
import { ConfigSession, DeviceTaskState } from '../config-session';
import { Config } from '../config-modules/device-configs';
import { DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'busy-state-modal',
    imports: [],
    templateUrl: './busy-state-modal.component.html',
    styleUrl: './busy-state-modal.component.css'
})
export class BusyStateModalComponent {
  state: DeviceTaskState = 'idle';
  progressPct: number = 0;
  configProtocol: ConfigSession;
  constructor(deviceMgr: DevicemgrService) {
    this.configProtocol = deviceMgr.configSession;
  }
  ngOnInit() {
    this.configProtocol.deviceTaskState$.subscribe(
      (deviceTaskState) => (this.state = deviceTaskState)
    );
    this.configProtocol.progress$.subscribe(
      (progress) => (this.progressPct = Math.floor(progress * 100))
    );
  }
}
