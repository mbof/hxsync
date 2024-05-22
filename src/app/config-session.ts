import { BehaviorSubject } from 'rxjs';
import { DeviceConfig } from './devicemgr.service';
import { unhex } from './message';
import { Waypoint, waypointFromConfig, WAYPOINTS_BYTE_SIZE } from './waypoint';
import { NavInfoDraft } from './nav-info-draft';
import { routeFromConfig } from './route';
import {
  MmsiDirectory,
  MMSI_NAME_BYTE_SIZE,
  numberOffsetFromIndex
} from './mmsi';
import { ConfigProtocolInterface, DatConfigProtocol } from './config-protocol';
import { ConfigBatchReader } from './config-batch-reader';
import { Document } from 'yaml';
import { CONFIG_MODULE_CONSTRUCTORS } from './config-modules/module-list';

export type Config = {
  mmsi?: string;
  waypoints?: Array<Waypoint>;
  draftWaypoints?: NavInfoDraft;
  atis?: string;
  gpslog?: Uint8Array;
  mmsiDirectory?: MmsiDirectory;
};

// TODO: refactor this into
// a distinct class for each of nav / mmsi / yaml
// and an orthogonal read / edit / save state
export type DeviceTaskState =
  | 'idle'
  | 'gpslog-read'
  | 'nav-read'
  | 'nav-edit'
  | 'nav-save'
  | 'mmsi-read'
  | 'mmsi-edit'
  | 'mmsi-save'
  | 'yaml-read'
  | 'yaml-edit'
  | 'yaml-save';

export type MemoryRangeId =
  | 'individual_mmsi_names'
  | 'individual_mmsi_numbers'
  | 'group_mmsi_names'
  | 'group_mmsi_numbers';

/*
 * State machine transitions:
 * idle --readGps()--> gpslog-read --(wait)--> idle
 * idle --readNavInfo()--> nav-read --(wait)--> nav-edit (success) / idle (error)
 * nav-edit --writeNavInfoDraft()--> nav-save --(wait)--> idle
 * nav-edit --cancelNavInfoDraft()--> idle
 * idle --readMmsiDirectory()--> mmsi-read --(wait)--> mmsi-edit (success) / idle (error)
 * mmsi-edit --writeMmsiDirectory()--> mmsi-save --(wait)--> idle
 * idle --startYamlEdit()--> yaml-read --(wait)--> yaml-edit (success) / idle (error)
 * yaml-edit --writeYamlEdit()--> yaml-save --(wait)--> idle
 * yaml-edit --cancelYamlEdit()--> idle
 */

export class ConfigSession {
  public _deviceConfig?: DeviceConfig;
  constructor(private _configProtocol: ConfigProtocolInterface) {}

  config: BehaviorSubject<Config> = new BehaviorSubject({});
  yaml: BehaviorSubject<Document> = new BehaviorSubject(new Document());

  private _deviceTaskState = new BehaviorSubject<DeviceTaskState>('idle');
  deviceTaskState$ = this._deviceTaskState.asObservable();

  private _progress = new BehaviorSubject<number>(0);
  progress$ = this._progress.asObservable();

  reset(deviceConfig: DeviceConfig, configProtocol: ConfigProtocolInterface) {
    this.config.next({});
    this._deviceTaskState.next('idle');
    this._configProtocol = configProtocol;
    this._deviceConfig = deviceConfig;
  }

  // Used to refresh config after in-place changes to drafts
  private noopConfigCallback() {
    return () => this.config.next(this.config.getValue());
  }

  async readNavInfo() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't read waypoints from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('nav-read');
    this._progress.next(0);

    // Sizing info
    const chunkSize = 0x40;
    const wpNum = this._deviceConfig!.waypointsNumber;
    const wpSize = WAYPOINTS_BYTE_SIZE * wpNum;
    const routeNum = this._deviceConfig!.routesNumber;
    const routeSize = this._deviceConfig!.routeBytes * routeNum;

    // Read waypoints
    const wpBegin = this._deviceConfig!.waypointsStartAddress;
    const wpData = await this._configProtocol.readConfigMemory(
      wpBegin,
      wpSize,
      (offset) => this._progress.next(offset / (wpSize + routeSize))
    );
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

    // Read routes
    const routeBegin = this._deviceConfig!.routesStartAddress;
    const routeData = await this._configProtocol.readConfigMemory(
      routeBegin,
      routeSize,
      (offset) => this._progress.next((wpSize + offset) / (wpSize + routeSize))
    );
    let routes = [];
    for (var routeId = 0; routeId < routeNum; routeId++) {
      let offset = routeId * this._deviceConfig!.routeBytes;
      let route = routeFromConfig(
        routeData.subarray(offset, offset + this._deviceConfig!.routeBytes),
        this._deviceConfig!.numWaypointsPerRoute
      );
      if (route) {
        routes.push(route);
      }
    }

    this.config.next({
      ...this.config.getValue(),
      waypoints: waypoints,
      draftWaypoints: new NavInfoDraft(
        waypoints,
        routes,
        this._deviceConfig!,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('nav-edit');
  }

  async writeNavInfoDraft() {
    if (this._deviceTaskState.getValue() != 'nav-edit') {
      throw new Error(
        `Can't write draft from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('nav-save');
    this._progress.next(0);
    const draftWaypoints = this.config.getValue().draftWaypoints;
    if (!draftWaypoints) {
      console.log('No draft waypoints');
      this._deviceTaskState.next('idle');
      return;
    }
    const wpData = draftWaypoints?.getBinaryWaypointData(
      this._deviceConfig!.waypointsStartAddress
    );
    if (!wpData) {
      throw new Error('Error getting draft binary data');
    }
    const routeData = draftWaypoints?.getBinaryRouteData();
    if (!routeData) {
      throw new Error('Error getting route binary data');
    }
    // Write waypoints
    await this._configProtocol.writeConfigMemory(
      wpData,
      this._deviceConfig!.waypointsStartAddress,
      (offset) =>
        this._progress.next(offset / (wpData.length + routeData.length))
    );

    // Write routes
    await this._configProtocol.writeConfigMemory(
      routeData,
      this._deviceConfig!.routesStartAddress,
      (offset) =>
        this._progress.next(
          (wpData.length + offset) / (wpData.length + routeData.length)
        )
    );
    this.config.next({
      ...this.config.getValue(),
      waypoints: draftWaypoints.waypoints,
      draftWaypoints: new NavInfoDraft(
        draftWaypoints.waypoints,
        [],
        this._deviceConfig!,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('idle');
  }

  cancelNavInfoDraft() {
    if (this._deviceTaskState.getValue() != 'nav-edit') {
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
      draftWaypoints: new NavInfoDraft(
        waypoints,
        [],
        this._deviceConfig!,
        this.noopConfigCallback()
      )
    });
    this._deviceTaskState.next('idle');
  }

  async readMmsiDirectory() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't read MMSI directory from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('mmsi-read');
    this._progress.next(0);

    // Sizing info
    const {
      individualMmsiNamesSize,
      individualMmsiNumbersSize,
      groupMmsiNamesSize,
      groupMmsiNumbersSize,
      totalSize
    } = this.getMmsiMemoryLayout();

    const individualMmsiNamesData = await this._configProtocol.readConfigMemory(
      this._deviceConfig!.individualMmsiNamesAddress,
      individualMmsiNamesSize,
      (offset) => this._progress.next(offset / totalSize)
    );
    let previousOffsets = individualMmsiNamesSize;
    const individualMmsiNumbersData =
      await this._configProtocol.readConfigMemory(
        this._deviceConfig!.individualMmsiNumbersAddress,
        individualMmsiNumbersSize,
        (offset) => this._progress.next((previousOffsets + offset) / totalSize)
      );
    previousOffsets += individualMmsiNumbersSize;
    const groupMmsiNamesData = await this._configProtocol.readConfigMemory(
      this._deviceConfig!.groupMmsiNamesAddress,
      groupMmsiNamesSize,
      (offset) => this._progress.next((previousOffsets + offset) / totalSize)
    );
    previousOffsets += groupMmsiNamesSize;
    const groupMmsiNumbersData = await this._configProtocol.readConfigMemory(
      this._deviceConfig!.groupMmsiNumbersAddress,
      groupMmsiNumbersSize,
      (offset) => this._progress.next((previousOffsets + offset) / totalSize)
    );

    const mmsiDirectory = new MmsiDirectory(
      this._deviceConfig!.individualMmsiNum,
      this._deviceConfig!.groupMmsiNum
    );
    mmsiDirectory.initFromConfig(
      individualMmsiNamesData,
      individualMmsiNumbersData,
      groupMmsiNamesData,
      groupMmsiNumbersData
    );
    this.config.next({
      ...this.config.getValue(),
      mmsiDirectory: mmsiDirectory
    });
    this._deviceTaskState.next('mmsi-edit');
  }

  private getMmsiMemoryLayout() {
    const individualMmsiNum = this._deviceConfig!.individualMmsiNum;
    const individualMmsiNamesSize = MMSI_NAME_BYTE_SIZE * individualMmsiNum;
    const individualMmsiNumbersSize = numberOffsetFromIndex(individualMmsiNum);
    const groupMmsiNum = this._deviceConfig!.groupMmsiNum;
    const groupMmsiNamesSize = MMSI_NAME_BYTE_SIZE * groupMmsiNum;
    const groupMmsiNumbersSize = numberOffsetFromIndex(groupMmsiNum);
    return {
      individualMmsiNamesSize,
      individualMmsiNumbersSize,
      groupMmsiNamesSize,
      groupMmsiNumbersSize,
      totalSize:
        individualMmsiNamesSize +
        individualMmsiNumbersSize +
        groupMmsiNamesSize +
        groupMmsiNumbersSize
    };
  }

  async writeMmsiDirectory() {
    if (this._deviceTaskState.getValue() != 'mmsi-edit') {
      throw new Error(
        `Can't read MMSI directory from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('mmsi-save');
    this._progress.next(0);
    const {
      individualMmsiNamesSize,
      individualMmsiNumbersSize,
      groupMmsiNamesSize,
      groupMmsiNumbersSize,
      totalSize
    } = this.getMmsiMemoryLayout();

    const individualMmsiNamesData = new Uint8Array(individualMmsiNamesSize);
    const individualMmsiNumbersData = new Uint8Array(individualMmsiNumbersSize);
    const groupMmsiNamesData = new Uint8Array(groupMmsiNamesSize);
    const groupMmsiNumbersData = new Uint8Array(groupMmsiNumbersSize);
    this.config
      .getValue()
      .mmsiDirectory!.fillConfig(
        individualMmsiNamesData,
        individualMmsiNumbersData,
        groupMmsiNamesData,
        groupMmsiNumbersData
      );
    await this._configProtocol.writeConfigMemory(
      individualMmsiNamesData,
      this._deviceConfig!.individualMmsiNamesAddress,
      (offset) => this._progress.next(offset / totalSize)
    );
    let previousOffsets = individualMmsiNamesSize;
    await this._configProtocol.writeConfigMemory(
      individualMmsiNumbersData,
      this._deviceConfig!.individualMmsiNumbersAddress,
      (offset) => this._progress.next((previousOffsets + offset) / totalSize)
    );
    previousOffsets += individualMmsiNumbersSize;
    await this._configProtocol.writeConfigMemory(
      groupMmsiNamesData,
      this._deviceConfig!.groupMmsiNamesAddress,
      (offset) => this._progress.next((previousOffsets + offset) / totalSize)
    );
    previousOffsets += groupMmsiNamesSize;
    await this._configProtocol.writeConfigMemory(
      groupMmsiNumbersData,
      this._deviceConfig!.groupMmsiNumbersAddress,
      (offset) => this._progress.next((previousOffsets + offset) / totalSize)
    );
    this._deviceTaskState.next('idle');
  }

  cancelMmsiDirectory() {
    this._deviceTaskState.next('idle');
  }

  async readGpsLog() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't start reading GPS from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('gpslog-read');
    this._progress.next(0);
    await this._configProtocol.waitForGps();
    let rawGpslog: Uint8Array[] = [];
    this._configProtocol.sendMessage('$PMTK', ['622', '1']);
    let ans = await this._configProtocol.receiveMessage();
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
    let line = await this._configProtocol.receiveMessage();
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
      this._progress.next(expectedLineNum / numLines);
      expectedLineNum += 1;
      line = await this._configProtocol.receiveMessage();
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
    ans = await this._configProtocol.receiveMessage();
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
  getDat(): Uint8Array {
    if (this._configProtocol instanceof DatConfigProtocol) {
      return this._configProtocol.datImage;
    }
    throw new Error('DAT is only available in this configuration.');
  }

  async startYaml() {
    if (this._deviceTaskState.getValue() != 'idle') {
      throw new Error(
        `Can't start Yaml from state ${this._deviceTaskState.getValue()}`
      );
    }
    this._deviceTaskState.next('yaml-read');
    this.config.next({});
    const configModules = CONFIG_MODULE_CONSTRUCTORS.map(
      (moduleClass) => new moduleClass(this._deviceConfig!.name)
    );
    const batchReader = new ConfigBatchReader(this._configProtocol);
    configModules.forEach((module) => module.addRangesToRead(batchReader));
    const results = await batchReader.read((v: number) =>
      this._progress.next(v)
    );
    const yaml = new Document();
    yaml.contents = yaml.createNode([]);
    const config: Config = {};
    configModules.forEach((module) =>
      module.updateConfig(results, config, yaml)
    );
    this.config.next(config);
    this.yaml.next(yaml);
    this._deviceTaskState.next('yaml-edit');
  }

  cancelYamlEdit() {
    this._deviceTaskState.next('idle');
  }
}
