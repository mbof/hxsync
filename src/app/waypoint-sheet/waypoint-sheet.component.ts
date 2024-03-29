import { Component, ViewChild } from '@angular/core';
import { WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';
import { DraftWaypoints, Waypoint } from '../waypoint';
import { hex } from '../message';
import { DevicemgrService } from '../devicemgr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'waypoint-sheet',
  standalone: true,
  templateUrl: './waypoint-sheet.component.html',
  styleUrl: './waypoint-sheet.component.css',
  imports: [WaypointEditorComponent]
})
export class WaypointSheetComponent {
  shown = false;
  @ViewChild(WaypointEditorComponent) waypointEditor!: WaypointEditorComponent;
  configSubscription?: Subscription;

  constructor(public deviceMgr: DevicemgrService) {}

  ngOnInit() {
    this.deviceMgr.configProtocol.deviceTaskState$.subscribe(
      (deviceTaskState) => {
        if (['waypoints-edit', 'waypoints-write'].includes(deviceTaskState)) {
          this.shown = true;
        } else {
          this.shown = false;
        }
      }
    );
    this.configSubscription = this.deviceMgr.configProtocol.config
      .asObservable()
      .subscribe();
  }

  getDraftWaypoints() {
    return this.deviceMgr.configProtocol.config.getValue().draftWaypoints;
  }
  draftEditWaypoint(wp: Waypoint) {
    const draftWaypoints = this.getDraftWaypoints();
    if (draftWaypoints) {
      this.waypointEditor.editWaypoint(wp, (wpFormData) =>
        draftWaypoints?.editWaypoint(
          wp,
          wpFormData.name,
          wpFormData.lat,
          wpFormData.lon
        )
      );
    }
  }
  draftDeleteWaypoint(wp: Waypoint) {
    const draftWaypoints = this.getDraftWaypoints();
    if (draftWaypoints) {
      draftWaypoints.deleteWaypoint(wp);
    }
  }
  draftAddWaypoint() {
    const draftWaypoints = this.getDraftWaypoints();
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
    return this.getDraftWaypoints()?.dirty;
  }
  hex = hex;
}
