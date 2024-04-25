import { __values } from 'tslib';
import { hexarr, unhexInto } from './message';
import { parse } from 'csv-parse/sync';

export function validateMmsi(name: string, number: string) {
  if (!number.match(/^[0-9]{9}$/)) {
    throw new Error('MMSI number should have exactly 9 digits');
  }
  if (name.length > 16) {
    throw new Error('Name must not be more than 16 characters');
  }
  return;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export class Mmsi {
  name: string;
  number: string;
  constructor(name: string, number: string) {
    this.name = name;
    this.number = number;
  }
  validate() {
    return validateMmsi(this.name, this.number);
  }
  fillConfig(
    destNames: Uint8Array,
    destNumbers: Uint8Array,
    index: number
  ): void {
    validateMmsi(this.name, this.number);
    const nameOffset = index * 16; // 16 bytes per name
    const destName = destNames.subarray(nameOffset, nameOffset + 16);
    destName.fill(255);
    encoder.encodeInto(this.name!, destName);
    // Number layout: every 5 bytes, with a padding byte every 3 numbers
    const numberOffset = numberOffsetFromIndex(index);
    unhexInto(this.number + '0', destNumbers!.subarray(numberOffset));
    if (index % 3 == 2) {
      // Write that padding byte (0xff) every 3 numbers
      destNumbers![numberOffset + 5] = 0xff;
    }
  }
}

function numberOffsetFromIndex(index: number): number {
  return index * 5 + (index - (index % 3)) / 3;
}

function decodeMmsi(
  nameData: Uint8Array,
  numberData: Uint8Array
): Mmsi | undefined {
  for (
    var lastChar = 15;
    lastChar >= 0 && [0, 255, 32].includes(nameData[lastChar]);
    lastChar -= 1
  );
  const name = decoder.decode(nameData.subarray(0, lastChar + 1));
  const number = hexarr(numberData.subarray(0, 5)).slice(0, 9);
  try {
    validateMmsi(name, number);
    return new Mmsi(name, number);
  } catch (e) {
    return;
  }
}

export class MmsiDirectory {
  individualMmsis: Mmsi[] = [];
  groupMmsis: Mmsi[] = [];
  constructor(
    public maxIndividualMmsis: number,
    public maxGroupMmsis: number
  ) {}
  sort(): void {
    this.individualMmsis.sort((a, b) => a.name.localeCompare(b.name));
    this.groupMmsis.sort((a, b) => a.name.localeCompare(b.name));
  }
  toCsv(): string {
    let ans = 'name,mmsi\n';
    this.sort();
    for (const mmsi of this.individualMmsis) {
      mmsi.validate();
      const name = /,/.test(mmsi.name)
        ? `"${mmsi.name.replace('"', '""')}"`
        : mmsi.name;
      ans += `${mmsi.name},${mmsi.number}\n`;
    }
    for (const mmsi of this.groupMmsis) {
      mmsi.validate();
      const name = /,/.test(mmsi.name)
        ? `"${mmsi.name.replace('"', '""')}"`
        : mmsi.name;
      ans += `${mmsi.name},${mmsi.number}\n`;
    }
    return ans;
  }
  initFromCsv(csv: string) {
    const individualMmsis: Mmsi[] = [];
    const groupMmsis: Mmsi[] = [];
    const records = <{ name: string; mmsi: string }[]>(
      parse(csv, { skip_empty_lines: true, columns: true })
    );
    for (const record of records) {
      const name = record.name;
      const number = record.mmsi;
      validateMmsi(name, number);
      const mmsi = new Mmsi(name, number);
      if (number[0] == '0') {
        groupMmsis.push(mmsi);
      } else {
        individualMmsis.push(mmsi);
      }
    }

    if (individualMmsis.length > this.maxIndividualMmsis) {
      throw new Error('Too many MMSIs');
    }
    if (groupMmsis.length > this.maxGroupMmsis) {
      throw new Error('Too many group MMSIs');
    }
    this.individualMmsis = individualMmsis;
    this.groupMmsis = groupMmsis;
  }
  fillConfig(
    individualMmsiNames: Uint8Array,
    individualMmsiNumbers: Uint8Array,
    groupMmsiNames: Uint8Array,
    groupMmsiNumbers: Uint8Array
  ) {
    if (this.individualMmsis.length > this.maxIndividualMmsis) {
      throw new Error('Too many MMSIs');
    }
    if (this.groupMmsis.length > this.maxGroupMmsis) {
      throw new Error('Too many group MMSIs');
    }
    for (const [index, mmsi] of this.individualMmsis.entries()) {
      mmsi.fillConfig(individualMmsiNames, individualMmsiNumbers, index);
    }
    for (const [index, mmsi] of this.groupMmsis.entries()) {
      mmsi.fillConfig(groupMmsiNames, groupMmsiNumbers, index);
    }
  }
  initFromConfig(
    individualMmsiNames: Uint8Array,
    individualMmsiNumbers: Uint8Array,
    groupMmsiNames: Uint8Array,
    groupMmsiNumbers: Uint8Array
  ) {
    const individualMmsis: Mmsi[] = [];
    const groupMmsis: Mmsi[] = [];
    for (let i = 0; i < this.maxIndividualMmsis; i++) {
      const maybeMmsi = decodeMmsi(
        individualMmsiNames.subarray(i * 16, (i + 1) * 16),
        individualMmsiNumbers.subarray(numberOffsetFromIndex(i))
      );
      if (maybeMmsi) {
        individualMmsis.push(maybeMmsi);
      }
    }
    for (let i = 0; i < this.maxGroupMmsis; i++) {
      const maybeMmsi = decodeMmsi(
        groupMmsiNames.subarray(i * 16, (i + 1) * 16),
        groupMmsiNumbers.subarray(numberOffsetFromIndex(i))
      );
      if (maybeMmsi) {
        groupMmsis.push(maybeMmsi);
      }
    }
    this.individualMmsis = individualMmsis;
    this.groupMmsis = groupMmsis;
  }
}
