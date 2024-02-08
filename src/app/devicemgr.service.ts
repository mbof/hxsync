/// <reference types="w3c-web-serial" />

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChunkReader } from './chunkreader';
import { ConfigProtocol } from './configprotocol';

export enum DeviceConnectionState {
  Disconnected = 0,
  Connecting = 1,
  Connected = 2
}

export enum DeviceMode {
  Unknown = 0,
  CP = 1,
  NMEA = 2
}

@Injectable({
  providedIn: 'root'
})
export class DevicemgrService {
  readonly serial: Serial;
  private _connectionState = new BehaviorSubject<DeviceConnectionState>(DeviceConnectionState.Disconnected);
  connectionState$ = this._connectionState.asObservable();
  private _busyWriteState = new BehaviorSubject<boolean>(false);
  private _busyReadState = new BehaviorSubject<boolean>(false);
  busyWriteState$ = this._busyWriteState.asObservable();
  busyReadState$ = this._busyReadState.asObservable();
  port?: SerialPort;
  private _streamReader?: ReadableStreamDefaultReader;
  reader?: ChunkReader;
  writer?: WritableStreamDefaultWriter;
  readonly encoder: TextEncoder = new TextEncoder();
  readonly decoder: TextDecoder = new TextDecoder('utf-8');
  mode: DeviceMode = DeviceMode.Unknown;
  readonly configProtocol: ConfigProtocol = new ConfigProtocol(this);

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
        filters: [{ usbVendorId: 9898, usbProductId: 30 }]
      });
      this.port.addEventListener('disconnect', (ev) => this.disconnect());
      await this.port.open({ baudRate: 9600 });
      this._streamReader = this.port?.readable?.getReader();
      this.reader = new ChunkReader(this._streamReader!);
      this.writer = this.port?.writable?.getWriter();
      await this.detectDeviceMode();
      this._connectionState.next(DeviceConnectionState.Connected);
      console.log('Connected');
    } catch (e) {
      console.error(`Error while connecting: ${e}`);
      await this.disconnect();
    }
  }

  async disconnect() {
    try {
      if (!this.writer?.closed) {
        await this.writer?.close();
      }
      if (!this._streamReader?.closed) {
        await this._streamReader?.cancel();
      }
      this._streamReader?.releaseLock();
      this.writer?.releaseLock();
      await this.port?.forget();
      this.port = undefined;
      this._streamReader = undefined;
      this.reader = undefined;
      this.writer = undefined;
      this.mode = DeviceMode.Unknown;
      this._connectionState.next(DeviceConnectionState.Disconnected);
      this.configProtocol.config.next({});
      this._busyReadState.next(false);
      this._busyWriteState.next(false);
      console.log('Disconnected');
    } catch (e) {
      this.port = undefined;
      console.error(`Error while forgetting: ${e}`);
    }
  }

  async write(s: string) {
    this._busyWriteState.next(true);
    await this.writer?.write(this.encoder.encode(s));
    this._busyWriteState.next(false);
  }

  async read(length: number): Promise<string> {
    this._busyReadState.next(true);
    let ans = await this.reader!.read(length);
    this._busyReadState.next(false);
    return ans;
  }

  async readline(): Promise<string> {
    this._busyReadState.next(true);
    let line = await this.reader!.readline();
    this._busyReadState.next(false);
    return line;
  }

  flushInput() {
    if (this.reader) {
      this.reader.flush();
    }
  }

  async detectDeviceMode() {
    await this.write('P?');
    const ans = await this.read(1);
    if (ans[0] == '@') {
      this.mode = DeviceMode.CP;
    } else if (ans[0] == 'P' || ans[0] == '$') {
      this.mode = DeviceMode.NMEA;
    }
    console.log(`Detected mode ${this.mode}`);
  }
}
