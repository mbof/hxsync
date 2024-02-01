/// <reference types="w3c-web-serial" />

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum DeviceConnectionState {
  Disconnected = 0,
  Connecting = 1,
  Connected = 2,
}

export enum DeviceMode {
  Unknown = 0,
  CP = 1,
  NMEA = 2,
}

@Injectable({
  providedIn: 'root'
})
export class DevicemgrService {

  readonly serial: Serial;
  private _connectionState = new BehaviorSubject<DeviceConnectionState>(
    DeviceConnectionState.Disconnected);
  connectionState$ = this._connectionState.asObservable();
  port?: SerialPort;
  reader?: ReadableStreamDefaultReader;
  writer?: WritableStreamDefaultWriter;
  readonly encoder: TextEncoder = new TextEncoder();
  readonly decoder: TextDecoder = new TextDecoder('utf-8');
  mode: DeviceMode = DeviceMode.Unknown;

  constructor() {
    this.serial = navigator.serial;
  }

  getConnectionState(): DeviceConnectionState {
    return this._connectionState.getValue();
  }

  async connect() {
    if (this.getConnectionState() != DeviceConnectionState.Disconnected) {
      throw new Error(`Cannot connect from state: ${this.getConnectionState()}`);
    }
    try {
      this._connectionState.next(DeviceConnectionState.Connecting);
      this.port = await this.serial.requestPort({
        filters: [{ "usbVendorId": 9898, "usbProductId": 30 }]
      });
      this.port.addEventListener('disconnect', (ev) => this.disconnect());
      await this.port.open({ baudRate: 9600 });
      this.reader = this.port?.readable?.getReader();
      this.writer = this.port?.writable?.getWriter();
      await this.detectDeviceMode();
      this._connectionState.next(DeviceConnectionState.Connected);
      console.log('Connected');
    } catch(e) {
      console.error(`Error while connecting: ${e}`);
      await this.disconnect();
    };
  }

  async disconnect() {
    try {
      await this.writer?.close();
      await this.reader?.cancel();
      this.reader?.releaseLock();
      this.writer?.releaseLock();
      await this.port?.forget();
      this.port = undefined;
      this.reader = undefined;
      this.writer = undefined;
      this.mode = DeviceMode.Unknown;
      this._connectionState.next(DeviceConnectionState.Disconnected);
      console.log('Disconnected');
    } catch(e) {
      this.port = undefined;
      console.error(`Error while forgetting: ${e}`);
    };
  }

  async write(s: string) {
    return this.writer?.write(this.encoder.encode(s));
  }

  async read(): Promise<string> {
    const readResult = await this.reader?.read();
    if (readResult?.done) {
      throw new Error('Read is all done');        
    }
    return this.decoder.decode(readResult?.value);
  }

  async detectDeviceMode() {
    await this.write('P?');
    const ans = await this.read();
    if (ans[0] == '@') {
      this.mode = DeviceMode.CP;
    } else if (ans[0] == 'P' || ans[0] == '$') {
      this.mode = DeviceMode.NMEA;
    }
    console.log(`Detected mode ${this.mode}`);
  }

}
