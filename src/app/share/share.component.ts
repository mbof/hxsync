import { HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DevicemgrService } from '../devicemgr.service';
import { DeviceTaskState } from '../config-session';

@Component({
    selector: 'app-share',
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
    this.route.fragment.subscribe((f) => {
      if (f && f.length > 0) {
        this.yaml = f;
      }
    });
    this.route.url.subscribe((u) => {
      if (u.length == 0) return;
      const yaml = /^(share(%23|#)).*/.exec(u[0].path);
      if (yaml && yaml.length > 2) {
        this.yaml = u[0].path.slice(yaml[1].length);
      }
    });
    this.deviceMgr.configSession.deviceTaskState$.subscribe((state) => {
      this.state = state;
    });
    this.deviceMgr.configSession.progress$.subscribe((progress) => {
      this.progress = progress;
    });
  }
  async apply(event: MouseEvent) {
    try {
      this.status = '';
      if (this.deviceMgr.getConnectionState() != 'usb-connected') {
        await this.deviceMgr.connectUsb(event.shiftKey);
      }
      await this.deviceMgr.configSession.startYaml();
      await this.deviceMgr.configSession.saveYaml(this.yaml);
      this.status = 'Done!';
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
