import { Component, ViewChild } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { hex } from '../message';
import { Config } from '../configprotocol';
import { saveAs } from 'file-saver';
import { Locus } from '../gps';
import { Waypoint } from '../waypoint';
import { WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';

// debug with: x = ng.getComponent(document.querySelector('app-device'))

@Component({
  selector: 'app-device',
  standalone: true,
  imports: [WaypointEditorComponent],
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

  @ViewChild(WaypointEditorComponent) waypointEditor!: WaypointEditorComponent;

  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
    this.config = this.deviceMgr.configProtocol.config;
  }

  ngOnInit() {
    this.connectionStateSubscription =
      this.deviceMgr.connectionState$.subscribe(
        (connectionState) => (this.connectionState = connectionState)
      );
    this.readStateSubscription = this.deviceMgr.busyReadState$.subscribe(
      (readState) => (this.readState = readState)
    );
    this.writeStateSubscription = this.deviceMgr.busyWriteState$.subscribe(
      (writeState) => (this.writeState = writeState)
    );
    this.configSubscription = this.deviceMgr.configProtocol.config
      .asObservable()
      .subscribe();
  }

  async readMMSI() {
    await this.deviceMgr.configProtocol.readMmsi();
  }
  async readWaypoints() {
    await this.deviceMgr.configProtocol.readWaypoints();
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

  getDraftWaypoints() {
    return this.config.getValue().draftWaypoints;
  }
  draftEditWaypoint(wp: Waypoint) {
    const draftWaypoints = this.config.getValue().draftWaypoints;
    if (draftWaypoints) {
      this.waypointEditor.editWaypoint(wp, (wpFormData) =>
        draftWaypoints.editWaypoint(
          wp,
          wpFormData.name,
          wpFormData.lat,
          wpFormData.lon
        )
      );
    }
  }
  draftDeleteWaypoint(wp: Waypoint) {
    const draftWaypoints = this.config.getValue().draftWaypoints;
    if (draftWaypoints) {
      draftWaypoints.deleteWaypoint(wp);
    }
  }
  draftAddWaypoint() {
    const draftWaypoints = this.config.getValue().draftWaypoints;
    this.waypointEditor.createWaypoint((wpFormData) =>
      draftWaypoints?.addWaypoint(wpFormData)
    );
  }
  draftCancel() {
    this.deviceMgr.configProtocol.cancelDraftWaypoints();
  }
  saveDraft() {
    this.deviceMgr.configProtocol.writeDraftWaypoints();
  }
  isPendingDraft() {
    return this.config.getValue().draftWaypoints?.dirty;
  }
  hex = hex;
}
