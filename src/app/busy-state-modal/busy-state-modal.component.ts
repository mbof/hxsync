import { Component } from '@angular/core';
import { Config, ConfigProtocol, DeviceTaskState } from '../configprotocol';
import { DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'busy-state-modal',
  standalone: true,
  imports: [],
  templateUrl: './busy-state-modal.component.html',
  styleUrl: './busy-state-modal.component.css'
})
export class BusyStateModalComponent {
  state: DeviceTaskState = 'idle';
  gpsDownloadProgressPct: number = 0;
  configProtocol: ConfigProtocol;
  constructor(deviceMgr: DevicemgrService) {
    this.configProtocol = deviceMgr.configProtocol;
  }
  ngOnInit() {
    this.configProtocol.deviceTaskState$.subscribe(
      (deviceTaskState) => (this.state = deviceTaskState)
    );
    this.configProtocol.gpsDownloadProgress$.subscribe(
      (progress) => (this.gpsDownloadProgressPct = Math.floor(progress * 100))
    );
  }
}
