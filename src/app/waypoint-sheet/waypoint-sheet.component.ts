import { Component, ViewChild } from '@angular/core';
import { WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';
import { Waypoint } from '../waypoint';
import { hex } from '../message';
import { DevicemgrService } from '../devicemgr.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'waypoint-sheet',
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
    this.deviceMgr.configSession.deviceTaskState$.subscribe(
      (deviceTaskState) => {
        if (deviceTaskState == 'nav-edit' || deviceTaskState == 'nav-save') {
          this.shown = true;
        } else {
          this.shown = false;
        }
      }
    );
    this.configSubscription = this.deviceMgr.configSession.config
      .asObservable()
      .subscribe();
  }

  getDraftWaypoints() {
    return this.deviceMgr.configSession.config.getValue().draftWaypoints;
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
    this.deviceMgr.configSession.cancelNavInfoDraft();
  }
  saveDraft() {
    this.deviceMgr.configSession.writeNavInfoDraft();
  }
  isPendingDraft() {
    return this.getDraftWaypoints()?.dirtyWaypoints;
  }
  hex = hex;
}
