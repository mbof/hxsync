export type RouteData = {
  name: string;
  waypointIds: number[];
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export class Route {
  public route: RouteData;
  constructor(route: RouteData) {
    this.route = {
      name: route.name,
      waypointIds: route.waypointIds.slice()
    };
  }
  fillConfig(
    dest: Uint8Array,
    offset: number,
    maxWaypointsPerRoute: number,
    routeBytes: number
  ): void {
    if (offset < 0 || offset > dest.length - routeBytes) {
      throw new Error(`Waypoint offset ${offset} is out of bounds`);
    }
    let name = this.route.name;
    if (name.length >= 16) {
      console.log(`Route name too long ${name}, truncating`);
      name = name.substring(0, 15);
    }
    const destName = dest.subarray(offset, offset + 16);
    const { written: nameByteLength } = encoder.encodeInto(name, destName);
    destName.fill(255, nameByteLength, 16);
    let waypointsId = this.route.waypointIds;
    if (waypointsId.length > maxWaypointsPerRoute) {
      console.log(
        `Too many waypoints in route (${waypointsId.length}), truncating to ${maxWaypointsPerRoute}`
      );
      waypointsId = waypointsId.slice(0, maxWaypointsPerRoute);
    }
    const destWaypointIds = dest.subarray(offset + 16, offset + routeBytes);
    for (const [index, waypointId] of waypointsId.entries()) {
      destWaypointIds[index] = waypointId;
    }
    destWaypointIds.fill(255, waypointsId.length, routeBytes - 16);
  }
}

export function routeFromConfig(
  routeData: Uint8Array,
  maxWaypointsPerRoute: number
): Route | undefined {
  for (
    var lastChar = 15;
    lastChar >= 0 && [0, 255, 32].includes(routeData[lastChar]);
    lastChar -= 1
  );
  const name = decoder.decode(routeData.slice(0, lastChar + 1));
  for (
    var lastWaypoint = maxWaypointsPerRoute - 1;
    lastWaypoint >= 0 && routeData[16 + lastWaypoint] == 255;
    lastWaypoint -= 1
  );

  if (name == '' || lastWaypoint == -1) {
    return undefined;
  }

  const waypointIds = routeData.subarray(16, 16 + lastWaypoint + 1);

  return new Route({
    name: name,
    waypointIds: Array.from(waypointIds)
  });
}
