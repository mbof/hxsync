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
    - Alpha: 33.9803 -118.4517  # Decimal degrees
    - Bravo: 33N58.818 118W27.102  # Degrees and decimal minutes
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

## `channels`

Note: this is not yet widely available.

Set channel configuration for each channel group (`group_1`, `group_2`, or
`group_3`), including

- `dsc`: `enabled` or `disabled` depending on whether the channel should appear
  as an option in the DSC calling menu.
- `name`: name of the channel
- `scrambler`: (HX890 only) a scrambler setting for this channel, including
  - a scrambler `type` of either 4 or 32, depending on whether the 4-code
    scrambler (CVS2500) or 32-code scrambler (FVP-42) should be used
  - a scrambler `code` between 0 and `type` - 1.

Example:

```
- channels:
    group_1:
      - "06":
          dsc: enabled
      - "09":
          name: Foo CALLING
      - "12":
          name: Bar VTS
      - "13":
          dsc: enabled
      - "68":
          dsc: enabled
      - "69":
          dsc: enabled
      - "71":
          dsc: enabled
      - "72":
          dsc: enabled
      - "1078":
          dsc: enabled
      - "88":
          scrambler:
            type: 32
            code: 11
```

The configuration does not have to be provided for all channel groups. If a
channel group is omitted, the channel configuration for that group will be left
unmodified.

Within a channel group, the configuration does not have to be provided for all
channels. If a channel is omitted, its properties will be unmodified, except
that **DSC calling will be disabled**. In other words, if configuration is
provided for a channel group, it is necessary to list out all channels for which
DSC should be enabled.

Within a channel, if `name` is omitted, the previous name will be left
unchanged. If `scrambler` is omitted, no scrambler will be used on this channel.
If `dsc` is omitted, DSC will be disabled.
