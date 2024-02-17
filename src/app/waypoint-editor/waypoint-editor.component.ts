import { Component, Input } from '@angular/core';
import { Waypoint, WaypointData } from '../waypoint';
import { NgForm, FormsModule } from '@angular/forms';

type WpFormData = {
  name: string;
  lat: string;
  lon: string;
};

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
  ngOnInit() {}
  onSubmit(f: NgForm) {
    this.shown = false;
    console.log(`Submitted form ${f}`);
    if (this.callbackFn && this.wpFormData) {
      this.callbackFn(this.wpFormData);
    }
  }
  onCancel(f: NgForm) {
    console.log(`Canceled form ${f}`);
    this.shown = false;
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
