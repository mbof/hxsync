import { HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DevicemgrService } from '../devicemgr.service';
import { DeviceTaskState } from '../config-session';

@Component({
  selector: 'app-share',
  standalone: true,
  imports: [],
  templateUrl: './share.component.html',
  styleUrl: './share.component.css'
})
export class ShareComponent {
  yaml: string = '';
  status: string = '';
  state: DeviceTaskState = 'idle';
  progress: number = 0;
  constructor(
    private deviceMgr: DevicemgrService,
    private route: ActivatedRoute
  ) {}
  ngOnInit() {
    this.route.fragment.subscribe((f) => (this.yaml = f || ''));
    this.deviceMgr.configSession.deviceTaskState$.subscribe((state) => {
      this.state = state;
    });
    this.deviceMgr.configSession.progress$.subscribe((progress) => {
      this.progress = progress;
    });
  }
  async apply() {
    try {
      this.status = '';
      if (this.deviceMgr.getConnectionState() != 'usb-connected') {
        await this.deviceMgr.connectUsb();
      }
      await this.deviceMgr.configSession.startYaml();
      await this.deviceMgr.configSession.saveYaml(this.yaml);
      this.status = 'Done!'
    } catch (e) {
      this.status = e!.toString();
    }
  }
  getStatus() {
    if (this.status) {
      return this.status;
    }
    if (this.state == 'yaml-read') {
      return `Reading from device (${Math.floor(this.progress * 100)}%)`;
    }
    if (this.state == 'yaml-save') {
      return `Writing to device (${Math.floor(this.progress * 100)}%)`;
    }
    return '';
  }
}
