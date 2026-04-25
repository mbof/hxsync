import { Component, Input } from '@angular/core';
import { Waypoint, WaypointData, parseAndCheckWaypointData } from '../waypoint';
import { NgForm, FormsModule } from '@angular/forms';
import { WpFormData } from '../waypoint';

@Component({
  selector: 'waypoint-editor',
  imports: [FormsModule],
  templateUrl: './waypoint-editor.component.html',
  styleUrl: './waypoint-editor.component.css'
})
export class WaypointEditorComponent {
  editing = false;
  shown = true;
  wpFormData?: WpFormData;
  callbackFn?: (wpData: WpFormData) => void;
  errorMsg?: string;
  ngOnInit() {}
  onSubmit(f: NgForm) {
    if (!this.wpFormData) {
      this.shown = false;
      return;
    }
    var wpFormData = this.wpFormData;
    try {
      const unused = parseAndCheckWaypointData(wpFormData);
    } catch (e: any) {
      this.errorMsg = e.toString();
      return;
    }

    this.shown = false;
    this.wpFormData = undefined;
    this.errorMsg = undefined;
    console.log(`Submitted form ${f}`);
    if (this.callbackFn) {
      this.callbackFn(wpFormData);
    }
  }
  onCancel(f: NgForm) {
    console.log(`Canceled form ${f}`);
    this.shown = false;
    this.wpFormData = undefined;
    this.errorMsg = undefined;
    return false;
  }
  editWaypoint(wp: Waypoint, callbackFn?: (wpData: WpFormData) => void) {
    this.shown = true;
    this.editing = true;
    this.wpFormData = {
      name: wp.wp.name,
      lat: wp.getLat(),
      lon: wp.getLon()
    };
    this.callbackFn = callbackFn;
  }
  createWaypoint(
    callbackFn?: (wpData: WpFormData) => void,
    initialData?: Partial<WpFormData>
  ) {
    this.editing = false;

    let initialLon = initialData?.lon || '';
    if (initialLon && !isNaN(Number(initialLon))) {
      let lon = Number(initialLon);
      lon = ((lon % 360) + 360) % 360;
      if (lon > 180) {
        lon -= 360;
      }
      initialLon = lon.toFixed(5);
    }

    this.wpFormData = {
      name: initialData?.name || '',
      lat: initialData?.lat || '',
      lon: initialLon as string
    };
    this.shown = true;
    this.callbackFn = callbackFn;
  }
}
