# SHsync

This project is an Angular web application that connects to the Standard Horizon
HX870, HX890, HX891BT, and GX1400 VHF radios. It is not provided by Standard
Horizon. Use at your own risk!

**[Try it now](https://mbof.github.io/hx)**

Features:

- Edit waypoints, routes, MMSI directories for DSC, and channel configuration
- Edit with a UI or as a [YAML file](yaml.md)
- Share a configuration as a link for others to apply to their device
- Backup and restore DAT files
- Available offline via a progressive web app

Requires Chrome, Edge, or Opera (due to availability of the
[WebSerial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility)
and
[File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#read-file)).

## Acknowledgements

This software would not have been possible without the help of

- [Arne Johannessen](https://github.com/johannessen), who documented the HX870's
  memory layout, and provided valuable tests and feedback for this project;
- Robert Elsinga, who documented the
  [memory layout for the HX890](https://pc5e.nl/info/standard-horizon-hx890e-marine-handheld);
- The [`hxtool` Python utility](https://github.com/cr/hx870) by Christiane
  Ruetten, which provided a model implementation of Standard Horizon's serial
  protocol;
- Norm Perron, who founded the
  [discussion group for HX devices by Standard Horizon](https://groups.io/g/hx870-hx890)
  and provided testing and feedback for this project.

## Feature support matrix

| Feature                     | HX870 | HX890 | HX891BT | GX1400 |
| --------------------------- | :---: | :---: | :-----: | :----: |
| Set up DSC directory        |  ✅   |  ✅   |   ✅    |   ✅   |
| GPS log download            |  ✅   |  ✅   |   ✅    |  N/A   |
| Set up waypoints and routes |  ✅   |  ✅   |   ✅    |  N/A   |
| Change channel names        |  ✅   |  ✅   |   ✅    |  N/A   |
| Set up intership channels   |  ✅   |  ✅   |   ✅    |   ❌   |
| Set up scrambler codes      |  ✅   |  ✅   |   ✅    |  N/A   |
| Set up channel groups       |  ✅   |  ✅   |   ✅    |   ❌   |
| DAT file backup / restore   |  ✅   |  ✅   |   ✅    |   ✅   |

## Developer setup

### Run locally

First-time installation: after cloning this repository, run `npm install` from
the project directory to fetch the required modules.

Run `ng serve --serve-path /hx` for a dev server. Navigate to
`http://localhost:4200/hx`. The application will automatically reload if you
change any of the source files.

There is a second app entry point for the share page. It can be started with
`ng serve share --serve-path /hx/share` and accessed at
`http://localhost:4200/hx/share`.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can
also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Running unit tests

Run `ng test` to execute the unit tests via
[Karma](https://karma-runner.github.io).

### Build

Run `npm run build -- --base-href=/hx/` to build the project. The build
artifacts will be stored in the `dist/` directory.

### Text formatting

Run
`npx prettier --write $(git diff HEAD --name-only | egrep '\.(ts|html|css|md)$')`
to format files before committing.
