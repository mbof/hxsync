# HxSync

This project is an Angular web application that connects to the Standard Horizon
HX870 and HX890 portable VHF radios. It has the following features:

- Reading and editing waypoints and routes, MMSI directories for DSC, channel
  configuration (in a UI or using a [YAML file](yaml.md))
- Sharing a configuration as a link for others to apply
- Loading and saving DAT files
- Offline support via a progressive web app

It is very incomplete, and could break your device. **Use at your own risk!**

The APIs that this application relies on for connecting to the device
([WebSerial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility))
and for opening files
([File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#read-file))
are currently only available in Chrome, Edge, and Opera.

This software builds on the work published at
[Robert Elsinga's page on the HX890](https://pc5e.nl/info/standard-horizon-hx890e-marine-handheld),
the [`hxtool` Python utility](https://github.com/cr/hx870) by Christiane
Ruetten, and tests and feedback by
[Arne Johannessen](https://github.com/johannessen).

## Demo

- Try it out: https://mbof.github.io/hx
- Video:

https://github.com/mbof/hxsync/assets/1308709/8ee0a733-05c3-474d-b0bf-59fce52ff474

## Development server

First-time installation: after cloning this repository, run `npm install` from
the project directory to fetch the required modules.

Run `ng serve --serve-path /hx` for a dev server. Navigate to
`http://localhost:4200/hx`. The application will automatically reload if you
change any of the source files.

There is a second app entry point for the share page. It can be started with
`ng serve share --serve-path /hx/share` and accessed at
`http://localhost:4200/hx/share`.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can
also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Text formatting

Run
`npx prettier --write $(git diff HEAD --name-only | egrep '\.(ts|html|css|md)$')`
to format files before committing.

## Build

Run `npm run build -- --base-href=/hx/` to build the project. The build
artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via
[Karma](https://karma-runner.github.io).
