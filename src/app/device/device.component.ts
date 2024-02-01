import { Component } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { Subscription } from 'rxjs';

// debug with: x = ng.getComponent(document.querySelector('app-device'))

@Component({
  selector: 'app-device',
  standalone: true,
  imports: [],
  templateUrl: './device.component.html',
  styleUrl: './device.component.css'
})
export class DeviceComponent {
  subscription?: Subscription;
  connectionState: DeviceConnectionState;
  DCS = DeviceConnectionState;
  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
  }
  ngOnInit() {
    this.subscription = this.deviceMgr.connectionState$.subscribe(
      connectionState => this.connectionState = connectionState
    );
  }
}
