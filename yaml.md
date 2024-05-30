# YAML configuration file format

You can edit device configuration using a YAML file, using the directives
described below. Here's a demo:

https://github.com/mbof/hxsync/assets/1308709/df649b4c-65ca-42f7-bace-c769260a9384

Only the directives provided will be written.

## `dsc_directory`

Provide the directory of MMSI numbers to be used for DSC individual calls. MMSIs
must be wrapped in quotes.

Example:

```
- dsc_directory:
    - Boat 1: "123456789"
    - Boat 2: "987654321"
    - USCG: "003669999"
```

## `group_directory`

Provide the directory of MMSIs to be used for DSC group calls. MMSIs must be
wrapped in quotes.

Example:

```
- group_directory:
    - Friends: "012345678"
    - Work: "087654321"
```

## `waypoints`

Provide the directory of waypoints used for routing. Coordinates can be provided
in "DMM" (degrees and decimal minutes, the device's native format) or in decimal
degrees.

Example:

```
- waypoints:
    # Example in decimal degrees
    - Alpha: 33.9803 -118.4517
    # Example in degrees and decimal minutes
    - Bravo: 33N58.818 118W27.102
```

## `routes`

Provide routes as a series of waypoints, referred to by their names. The first
waypoint in the route is first in the list. A `waypoints` section must define
the waypoint names first.

Example:

```
- routes:
    - A first route:
        - Alpha
        - Bravo
    - Another route:
        - Bravo
        - Alpha
```

## `channel_groups`

Set the channel group configuration. Exaclty 3 channel groups must be provided.
Each channel group can be enabled or disabled; additionally, DSC and ATIS can be
enabled or disabled for each channel group.

Default values are as follows:

- `enable` defaults to `true`
- `enable_dsc` defaults to `true`
- `enable_atis` defaults to `false`
- `model_name` defaults to the value already stored in the device for this
  channel group

Example:

```
- channel_groups:
    - USA:
        enable: true
        enable_dsc: true
        enable_atis: false
        model_name: HX890
    - INTL:
        enable: true
        enable_dsc: true
        enable_atis: false
        model_name: HX890E
    - CAN:
        enable: true
        enable_dsc: true
        enable_atis: false
        model_name: HX890

```
