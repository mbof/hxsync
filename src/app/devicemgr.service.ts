/// <reference types="w3c-web-usb" />

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum DeviceConnectionState {
  Disconnected = 0,
  Connecting = 1,
  Connected = 2,
}

@Injectable({
  providedIn: 'root'
})
export class DevicemgrService {
  readonly usb: USB;
  private _connectionState = new BehaviorSubject<DeviceConnectionState>(
    DeviceConnectionState.Disconnected);
  connectionState$ = this._connectionState.asObservable();
  device?: USBDevice;
  constructor() {
    this.usb = navigator.usb;
  }
  getConnectionState(): DeviceConnectionState {
    return this._connectionState.getValue();
  }
  connect() {
    if (this.getConnectionState() != DeviceConnectionState.Disconnected) {
      console.log(`Cannot connect from state: ${this.getConnectionState()}`);
      return;
    }
    this._connectionState.next(DeviceConnectionState.Connecting);
    this.usb.requestDevice(
      {
        filters: [{ "vendorId": 9898, "productId": 30 }]
      }
    ).then((device) => {
      this.device = device;
      this._connectionState.next(DeviceConnectionState.Connected);
      console.log('Connected');
    }).catch((e) => {
      this._connectionState.next(DeviceConnectionState.Disconnected);
      this.device = undefined;
      console.error(`Disconnected: ${e}`);
    });
    this.usb.addEventListener('disconnect', (ev) => {
      if (ev.device == this.device) {
        console.log('Detected disconnection');
        this.disconnect();
      }
      console.log('Detected disconnection of a different device');
    });
  }
  disconnect() {
    if (this.getConnectionState() != DeviceConnectionState.Connected) {
      console.log(`Cannot disconnect from state: ${this.getConnectionState()}`);
      return;
    }
    this.device?.forget()
      .then(() => {
        this.device = undefined;
        this._connectionState.next(DeviceConnectionState.Disconnected);
        console.log('Disconnected');
      })
      .catch((e) => {
        this.device = undefined;
        console.error(`Error while forgetting: ${e}`);
      });
  }

}
