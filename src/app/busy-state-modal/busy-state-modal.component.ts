import { Component } from '@angular/core';
import { DeviceTaskState } from '../configprotocol';

@Component({
  selector: 'busy-state-modal',
  standalone: true,
  imports: [],
  templateUrl: './busy-state-modal.component.html',
  styleUrl: './busy-state-modal.component.css'
})
export class BusyStateModalComponent {
  public state: DeviceTaskState = 'idle';
  setState(state: DeviceTaskState) {
    this.state = state;
  }
}
