/// <reference types="w3c-web-serial" />

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChunkReader } from './chunkreader';
import { ConfigProtocol } from './configprotocol';

export enum DeviceMode {
  Unknown = 0,
  CP = 1,
  NMEA = 2
}

export type DeviceConfig = {
  name: string;
  usbFilter: {
    usbVendorId: number;
    usbProductId: number;
  };
  waypointsStartAddress: number;
  waypointsNumber: number;
};

const DEVICE_CONFIGS: DeviceConfig[] = [
  {
    name: 'HX890',
    usbFilter: { usbVendorId: 9898, usbProductId: 30 },
    waypointsStartAddress: 0xd700,
    waypointsNumber: 250
  },
  {
    name: 'HX870',
    usbFilter: { usbVendorId: 9898, usbProductId: 16 },
    waypointsStartAddress: 0x4300,
    waypointsNumber: 200
  }
];

export type DeviceConnectionState = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root'
})
export class DevicemgrService {
  readonly serial: Serial;
  private _connectionState = new BehaviorSubject<DeviceConnectionState>(
    'disconnected'
  );
  connectionState$ = this._connectionState.asObservable();
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
    if (this.getConnectionState() != 'disconnected') {
      throw new Error(
        `Cannot connect from state: ${this.getConnectionState()}`
      );
    }
    try {
      this._connectionState.next('connecting');
      this.port = await this.serial.requestPort({
        filters: DEVICE_CONFIGS.map((conf) => conf.usbFilter)
      });
      const portInfo = this.port!.getInfo();
      const deviceConfig = DEVICE_CONFIGS.find(
        (conf) =>
          conf.usbFilter.usbProductId == portInfo.usbProductId &&
          conf.usbFilter.usbVendorId == portInfo.usbVendorId
      )!;
      console.log(`Found device ${deviceConfig.name}`);
      this.port.addEventListener('disconnect', (ev) => this.disconnect());
      await this.port.open({ baudRate: 9600 });
      this._streamReader = this.port?.readable?.getReader();
      this.reader = new ChunkReader(this._streamReader!);
      this.writer = this.port?.writable?.getWriter();
      await this.detectDeviceMode();
      if (this.mode != DeviceMode.CP) {
        throw new Error('Device must be in CP mode');
      }
      this._connectionState.next('connected');
      this.configProtocol.reset(deviceConfig);
      console.log('Connected');
    } catch (e) {
      console.error(`Error while connecting: ${e}`);
      await this.disconnect();
    }
  }

  async disconnect() {
    try {
      await this.writer?.close();
      await this._streamReader?.cancel();
      this._streamReader?.releaseLock();
      this.writer?.releaseLock();
      await this.port?.close();
      await this.port?.forget();
      this.port = undefined;
      this._streamReader = undefined;
      this.reader = undefined;
      this.writer = undefined;
      this.mode = DeviceMode.Unknown;
      this.configProtocol.config.next({});
      console.log('Disconnected');
    } catch (e) {
      this.port = undefined;
      console.error(`Error while disconnecting: ${e}`);
    }
    this._connectionState.next('disconnected');
  }

  async write(s: string) {
    await this.writer?.write(this.encoder.encode(s));
  }

  async read(length: number): Promise<string> {
    let ans = await this.reader!.read(length);
    return ans;
  }

  async readline(): Promise<string> {
    let line = await this.reader!.readline();
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
