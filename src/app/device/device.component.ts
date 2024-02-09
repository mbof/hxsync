import { Component } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { hexarr } from '../message';
import { Config } from '../configprotocol';
import { saveAs } from 'file-saver';
import { Locus } from '../gps';

// debug with: x = ng.getComponent(document.querySelector('app-device'))

@Component({
  selector: 'app-device',
  standalone: true,
  imports: [],
  templateUrl: './device.component.html',
  styleUrl: './device.component.css'
})
export class DeviceComponent {
  connectionStateSubscription?: Subscription;
  connectionState: DeviceConnectionState;
  readStateSubscription?: Subscription;
  readState: boolean = false;
  writeStateSubscription?: Subscription;
  writeState: boolean = false;
  readonly DCS = DeviceConnectionState;
  configSubscription?: Subscription;
  config: BehaviorSubject<Config>;

  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
    this.config = this.deviceMgr.configProtocol.config;
  }

  ngOnInit() {
    this.connectionStateSubscription = this.deviceMgr.connectionState$.subscribe(
      (connectionState) => (this.connectionState = connectionState)
    );
    this.readStateSubscription = this.deviceMgr.busyReadState$.subscribe((readState) => (this.readState = readState));
    this.writeStateSubscription = this.deviceMgr.busyWriteState$.subscribe(
      (writeState) => (this.writeState = writeState)
    );
    this.configSubscription = this.deviceMgr.configProtocol.config.asObservable().subscribe();
  }

  async readMMSI() {
    await this.deviceMgr.configProtocol.readMmsi();
  }
  async readWaypoints() {
    await this.deviceMgr.configProtocol.readWaypoints();
  }
  async readGpslog() {
    await this.deviceMgr.configProtocol.readGpsLog();
    const gpx = new Locus(this.deviceMgr.configProtocol.config.getValue().gpslog!).getGpx();
    const file = new Blob(gpx, {
      type: 'application/octet-stream'
    });
    saveAs(file, 'gpslog.bin');
  }
}
