import { Component, Input } from '@angular/core';
import { Waypoint, WaypointData, parseAndCheckWaypointData } from '../waypoint';
import { NgForm, FormsModule } from '@angular/forms';
import { WpFormData } from '../waypoint';

@Component({
  selector: 'waypoint-editor',
  standalone: true,
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
  createWaypoint(callbackFn?: (wpData: WpFormData) => void) {
    this.editing = false;
    this.wpFormData = {
      name: '',
      lat: '',
      lon: ''
    };
    this.shown = true;
    this.callbackFn = callbackFn;
  }
}
