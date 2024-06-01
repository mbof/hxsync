# Config modules for YAML

## Overview

The YAML configuration feature is implemented using a module system (waypoints,
routes, DSC directory, etc.).

The main responsibilities of a module are to

- Provide the memory ranges for the configuration bits that it controls
- Generate YAML from a binary image
- Generate edits to a binary image from a YAML file

Modules deal with three types of representation for the configuration data:

- Binary format, i.e. `Uint8Array`s representing memory ranges within a device
  or DAT file configuration binary.
- YAML format, i.e. `Document` and `Node` (from the `yaml` module) representing
  a syntax tree for the configuration.
- TypeScript object format, representing the logical representation of the
  configuration. It is the `Config` type defined in `device-configs.ts`.

The TypeScript object format `Config` is not always strictly necessary, in the
sense that it's possible to implement new YAML functionality without it. It is
used to logic that combines information from multiple modules.

An example where the TypeScript object format is useful is during parsing of
navigation routes: a route can be declared in YAML using references to waypoint
names, but the device needs waypoint IDs. The waypoint module drops
configuration information that allows the subsequent route module to look up a
waypoint's ID based on its name.

(The Typescript object configuration format is also used to support UI editing
features other than YAML.)

## Life of a YAML edit

1. The user pushes the "Edit as YAML" button. This enters the **YAML read**
   phase.
2. Each configuration module's `addRangesToRead` method is called, in order (the
   modules are in an ordered list). The method then "puts in a request" for one
   or more memory ranges that it needs to read in order to determine current
   configuration.
3. All the memory ranges that the various modules have requested are read from
   the device or DAT file in one batch. During this time, the user sees a dialog
   with a progress indicator.
4. Each configuration module's `updateConfig` method is called, also in list
   order. This method
   - Receives the bytes of the memory ranges that it requested in (2), the
     current state of the configuration in TypeScript object format (as
     populated by previous modules in the list), and the current YAML document
     being populated.
   - Parses the binary content.
   - Creates a YAML node representing the current configuration and adds it to
     the current YAML document.
   - Optionally populates the configuration, in case the next modules will need
     to refer to it.
5. The user sees a configuration sheet showing them the YAML document to edit.
   They make edits, then click Save. This enters the **YAML Save** phase.
6. The YAML document is parsed. It contains a list of nodes. For each node, in
   the order of the document, each module's `maybeParseYamlNode` is called on
   it, in module list order, until one of them returns `true` (indicating that
   it successfully parsed the contents). The responsibility of the
   `maybeParseYamlNode`'s function is to
   - Receive the YAML node being parsed, the current configuration being
     assembled in TypeScript object format, and the previous configuration in
     TypeScript object format.
   - Determines if it's even relevant for the node being parsed. If not, it
     returns `false` right away so that the next module can be called.
   - Interprets the YAML node to
     - Produce the required binary edits. It can use the previous configuration
       to leave some aspects unchanged without them needing to be specified by
       the user (for example if a channel group spec does not provide a
       `model_name`, it will be left unchanged).
     - Update the current configuration for the use of subsequent modules (e.g.
       waypoint IDs are populated by the waypoint module, so that the route
       module being called later will know how to translate from waypoint names
       to IDs).
   - Return `true` to indicate that it successfully handled this YAML node.
7. Once all YAML nodes have been processed this way, all requested binary edits
   are made in batch to the device or in-memory DAT file.

## Implementing additional configuration modules

1. Create a new file in `src/app/config-modules` for the module.
1. Create a class in this file that implements `ConfigModuleInterface`.
1. Declare names for the ranges of memory that the module will need to read by
   adding to the `MemoryRangeId` type in `device-configs.ts`.
1. If the module will update the TypeScript object configuration, add an entry
   to the `Config` object in `device-configs.ts` to hold this configuration.
1. Implement the module's constructor, taking a `DeviceModel` as argument. This
   involves looking up the memory layout for the feature based on the device
   model (if the feature is even supported on this model).
1. Implement the `addRangesToRead` function. This is where the module requests
   memory ranges to be read.
1. Implement the `updateConfig` function. This involves parsing binary data as
   read from the device, and producing a YAML node from it (plus a TypeScript
   object configuration if necessary).
1. Update `src/app/module-list.ts` to add the module to the list.
1. Manually test the module's reading functionality in the UI on a DAT file, to
   verify that the binary is read correctly and produces the right YAML.
1. Implement the `maybeParseYamlNode` function. This involves processing a YAML
   node, first to determine whether this module should handle it, secondly to
   produce required binary edits and configuration updates to reflect the YAML
   node's configuration.
1. Write unit tests for the module, to exert all the functions, and test that a
   round-trip from binary to YAML and back results in no binary changes.
1. Manually test the module's writing functionality in the UI on a DAT file, to
   verify that edits are as expected.

Note: it's possible to test the read part (`addRangesToRead` and `updateConfig`)
by
