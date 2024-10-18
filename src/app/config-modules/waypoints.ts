import { YAMLMap, Document, Node, YAMLSeq, Scalar } from 'yaml';
import { ConfigBatchReader, BatchReaderResults } from '../config-batch-reader';
import { ConfigBatchWriter } from '../config-batch-writer';
import { Config } from './device-configs';
import { ConfigModuleInterface } from './config-module-interface';
import { DeviceModel } from './device-configs';
import { WAYPOINTS_BYTE_SIZE, Waypoint, waypointFromConfig } from '../waypoint';
import { YamlError } from '../yaml-sheet/yaml-sheet.component';
import { parseLat, parseLon } from '../parseLatLon';
import { fillWaypointData } from '../nav-info-draft';

export type WaypointDeviceConfig = {
  startAddress: number;
  number: number;
};

export const WAYPOINT_DEVICE_CONFIGS: Map<DeviceModel, WaypointDeviceConfig> =
  new Map([
    [
      'HX890',
      {
        startAddress: 0xd700,
        number: 250
      }
    ],
    [
      'HX870',
      {
        startAddress: 0x4300,
        number: 200
      }
    ],
    [
      'HX891BT',
      {
        startAddress: 0xd700,
        number: 250
      }
    ]
  ]);

export class WaypointConfig implements ConfigModuleInterface {
  deviceConfig: WaypointDeviceConfig | undefined;
  constructor(readonly deviceModel: DeviceModel) {
    this.deviceConfig = WAYPOINT_DEVICE_CONFIGS.get(deviceModel);
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
        node
      );
    }
    if (!(waypoints instanceof YAMLSeq)) {
      throw new YamlError('Unexpected waypoints node type', node);
    }
    const waypointArray = waypoints.items.map(parseYamlWaypoint);
    assignIndices(waypointArray, previousConfig.waypoints);
    const wpData = new Uint8Array(
      WAYPOINTS_BYTE_SIZE * this.deviceConfig.number
    );
    wpData.fill(255);
    fillWaypointData(waypointArray, this.deviceConfig.startAddress, wpData);
    configBatchWriter.prepareWrite(
      'waypoints',
      this.deviceConfig.startAddress,
      wpData
    );
    configOut.waypoints = waypointArray;
    return true;
  }
  addRangesToRead(configBatchReader: ConfigBatchReader): void {
    if (this.deviceConfig) {
      configBatchReader.addRange(
        'waypoints',
        this.deviceConfig.startAddress,
        this.deviceConfig.startAddress +
          WAYPOINTS_BYTE_SIZE * this.deviceConfig.number
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
      waypointId < this.deviceConfig.number;
      waypointId += 1
    ) {
      let wpOffset = waypointId * 32;
      let waypoint = waypointFromConfig(
        data.subarray(wpOffset, wpOffset + 32),
        this.deviceConfig.startAddress + wpOffset
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
    throw new YamlError('Unexpected waypoint node type', waypoint);
  }
  let wptName = waypoint.items[0].key.value;
  const latLonStr = waypoint.items[0].value.value;
  if (!(typeof wptName == 'string')) {
    throw new YamlError(
      `Unexpected waypoint name type ${typeof latLonStr}`,
      waypoint
    );
  }
  if (wptName.length > 15) {
    throw new YamlError(`Waypoint name too long "${wptName}"`, waypoint);
  }
  if (!(typeof latLonStr == 'string')) {
    throw new YamlError(
      `Unexpected coordinate type ${typeof latLonStr}`,
      waypoint
    );
  }
  const latLon = latLonStr.split(' ').map((s) => s.trim());
  if (latLon.length != 2) {
    throw new YamlError(
      `Expected two coordinates, got ${latLon.length}`,
      waypoint
    );
  }
  const lat = parseLat(latLon[0]);
  if (!lat) {
    throw new YamlError(`Unable to parse latitude ${lat}`, waypoint);
  }
  const lon = parseLon(latLon[1]);
  if (!lon) {
    throw new YamlError(`Unable to parse latitude ${lon}`, waypoint);
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
