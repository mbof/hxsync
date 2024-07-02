import { __values } from 'tslib';
import { hexarr, unhexInto } from './message';
import { parse } from 'csv-parse/sync';
import { fillPaddedString, readPaddedString } from './util';

export function validateMmsi(name: string, number: string) {
  if (name.length > 15) {
    throw new Error(
      `Max name length is 15 characters. "${name}" is ${name.length} characters long.`
    );
  }
  if (!number.match(/^G?[0-9]{9}$/)) {
    throw new Error(
      `MMSI number for ${name} should have exactly 9 digits (found: "${number}")`
    );
  }
  return;
}

export const MMSI_NAME_BYTE_SIZE = 16;

export class Mmsi {
  name: string;
  number: string;
  constructor(name: string, number: string) {
    this.name = name;
    this.number = number;
    this.validate();
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
    const nameOffset = index * MMSI_NAME_BYTE_SIZE; // 16 bytes per name
    const destName = destNames.subarray(
      nameOffset,
      nameOffset + MMSI_NAME_BYTE_SIZE
    );
    fillPaddedString(destName, this.name!);
    // Number layout: every 5 bytes, with a padding byte every 3 numbers
    const numberOffset = numberOffsetFromIndex(index);
    unhexInto(this.number + '0', destNumbers!.subarray(numberOffset));
    if (index % 3 == 2) {
      // Write that padding byte (0xff) every 3 numbers
      destNumbers![numberOffset + 5] = 0xff;
    }
  }
}

export function numberOffsetFromIndex(index: number): number {
  return index * 5 + (index - (index % 3)) / 3;
}

function decodeMmsi(
  nameData: Uint8Array,
  numberData: Uint8Array
): Mmsi | undefined {
  const name = readPaddedString(nameData.subarray(0, MMSI_NAME_BYTE_SIZE));
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
    this.sortIndividual();
    this.sortGroup();
  }
  sortIndividual(): void {
    this.individualMmsis.sort((a, b) => a.name.localeCompare(b.name));
  }
  sortGroup(): void {
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
      ans += `${mmsi.name},G${mmsi.number}\n`;
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
      if (number[0] == 'G') {
        const mmsi = new Mmsi(name, number.slice(1));
        groupMmsis.push(mmsi);
      } else {
        const mmsi = new Mmsi(name, number);
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
    individualMmsiNamesData: Uint8Array,
    individualMmsiNumbersData: Uint8Array,
    groupMmsiNames: Uint8Array,
    groupMmsiNumbers: Uint8Array
  ) {
    this.fillIndividualConfig(
      individualMmsiNamesData,
      individualMmsiNumbersData
    );
    this.fillGroupConfig(groupMmsiNames, groupMmsiNumbers);
  }
  fillIndividualConfig(
    individualMmsiNamesData: Uint8Array,
    individualMmsiNumbersData: Uint8Array
  ) {
    this.sortIndividual();
    if (this.individualMmsis.length > this.maxIndividualMmsis) {
      throw new Error('Too many MMSIs');
    }
    const maybeDuplicate = hasDuplicateMmsis(this.individualMmsis);
    if (maybeDuplicate) {
      throw new Error(`Duplicate MMSI ${maybeDuplicate}`);
    }
    individualMmsiNamesData.fill(255);
    individualMmsiNumbersData.fill(255);
    for (const [index, mmsi] of this.individualMmsis.entries()) {
      mmsi.fillConfig(
        individualMmsiNamesData,
        individualMmsiNumbersData,
        index
      );
    }
  }
  fillGroupConfig(groupMmsiNames: Uint8Array, groupMmsiNumbers: Uint8Array) {
    this.sortGroup();
    if (this.groupMmsis.length > this.maxGroupMmsis) {
      throw new Error('Too many group MMSIs');
    }
    const maybeDuplicate = hasDuplicateMmsis(this.groupMmsis);
    if (maybeDuplicate) {
      throw new Error(`Duplicate MMSI ${maybeDuplicate}`);
    }
    groupMmsiNames.fill(255), groupMmsiNumbers.fill(255);

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

function hasDuplicateMmsis(mmsis: Mmsi[]): string | undefined {
  for (let i = 0; i < mmsis.length; i++) {
    for (let j = i + 1; j < mmsis.length; j++) {
      if (mmsis[i].number == mmsis[j].number) {
        return mmsis[i].number;
      }
    }
  }
  return undefined;
}
