import { YAMLMap, Document, Node, YAMLSeq, Scalar } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { Config } from '../config-session';
import { ConfigModuleInterface } from './config-module-interface';
import { DeviceModel } from '../devicemgr.service';
import { WAYPOINTS_BYTE_SIZE, Waypoint, waypointFromConfig } from '../waypoint';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { parseLat, parseLon } from '../parseLatLon';
import { fillWaypointData } from '../nav-info-draft';

type WaypointDeviceConfig = {
  name: DeviceModel;
  waypointsStartAddress: number;
  waypointsNumber: number;
};

const DEVICE_CONFIGS: WaypointDeviceConfig[] = [
  {
    name: 'HX890',
    waypointsStartAddress: 0xd700,
    waypointsNumber: 250
  },
  {
    name: 'HX870',
    waypointsStartAddress: 0x4300,
    waypointsNumber: 200
  }
];

export class WaypointConfig implements ConfigModuleInterface {
  deviceConfig: WaypointDeviceConfig | undefined;
  constructor(readonly deviceModel: DeviceModel) {
    this.deviceConfig = DEVICE_CONFIGS.find((c) => c.name == deviceModel);
  }
  maybeVisitYamlNode(
    node: YAMLMap<unknown, unknown>,
    configBatchWriter: ConfigBatchWriter,
    configOut: Config,
    previousConfig: Config
  ): boolean {
    const waypoints = node.get('waypoints');
    if (!waypoints) {
      return false;
    }
    if (!this.deviceConfig) {
      throw new YamlError(
        `Waypoints not supported on ${this.deviceModel}`,
        node.range![0]
      );
    }
    if (!(waypoints instanceof YAMLSeq)) {
      throw new YamlError('Unexpected waypoints node type', node.range![0]);
    }
    const waypointArray = waypoints.items.map(parseYamlWaypoint);
    assignIndices(waypointArray, previousConfig.waypoints);
    const wpData = new Uint8Array(
      WAYPOINTS_BYTE_SIZE * this.deviceConfig.waypointsNumber
    );
    wpData.fill(255);
    fillWaypointData(
      waypointArray,
      this.deviceConfig.waypointsStartAddress,
      wpData
    );
    configBatchWriter.prepareWrite(
      'waypoints',
      this.deviceConfig.waypointsStartAddress,
      wpData
    );
    configOut.waypoints = waypointArray;
    return true;
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    if (this.deviceConfig) {
      configBatchReader.addRange(
        'waypoints',
        this.deviceConfig.waypointsStartAddress,
        this.deviceConfig.waypointsStartAddress +
          WAYPOINTS_BYTE_SIZE * this.deviceConfig.waypointsNumber
      );
    }
  }
  updateConfig(
    results: BatchReaderResults,
    config: Config,
    yaml: Document<Node, true>
  ): void {
    const data = results.get('waypoints');
    if (!data || !this.deviceConfig) {
      return;
    }
    let waypoints = [];
    for (
      var waypointId = 0;
      waypointId < this.deviceConfig.waypointsNumber;
      waypointId += 1
    ) {
      let wpOffset = waypointId * 32;
      let waypoint = waypointFromConfig(
        data.subarray(wpOffset, wpOffset + 32),
        this.deviceConfig.waypointsStartAddress + wpOffset
      );
      if (waypoint) {
        waypoints.push(waypoint);
      }
    }
    config.waypoints = waypoints;
    const waypointDirectory = waypoints.map((wp) => ({
      [wp.wp.name]: `${wp.getLat(true)} ${wp.getLon(true)}`
    }));
    const waypointsNode = yaml.createNode({ waypoints: waypointDirectory });
    waypointsNode.commentBefore = `
 Waypoints. Example:
 - waypoints
     # Coordinates in degrees and decimal minutes
     - Marina: 33N57.8490 118W27.8290
     # Coordinates in decimal degrees
     - Marina: 33.84905 -118.27829`;
    waypointsNode.spaceBefore = true;
    yaml.add(waypointsNode);
  }
}

function parseYamlWaypoint(waypoint: any): Waypoint {
  if (
    !(
      waypoint instanceof YAMLMap &&
      waypoint.items.length == 1 &&
      waypoint.items[0].key instanceof Scalar &&
      waypoint.items[0].value instanceof Scalar
    )
  ) {
    throw new YamlError('Unexpected waypoint node type', waypoint.range![0]);
  }
  let wptName = waypoint.items[0].key.value;
  const latLonStr = waypoint.items[0].value.value;
  if (!(typeof wptName == 'string')) {
    throw new YamlError(
      `Unexpected waypoint name type ${typeof latLonStr}`,
      waypoint.range![0]
    );
  }
  wptName = wptName.trim();
  if (wptName.length > 15) {
    throw new YamlError(
      `Waypoint name too long "${wptName}"`,
      waypoint.range![0]
    );
  }
  if (!(typeof latLonStr == 'string')) {
    throw new YamlError(
      `Unexpected coordinate type ${typeof latLonStr}`,
      waypoint.range![0]
    );
  }
  const latLon = latLonStr.split(' ').map((s) => s.trim());
  if (latLon.length != 2) {
    throw new YamlError(
      `Expected two coordinates, got ${latLon.length}`,
      waypoint.range![0]
    );
  }
  const lat = parseLat(latLon[0]);
  if (!lat) {
    throw new YamlError(`Unable to parse latitude ${lat}`, waypoint.range![0]);
  }
  const lon = parseLon(latLon[1]);
  if (!lon) {
    throw new YamlError(`Unable to parse latitude ${lon}`, waypoint.range![0]);
  }
  return new Waypoint({
    id: -1,
    name: wptName,
    lat_deg: lat.lat_deg,
    lat_dir: lat.lat_dir,
    lat_min: lat.lat_min,
    lon_deg: lon.lon_deg,
    lon_dir: lon.lon_dir,
    lon_min: lon.lon_min
  });
}

function assignIndices(waypoints: Waypoint[], previousWaypoints?: Waypoint[]) {
  const assignedIndices: Set<number> = new Set();
  // Copy IDs from previous waypoints if available
  for (const waypoint of waypoints) {
    const previousWaypoint = previousWaypoints?.find(
      (pwp) => pwp.wp.name == waypoint.wp.name
    );
    if (previousWaypoint && !assignedIndices.has(previousWaypoint.wp.id)) {
      waypoint.wp.id = previousWaypoint.wp.id;
      assignedIndices.add(waypoint.wp.id);
    } else {
      waypoint.wp.id = -1;
    }
  }
  // Assign IDs for any new waypoints
  for (const waypoint of waypoints) {
    if (waypoint.wp.id == -1) {
      let nextId: number;
      for (nextId = 1; nextId < 255; nextId += 1) {
        if (!assignedIndices.has(nextId)) {
          break;
        }
      }
      waypoint.wp.id = nextId;
      assignedIndices.add(nextId);
    }
  }
}
