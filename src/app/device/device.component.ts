/// <reference types="wicg-file-system-access" />

import { Component, ViewChild } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { hex } from '../message';
import { Config, DeviceTaskState } from '../config-session';
import { saveAs } from 'file-saver';
import { Locus } from '../gps';
import { Waypoint } from '../waypoint';
import { BusyStateModalComponent } from '../busy-state-modal/busy-state-modal.component';
import { WaypointSheetComponent } from '../waypoint-sheet/waypoint-sheet.component';
import { MmsiSheetComponent } from '../mmsi-sheet/mmsi-sheet.component';

// debug with: x = ng.getComponent(document.querySelector('app-device'))

@Component({
  selector: 'app-device',
  standalone: true,
  templateUrl: './device.component.html',
  styleUrl: './device.component.css',
  imports: [BusyStateModalComponent, WaypointSheetComponent, MmsiSheetComponent]
})
export class DeviceComponent {
  connectionStateSubscription?: Subscription;
  connectionState: DeviceConnectionState;
  configSubscription?: Subscription;
  config: BehaviorSubject<Config>;
  deviceTaskState: DeviceTaskState;

  @ViewChild(WaypointSheetComponent) waypointSheet!: WaypointSheetComponent;
  @ViewChild(MmsiSheetComponent) mmsiSheet!: MmsiSheetComponent;
  @ViewChild(BusyStateModalComponent) busyStateModal!: BusyStateModalComponent;

  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
    this.config = this.deviceMgr.configSession.config;
    this.deviceTaskState = 'idle';
  }

  ngOnInit() {
    this.connectionStateSubscription =
      this.deviceMgr.connectionState$.subscribe(
        (connectionState) => (this.connectionState = connectionState)
      );
    this.configSubscription = this.deviceMgr.configSession.config
      .asObservable()
      .subscribe();
    this.deviceMgr.configSession.deviceTaskState$.subscribe(
      (deviceTaskState) => (this.deviceTaskState = deviceTaskState)
    );
  }

  async readWaypoints() {
    await this.deviceMgr.configSession.readNavInfo();
  }
  async readMmsi() {
    await this.deviceMgr.configSession.readMmsiDirectory();
  }
  async readGpslog() {
    await this.deviceMgr.configSession.readGpsLog();
    const gpx = new Locus(
      this.deviceMgr.configSession.config.getValue().gpslog!
    ).getGpx();
    const file = new Blob(gpx, {
      type: 'application/xml'
    });
    saveAs(file, `gpslog.gpx`);
  }

  // TODO: move to device mgr and add DAT loading / saving states
  async showDatPicker() {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'DAT files',
          accept: {
            'application/octet-stream': ['.dat', '.bin', '.DAT', '.bin']
          }
        }
      ]
    });
    const f = await handle.getFile();
    const dat = await f.arrayBuffer();
    try {
      this.deviceMgr.connectDat(new Uint8Array(dat));
    } catch (e) {
      window.alert(e);
    }
  }

  async saveDat() {
    const handle = await window.showSaveFilePicker({
      types: [
        {
          description: 'DAT files',
          accept: {
            'application/octet-stream': ['.dat', '.bin', '.DAT', '.bin']
          }
        }
      ]
    });
    const out = await handle.createWritable();
    await out.write(this.deviceMgr.configSession.getDat());
    await out.close();
  }

  hex = hex;
}
