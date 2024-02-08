import { BehaviorSubject } from 'rxjs';
import { DevicemgrService } from './devicemgr.service';
import { Message, hex, hexarr, unhex } from './message';
import { Waypoint, waypointFromConfig } from './waypoint';

async function asyncWithTimeout<T>(asyncPromise: Promise<T>, timeoutMs: number): Promise<T> {
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
  atis?: string;
  gpslog?: Uint8Array;
};

export class ConfigProtocol {
  constructor(private dev: DevicemgrService) {}

  config: BehaviorSubject<Config> = new BehaviorSubject({});

  async sendMessage(type: string, args?: Array<string> | undefined, timeoutMs?: number | undefined) {
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
    await this.sendMessage('#CEPWR', [hex(offset, 4), hex(data.length, 2), str]);
    let ans = await this.receiveMessage();
    if (ans.type != '#CMDOK') {
      throw new Error('Device did not acknowledge write');
    }
  }

  async readMmsi() {
    let mmsiBytes = await this.readConfigMemory(0x00b0, 6);
    let mmsi = hexarr(mmsiBytes).slice(0, 9);
    this.config.next({ ...this.config.getValue(), mmsi: mmsi });
  }

  async readWaypoints() {
    let wpBegin = 0xd700; // 0x4300 on other models
    let wpNum = 250; // 200 on other models
    let wpEnd = wpBegin + 32 * wpNum; // = 0xF640;
    let wpChunkSize = 0x40;
    let wpData = new Uint8Array(wpEnd - wpBegin);
    for (var address = wpBegin; address < wpEnd; address += wpChunkSize) {
      wpData.set(await this.readConfigMemory(address, wpChunkSize), address - wpBegin);
    }
    let waypoints = [];
    for (var waypointId = 0; waypointId < wpNum; waypointId += 1) {
      let wpOffset = waypointId * 32;
      let waypoint = waypointFromConfig(wpData.slice(wpOffset, wpOffset + 32), wpBegin + wpOffset);
      if (waypoint) {
        waypoints.push(waypoint);
      }
    }
    this.config.next({ ...this.config.getValue(), waypoints: waypoints });
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
    await this.waitForGps();
    let rawGpslog: Uint8Array[] = [];
    this.sendMessage('$PMTK', ['622', '1']);
    let ans = await this.receiveMessage();
    if (ans.type != '$PMTK' || ans.args.length != 3 || ans.args[0] != 'LOX' || ans.args[1] != '0') {
      throw new Error(`Unexpected log header ${ans.toString()}`);
    }
    let numLines = Number(ans.args[2]);
    let expectedLineNum = 0;
    let line = await this.receiveMessage();
    // 2 arguments with line.args[1] == '2' is the log footer.
    while (!(line.args.length == 2 && line.args[1] == '2')) {
      if (line.type != '$PMTK' || line.args.length < 2 || line.args[0] != 'LOX' || line.args[1] != '1') {
        throw new Error(`Unexpected log line ${line.toString()}`);
      }
      if (Number(line.args[2]) != expectedLineNum) {
        throw new Error(`Unexpected log line number ${Number(line.args[2])} (was expecting ${expectedLineNum})`);
      }
      let gpsDataPoints = line.args.slice(3).map(unhex);
      for (let dataPoint of gpsDataPoints) {
        rawGpslog.push(dataPoint);
      }
      expectedLineNum += 1;
      line = await this.receiveMessage();
    }
    if (expectedLineNum != numLines) {
      console.log(`Got ${expectedLineNum} lines, was expecting ${numLines}. Continuing anyway.`);
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
  }
}
