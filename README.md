# HxSync

This project is an Angular web application that connects to the Standard Horizon HX890
portable VHF radios using the WebSerial API. As of this writing, the WebSerial API is
only available in Chrome, and this software only supports the  following functions:
* Reading and editing waypoints
* Downloading the GPS log as a GPX file

It is very incomplete, and could break your device. **Use at your own risk!**

This software builds on the work published at
[Robert Elsinga's page on the HX890](https://pc5e.nl/info/standard-horizon-hx890e-marine-handheld)
as well as the [`hxtool` Python utility](https://github.com/cr/hx870) by Christiane Ruetten.

## Demo

* Try it out: https://mbof.github.io/hx
* Video:

https://github.com/mbof/hxsync/assets/1308709/8ee0a733-05c3-474d-b0bf-59fce52ff474

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).
