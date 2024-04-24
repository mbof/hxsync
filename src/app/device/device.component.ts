import { Component, ViewChild } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { hex } from '../message';
import { Config, DeviceTaskState } from '../configprotocol';
import { saveAs } from 'file-saver';
import { Locus } from '../gps';
import { Waypoint } from '../waypoint';
import { BusyStateModalComponent } from '../busy-state-modal/busy-state-modal.component';
import { WaypointSheetComponent } from '../waypoint-sheet/waypoint-sheet.component';

// debug with: x = ng.getComponent(document.querySelector('app-device'))

@Component({
  selector: 'app-device',
  standalone: true,
  templateUrl: './device.component.html',
  styleUrl: './device.component.css',
  imports: [BusyStateModalComponent, WaypointSheetComponent]
})
export class DeviceComponent {
  connectionStateSubscription?: Subscription;
  connectionState: DeviceConnectionState;
  configSubscription?: Subscription;
  config: BehaviorSubject<Config>;
  deviceTaskState: DeviceTaskState;

  @ViewChild(WaypointSheetComponent) waypointSheet!: WaypointSheetComponent;
  @ViewChild(BusyStateModalComponent) busyStateModal!: BusyStateModalComponent;

  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
    this.config = this.deviceMgr.configProtocol.config;
    this.deviceTaskState = 'idle';
  }

  ngOnInit() {
    this.connectionStateSubscription =
      this.deviceMgr.connectionState$.subscribe(
        (connectionState) => (this.connectionState = connectionState)
      );
    this.configSubscription = this.deviceMgr.configProtocol.config
      .asObservable()
      .subscribe();
    this.deviceMgr.configProtocol.deviceTaskState$.subscribe(
      (deviceTaskState) => (this.deviceTaskState = deviceTaskState)
    );
  }

  async readWaypoints() {
    await this.deviceMgr.configProtocol.readNavInfo();
  }
  async readGpslog() {
    await this.deviceMgr.configProtocol.readGpsLog();
    const gpx = new Locus(
      this.deviceMgr.configProtocol.config.getValue().gpslog!
    ).getGpx();
    const file = new Blob(gpx, {
      type: 'application/xml'
    });
    saveAs(file, `gpslog.gpx`);
  }

  hex = hex;
}
