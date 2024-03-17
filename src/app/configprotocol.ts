import { BehaviorSubject, max, range } from 'rxjs';
import { DeviceConfig, DevicemgrService } from './devicemgr.service';
import { Message, hex, hexarr, unhex } from './message';
import {
  DraftWaypoints,
  Waypoint,
  waypointFromConfig,
  WAYPOINTS_BYTE_SIZE
} from './waypoint';

async function asyncWithTimeout<T>(
  asyncPromise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutHandle: any;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
}

export type Config = {
  mmsi?: string;
  waypoints?: Array<Waypoint>;
  draftWaypoints?: DraftWaypoints;
  atis?: string;
  gpslog?: Uint8Array;
};

export type DeviceTaskState =
  | 'idle'
  | 'gpslog-read'
  | 'waypoints-read'
  | 'waypoints-edit'
  | 'waypoints-save';

export class ConfigProtocol {
  private _deviceConfig?: DeviceConfig;
  constructor(private dev: DevicemgrService) {}

  config: BehaviorSubject<Config> = new BehaviorSubject({});

  private _deviceTaskState = new BehaviorSubject<DeviceTaskState>('idle');
  deviceTaskState$ = this._deviceTaskState.asObservable();

  private _gpsDownloadProgress = new BehaviorSubject<number>(0);
  gpsDownloadProgress$ = this._gpsDownloadProgress.asObservable();

  reset(deviceConfig: DeviceConfig) {
    this.config.next({});
    this._deviceTaskState.next('idle');
    this._deviceConfig = deviceConfig;
  }

  async sendMessage(
    type: string,
    args?: Array<string> | undefined,
    timeoutMs?: number | undefined
  ) {
    let str = new Message({ type: type, args: args }).toString();
    if (!timeoutMs) {
      await this.dev.write(str);
    } else {
      await asyncWithTimeout(this.dev.write(str), timeoutMs);
    }
    console.log(`Wrote command ${JSON.stringify(str)}`);
  }

  async receiveMessage(timeoutMs?: number | undefined) {
    let line;
    if (!timeoutMs) {
      line = await this.dev.readline();
    } else {
      line = await asyncWithTimeout(this.dev.readline(), timeoutMs);
    }
    console.log(`Received line ${line}`);
    return new Message({ encoded: line });
  }

  async waitForReady_() {
    let radio_status = '';
    while (radio_status != '00') {
      this.dev.flushInput();
      await this.sendMessage('#CEPSR', ['00']);
      let ans1 = await this.receiveMessage();
      if (ans1.type != '#CMDOK') {
        throw new Error('Device did not acknowledge status request');
      }
      let ans2 = await this.receiveMessage();
      if (ans2.type != '#CEPSD') {
        throw new Error('Device did not return status');
      }
      radio_status = ans2.args[0];
      if (radio_status != '00') {
        console.log(`Waiting for radio, state=${radio_status}`);
      }
      this.sendMessage('#CMDOK');
    }
  }
  async waitForReady() {
    await asyncWithTimeout(this.waitForReady_(), 1000);
  }

  async readConfigMemory(offset: number, length: number): Promise<Uint8Array> {
    await this.waitForReady();
    await this.sendMessage('#CEPRD', [hex(offset, 4), hex(length, 2)]);
    let ans1 = await this.receiveMessage();
    if (ans1.type != '#CMDOK') {
      throw new Error('Device did not acknowledge read');
    }
    let ans2 = await this.receiveMessage();
    if (ans2.type != '#CEPDT') {
      throw new Error('Device did not reply with data');
    }
    this.sendMessage('#CMDOK');
    return unhex(ans2.args[2]);
  }

  async writeConfigMemory(offset: number, data: Uint8Array) {
    await this.waitForReady();
    let str = hexarr(data);
    await this.sendMessage('#CEPWR', [
      hex(offset, 4),
      hex(data.length, 2),
      str
    ]);
    let ans = await this.receiveMessage();
    if (ans.type != '#CMDOK') {
      throw new Error('Device did not acknowledge write');
    }
  }

  // Used to refresh config after in-place changes to drafts
  private noopConfigCallback() {
    return () => this.config.next(this.config.getValue());
  }

  async readWaypoints() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't read waypoints from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('waypoints-read');
    let wpBegin = this._deviceConfig!.waypointsStartAddress;
    let wpNum = this._deviceConfig!.waypointsNumber;
    let wpEnd = wpBegin + WAYPOINTS_BYTE_SIZE * wpNum;
    let wpChunkSize = 0x40;
    let wpData = new Uint8Array(wpEnd - wpBegin);
    for (var address = wpBegin; address < wpEnd; address += wpChunkSize) {
      wpData.set(
        await this.readConfigMemory(address, wpChunkSize),
        address - wpBegin
      );
    }
    let waypoints = [];
    for (var waypointId = 0; waypointId < wpNum; waypointId += 1) {
      let wpOffset = waypointId * 32;
      let waypoint = waypointFromConfig(
        wpData.subarray(wpOffset, wpOffset + 32),
        wpBegin + wpOffset
      );
      if (waypoint) {
        waypoints.push(waypoint);
      }
    }
    this.config.next({
      ...this.config.getValue(),
      waypoints: waypoints,
      draftWaypoints: new DraftWaypoints(
        waypoints,
        this._deviceConfig!.waypointsNumber,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('waypoints-edit');
  }

  async writeDraftWaypoints() {
    if (this._deviceTaskState.getValue() != 'waypoints-edit') {
      throw new Error(
        `Can't write draft from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('waypoints-save');
    const draftWaypoints = this.config.getValue().draftWaypoints;
    if (!draftWaypoints) {
      console.log('No draft waypoints');
      this._deviceTaskState.next('idle');
      return;
    }
    const wpData = draftWaypoints?.getBinaryData(
      this._deviceConfig!.waypointsStartAddress
    );
    if (!wpData) {
      throw new Error('Error getting draft binary data');
    }
    // Do the writing in chunks
    let wpChunkSize = 0x40;
    for (let offset = 0; offset < wpData.length; offset += wpChunkSize) {
      const address = this._deviceConfig!.waypointsStartAddress + offset;
      await this.writeConfigMemory(
        address,
        wpData.subarray(offset, offset + wpChunkSize)
      );
    }
    this.config.next({
      ...this.config.getValue(),
      waypoints: draftWaypoints.waypoints,
      draftWaypoints: new DraftWaypoints(
        draftWaypoints.waypoints,
        this._deviceConfig!.waypointsNumber,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('idle');
  }

  cancelDraftWaypoints() {
    if (this._deviceTaskState.getValue() != 'waypoints-edit') {
      throw new Error(
        `Can't cancel draft from state ${this._deviceTaskState.getValue()}`
      );
    }
    const waypoints = this.config.getValue().waypoints;
    if (!waypoints) {
      console.log('No waypoints yet');
      this._deviceTaskState.next('idle');
      return;
    }
    this.config.next({
      ...this.config.getValue(),
      draftWaypoints: new DraftWaypoints(
        waypoints,
        this._deviceConfig!.waypointsNumber,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('idle');
  }

  async waitForGps_() {
    while (true) {
      this.dev.flushInput();
      this.sendMessage('$PMTK', ['000']);
      let ans = await this.receiveMessage();
      if (
        ans.type == '$PMTK' &&
        ans.args.length == 3 &&
        ans.args[0] == '001' &&
        ans.args[1] == '0' &&
        ans.args[2] == '3'
      ) {
        return;
      }
    }
  }
  async waitForGps() {
    await asyncWithTimeout(this.waitForGps_(), 1000);
  }

  async readGpsLog() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't start reading GPS from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('gpslog-read');
    this._gpsDownloadProgress.next(0);
    await this.waitForGps();
    let rawGpslog: Uint8Array[] = [];
    this.sendMessage('$PMTK', ['622', '1']);
    let ans = await this.receiveMessage();
    if (
      ans.type != '$PMTK' ||
      ans.args.length != 3 ||
      ans.args[0] != 'LOX' ||
      ans.args[1] != '0'
    ) {
      throw new Error(`Unexpected log header ${ans.toString()}`);
    }
    let numLines = Number(ans.args[2]);
    let expectedLineNum = 0;
    let line = await this.receiveMessage();
    // 2 arguments with line.args[1] == '2' is the log footer.
    while (!(line.args.length == 2 && line.args[1] == '2')) {
      if (
        line.type != '$PMTK' ||
        line.args.length < 2 ||
        line.args[0] != 'LOX' ||
        line.args[1] != '1'
      ) {
        throw new Error(`Unexpected log line ${line.toString()}`);
      }
      if (Number(line.args[2]) != expectedLineNum) {
        throw new Error(
          `Unexpected log line number ${Number(line.args[2])} (was expecting ${expectedLineNum})`
        );
      }
      let gpsDataPoints = line.args.slice(3).map(unhex);
      for (let dataPoint of gpsDataPoints) {
        rawGpslog.push(dataPoint);
      }
      this._gpsDownloadProgress.next(expectedLineNum / numLines);
      expectedLineNum += 1;
      line = await this.receiveMessage();
    }
    if (expectedLineNum != numLines) {
      console.log(
        `Got ${expectedLineNum} lines, was expecting ${numLines}. Continuing anyway.`
      );
    }
    let logSize = rawGpslog.reduce((s, arr) => s + arr.length, 0);
    let gpslog = new Uint8Array(logSize);
    let offset = 0;
    for (let logChunk of rawGpslog) {
      gpslog.set(logChunk, offset);
      offset += logChunk.length;
    }
    ans = await this.receiveMessage();
    if (
      ans.type != '$PMTK' ||
      ans.args.length != 3 ||
      ans.args[0] != '001' ||
      ans.args[1] != '622' ||
      ans.args[2] != '3'
    ) {
      throw new Error(`Unexpected ReadLog acknowledgement ${ans.toString()}`);
    }
    this.config.next({ ...this.config.getValue(), gpslog: gpslog });
    this._deviceTaskState.next('idle');
  }
}
