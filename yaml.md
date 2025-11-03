# YAML configuration file format

You can edit device configuration using a YAML file. This makes it easier to
share configuration across devices, and provides access to more device settings.

The HX890 and HX891BT radios have the most supported features. Most of these
features also work on HX870. A smaller set of features is supported by the
fixed-mount GX1400. For a list of features supported by device, see
[this table](README.md#feature-support-matrix).

## Example

```
# Template of parameters used for Standard Horizon HX890/HX891BT radios
# Note: sections omitted are not written to the device; but if a section
#  is provided, previous entries are erased from the device.
# Norm Perron 3/19/2025

# Directory of MMSIs for individual calls
- individual_directory:		     # Up to 100 entries can be provided
    - BoatName1: "338000001"   # Boat names can be up to 15 characters
    - BoatName2: "338000002"   # Expects 9-digit numbers wrapped in quotes

# Directory of MMSIs for group calling
- group_directory:		         # Up to 20 entries can be provided
    - GroupName1: "012345678"  # Expects 9-digit numbers wrapped in quotes
                               # Group numbers normally start with 0

# Waypoints for navigation
#  Coordinates are entered in degrees and decimal minutes.
#  Waypoint names can be up to 15 characters long.
#  Example South California waypoints centered around Marina del Rey:
- waypoints:					# Up to 250 waypoints can be provided
    - CatAvalonHarbo: 33N20.846 118W19.288   # Between Casino & Ferry
    - CatOffWhaleRock: 33N25.783 118W33.822  # 1500' SW Whale Rock
    - CatRibbonRock: 33N26.114 118W34.534    # 1325' SW Of Ribbon Rock
    - CatWestEnd: 33N28.566 118W36.78        # 1700' South West Of Point
    - MdRSouthEntra: 33N57.481 118W27.582    # 250' SE MdR Detach Breakwater
    - PV10PVBuoy: 33N46.363 118W26.397       # 1750' East Of R10 Buoy

# Routes for navigation
#  A route is a series of waypoints.
#  Route names can be up to 15 characters long.
#  Example South California routes centered around Marina del Rey:
- routes:
    - Avalon<MdR:
        - MdRSouthEntra
        - PV10PVBuoy
        - CatAvalonHarbo

    - CatHarbor<MdR:
        - MdRSouthEntra
        - CatWestEnd
        - CatRibbonRock

# Channel configuration
#  You can change channel names, select which channels show up in the
#  intership calling menu, and set up scrambler codes.
- channels:
    current_group:  # Changes the current channel configuration
      # List of DSC channel numbers for the intership calling menu
      intership: [ 13, 68, 69, 71, 72, 1078, 78A ]
      names:
        # Change names for channels
        - 9: TwoHar-CALLING
        - 12: Avalon-VTS
        - 68: PLEASURE
        - 69: PLEASURE
        - 71: PLEASURE
        - 72: PLEASURE
        - 1078: PLEASURE
        - 78A: PLEASURE       # 78A is the name of the 1078 channel on the HX870
        - 1081: FogHorn-CCG   # Transmitting five times on this channel triggers
                              # fog horn via the MRASS system where supported
        - 81A: FogHorn-CCG    # 81A is the name of the 1081 channel on the HX870

      scrambler:
        # Scrambler type is either 4 (CVS2500) or 32 (FVP-42)
        # Code is between 0 and 3 or 0 and 31, correspondingly
        # Scrambler is not supported on HX870 and would be ignored
        - 88: { type: 4, code: 3 }

- preferences:
    squelch: 1
    backlight_timer: 20 sec  # Keep backlight longer than default
    key_beep: 0              # Silence keys
    gps_power_save: auto
    weather_alert: true      # sends alerts to radio if bad weather is coming

    # Configure soft key menus
    # Toggle weather/channel, transmit power 1/2/6 watts, FM radio
    soft_key_page_1: [ wx_or_ch, tx_power, fm ]
    # Toggle memory channels for scan, toggle scan, toggle dual watch
    soft_key_page_2: [ scan_mem, scan, dual_watch ]
    # Toggle strobe, save man overboard info, save waypoint
    soft_key_page_3: [ strobe, mob, waypoint]
    # Show compass, darken screen, log gps positions
    soft_key_page_4: [ compass, night_or_day, logger]

    # Also available: ch_name (change name of channel),
    # noise_canceling, preset (define preset channels),
    # mark (save a waypoint), and none (no soft key).
```

## Reference documentation

Only the directives provided will be written.

### `individual_directory`

Provide the directory of MMSI numbers to be used for DSC individual calls. MMSIs
must be wrapped in quotes.

Example:

```
- individual_directory:
    - Boat 1: "123456789"
    - Boat 2: "987654321"
    - USCG DSC test: "003669999"
```

### `group_directory`

Provide the directory of MMSIs to be used for DSC group calls. MMSIs must be
wrapped in quotes.

Example:

```
- group_directory:
    - Friends: "012345678"
    - Work: "087654321"
```

### `waypoints`

Provide the directory of waypoints used for routing. Coordinates can be provided
in "DMM" (degrees and decimal minutes, the device's native format) or in decimal
degrees.

Example:

```
- waypoints:
    - Alpha: 33.9803 -118.4517     # Decimal degrees
    - Bravo: 33N58.818 118W27.102  # Degrees and decimal minutes
```

### `routes`

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

### `channels`

Set channel configuration for the current channel group, including:

- `intership`: list of channels enabled for inter-ship calling (DSC). If this
  section is omitted, the list of channels enabled for inter-ship calling is
  left unchanged. If it is present, then all channels for inter-ship calling
  must be provided (other channels will be disabled for inter-ship calling).
- `names`: channel names. If this section is omitted, names are unchanged; if a
  channel is omitted from this list, its name is unchanged too.
- `scrambler`: (HX890 and HX891BT only) scrambler settings. If this section is
  omitted, scrambler settings are unchanged; if this section is present, all
  scrambler settings must be provided (other channels with have scrambling
  disabled). For each channel in this section, the scrambler setting consists
  of:
  - a scrambler `type` of either 4 or 32, depending on whether the 4-code
    scrambler (CVS2500) or 32-code scrambler (FVP-42) should be used
  - a scrambler `code` between 0 and `type` - 1.

Example:

```
- channels:
    current_group:
        intership: [ 6, 13, 68, 69, 71, 72, 1078 ]
        names:
            - 9: Foo-CALLING
            - 12: Bar-VTS
        scrambler:
            - 88: { type: 4, code: 3 }
```

The configuration can also be provided explicitly for channel groups `group_1`,
`group_2` and `group_3`.

### `settings`

This section lets you control various settings for the device.

Example:

```
- settings:
    volume: 10
    squelch: 1
    backlight_timer: 30 sec
    ...
```

When a setting is not provided, it is left unchanged. The defaults below are
only provided as an indication of the typical default factory settings for a
device and may vary from device to device.

Available settings:

- `volume`: Set the volume between 0 (silent) and 15.

- `squelch`: Set the squelch between 0 (off) and 15.

- `backlight_dimmer`: Set the backlighting level between 0 (off) and 5

- `backlight_timer`: Set the backlighting timer to `off`, `3 sec` (default),
  `5 sec`, `10 sec`, `20 sec`, `30 sec` or `continuous` (no timer).

- `contrast`: Set the contrast between 0 and 30.

- `key_beep`: Set the key beep volume between 0 (silent) and 5.

- `soft_key_timer`: Set the time that soft keys remain on screen. Valid values
  are `3 sec`, `5 sec`, `7 sec`, `10 sec`, and `15 sec`.

- `soft_key_page_1`, ... `soft_key_page_4`: Program soft keys. There are 4 soft
  key pages, and each page is a list of three soft keys, for example:
  `soft_key_page_1: [ 'tx_pwr', 'wx_or_ch', 'fm' ]`. Soft keys can be chosen in
  the following list:

  - `none`: No soft key in this position
  - `tx_pwr`: Change the transmission power between low, medium, and high
  - `wx_or_ch`: Switch channel between weather and marine
  - `scan`: Turn scanning function on or off
  - `dual_watch`: Turn dual watch function (or triple watch) on or off
  - `mark`: Mark the current position for a waypoint
  - `compass`: Show compass display
  - `waypoint`: Select a waypoint or route for navigation
  - `mob`: Mark the current position where a person fell overboard
  - `scan_mem`: Add or remove channels from memory channel scan
  - `preset`: Program or delete the preset memory channel
  - `strobe`: Toggle the strobe light LED
  - `ch_name`: Edit channel name
  - `logger`: Toggle the logging of GPS data
  - `noise_canceling`: Show noise canceling settings
  - `fm`: Turn on the FM radio receiver
  - `night_or_day`: Toggle between night mode and day mode

- `multi_watch`: Set the multi watch mode between `off` (default), `multi`, and
  `scan`.

- `multi_watch_type`: Set the multi watch type between `dual` (default) and
  `triple`.

- `scan_type`: Set the receiver scan mode to either `priority` (default) or
  `memory`.

- `scan_resume`: Set the number of seconds (from 1 to 5) to wait before scanning
  again, after a received signal ends. The default is 2.

- `weather_alert`: Set whether the NOAA Weather Alert function is enabled
  (`true`) or disabled (`false`, default).

- `emergency_led`: Switch and set the function of the emergency LED, between
  `continuous` (default), `SOS`, `blink1`, `blink2`, and `blink3`.

- `water_hazard_led`: Switch and set the function of the water hazard LED,
  between `off`, `on` (default), and `power-on`.

- `audio_filter`: Set the audio filter between `normal` (default),
  `high-low-cut`, `high-low-boost`, `low-boost`, and `high-boost`.

- `battery_save`: Set the battery save mode between `off`, `50%`, `70%`
  (default), `80%`, and `90%`.

- `vox`: Enable (`true`) or disable (`false`) voice-activated transmission
  (VOX). The default is `false`.

- `vox_level`: Set the VOX sensitivity level between 0 and 4. The default is 2.

- `vox_delay`: Set the VOX delay between `0.5 sec`, `1.0 sec`, `1.5 sec`
  (default), `2.0 sec`, and `3.0 sec`.

- `noise_cancel_rx`: Enable (`true`) or disable (`false`) noise cancellation for
  reception. The default is `false`.

- `noise_cancel_rx_level`: Set the noise cancellation level for reception
  between 0 and 3.

- `noise_cancel_tx`: Enable (`true`) or disable (`false`) noise cancellation for
  transmission. The default is `false`.

- `gps_enabled`: Set the GPS to `off`, `yes` (default), or `always`.

- `gps_power_save`: Set the GPS power save mode to `off` (don't save power,
  always receive GPS signals), `auto` (default), `50%` (GPS is activated for 3
  seconds every 6 seconds), `75%` (GPS is activated for 3 seconds every 12
  seconds), or `90%` (GPS is activated for 3 seconds every 30 seconds).

- `distance_unit`: Set the distance units to `nm` (nautical miles, default),
  `sm` (statute miles), or `km` (kilometers).

- `speed_unit`: Set the speed units to `kn` (knots, default), `mph` (miles per
  hour), or `km/h` (kilometers per hour).

- `altitude_units`: Set the altitude units to `ft` (feet) or `m` (meters).

- `nav_display_range`: Set the navigation display range to `auto` (default), 2,
  5, 10, or 25 nautical miles (or whichever unit selected in `distance_unit`, if
  different from nautical miles).

- `nav_arrival_range`: Set the range within which the device determines to have
  reached the destination, when navigating to a waypoint. Available values are
  0.05, 0.1 (default), 0.2, 0.5, or 1 nautical miles (or whichever unit selected
  in `distance_unit`, if different from nautical miles).

- `nav_routing_operation`: Set the navigation routing operation to `auto`
  (default) or `manual`. In `auto` mode, navigation to the next target in the
  route starts automatically.

- `gps_location_format`: Set the GPS location format to `DDDMMSS` (degrees,
  minutes, and seconds), `DDDMM.MM` (degrees and decimal minutes up to 2 decimal
  places), or `DDDMM.MMMM` (degrees and decimal minutes up to 4 decimal places).
  The default is `DDDMM.MMMM`.

- `gps_pinning`: Enable (`true`) or disable (`false`) GPS pinning, which allows
  position updates when the vessel is not underway. The default is `true`.

- `sbas_enabled`: Enable (`true`) or disable (`false`) SBAS. SBAS generally
  improves GPS quality, but some regions may have problems with GPS reception
  with SBAS enabled.

- `map_orientation`: Set the map orientation to `north-up` or `course-up`
  (default).

- `gps_logger_interval`: Set the GPS logger interval to `5 sec`, `15 sec`,
  `30 sec`, `1 min` (default), or `5 min`.

- `dsc_individual_ring`: Set how long the device will ring when receiving an
  individual DSC call. The value can be `5 sec`, `10 sec`, `15 sec`, `20 sec`,
  or `2 min` (default).

- `auto_individual_reply`: Set whether to automatic reply to individual DSC
  calls. Can be `off` (default), `able`, or `unable`.

- `dsc_no_action_timer`: Set the time after which the device will automatically
  return to radio operation if no action on the "menu" or "DSC call" screen is
  taken. The value can be `1 min`, `3 min`, `5 min`, `10 min` (default), or
  `15 min`.

- `dsc_channel_switch_timer`: Set the time after which the device automatically
  switches to channel 16 when a DSC distress or all ships call is received. The
  value can be `off`, `10 sec`, `30 sec` (default), `1 min`, or `2 min`.

- `dsc_pos_fix_wait`: Set the maximum time to wait for position information when
  receiving a distress, POS report, or POS request acknowledgement call. The
  value can be `15 sec` (default), `30 sec`, `1 min`, `1.5 min`, or `2 min`.

### `fm_presets`

This section (only supported on HX890 and HX891BT) lets you program FM radio
presets. Enter the station's frequency in MHz, up to 1 decimal place, between 65
and 108.9.

Example:

```
- fm_presets:
    - Station 1: 88.1
    - Station 2: 89.9
    - Station 3: 103.2
```
