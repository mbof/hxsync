import { Component } from '@angular/core';
import { DeviceConnectionState, DevicemgrService } from '../devicemgr.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { hexarr } from '../message';

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
  mmsi: BehaviorSubject<string> = new BehaviorSubject('');
  mmsiSubscription?: Subscription;

  constructor(public deviceMgr: DevicemgrService) {
    this.connectionState = deviceMgr.getConnectionState();
  }

  ngOnInit() {
    this.connectionStateSubscription = this.deviceMgr.connectionState$.subscribe(
      connectionState => this.connectionState = connectionState
    );
    this.readStateSubscription = this.deviceMgr.busyReadState$.subscribe(
      readState => this.readState = readState
    );
    this.writeStateSubscription = this.deviceMgr.busyWriteState$.subscribe(
      writeState => this.writeState = writeState
    );
    this.mmsiSubscription = this.mmsi.asObservable().subscribe();
  }

  async readConfig() {
    let mmsiBytes = await this.deviceMgr.configProtocol.readConfigMemory(0x00b0, 6);
    this.mmsi.next(hexarr(mmsiBytes));
  }
}
