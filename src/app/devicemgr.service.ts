/// <reference types="w3c-web-serial" />

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChunkReader } from './chunkreader';
import { ConfigSession } from './config-session';
import { ConfigProtocol, DatConfigProtocol } from './config-protocol';
import {
  USB_DEVICE_CONFIGS,
  DEVICE_CONFIGS,
  DAT_DEVICE_CONFIGS
} from './config-modules/device-configs';

export enum DeviceMode {
  Unknown = 0,
  CP = 1,
  NMEA = 2
}

export type DeviceConnectionState =
  | 'disconnected'
  | 'usb-connecting'
  | 'usb-connected'
  | 'dat-connected';

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
  private _configProtocol: ConfigProtocol = new ConfigProtocol(this);
  readonly configSession: ConfigSession = new ConfigSession(
    this._configProtocol
  );

  constructor() {
    this.serial = navigator.serial;
  }

  getConnectionState(): DeviceConnectionState {
    return this._connectionState.getValue();
  }

  async connectUsb() {
    if (!this.serial) {
      throw new Error(
        "This browser doesn't support the Webserial API. Use Chrome, Edge, or Opera."
      );
    }
    if (this.getConnectionState() != 'disconnected') {
      throw new Error(
        `Cannot connect from state: ${this.getConnectionState()}`
      );
    }
    try {
      this._connectionState.next('usb-connecting');
      this.port = await this.serial.requestPort({
        filters: [...USB_DEVICE_CONFIGS.values()].filter(
          (f) => f !== undefined
        ) as SerialPortFilter[]
      });
      const portInfo = this.port!.getInfo();
      const [model, _] = [...USB_DEVICE_CONFIGS.entries()].find(
        ([model, filter]) =>
          filter.usbProductId == portInfo.usbProductId &&
          filter.usbVendorId == portInfo.usbVendorId
      )!;
      const deviceConfig = DEVICE_CONFIGS.get(model)!;
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
      this._connectionState.next('usb-connected');
      this.configSession.reset(deviceConfig, this._configProtocol);
      console.log('Connected');
    } catch (e) {
      await this.disconnect();
      throw e;
    }
  }

  async disconnect() {
    if (this._connectionState.getValue() == 'dat-connected') {
      this._connectionState.next('disconnected');
      return;
    }
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
      this.configSession.config.next({});
      console.log('Disconnected');
    } catch (e) {
      this.port = undefined;
      console.error(`Error while disconnecting: ${e}`);
    }
    this.configSession.disconnect();
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

  connectDat(datFile: Uint8Array) {
    if (this.getConnectionState() != 'disconnected') {
      throw new Error(
        `Cannot load DAT from state: ${this.getConnectionState()}`
      );
    }
    const [model, _] = [...DAT_DEVICE_CONFIGS.entries()].find(
      ([_, dat]) =>
        dat &&
        datFile.length == dat.length &&
        dat.magic.every((v, offset) => datFile[offset] == v)
    )!;
    const deviceConfig = DEVICE_CONFIGS.get(model);
    if (!deviceConfig) {
      throw new Error(
        `Unknown DAT file format (length ${datFile.length}, magic ${datFile.subarray(0, 2)}`
      );
    }
    console.log(`Detected DAT file for ${deviceConfig.name}`);
    this.configSession.reset(deviceConfig, new DatConfigProtocol(datFile));
    this._connectionState.next('dat-connected');
  }
}
