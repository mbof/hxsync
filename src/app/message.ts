import { reduce } from 'rxjs';

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const unaryTypes = ['#CMDOK', '#CMDER', '#CMDUN', '#CMDSM', '#CMDSY'];

export function hex(n: number, digits: number): string {
  return n.toString(16).toUpperCase().padStart(digits, '0');
}

export function hexarr(bytes: Uint8Array): string {
  return bytes.reduce((str: string, byte: number) => str + hex(byte, 2), '');
}

export function unhex(hexString: string): Uint8Array {
  return Uint8Array.from(
    hexString.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
}

export function unhexInto(hexString: string, dest: Uint8Array) {
  hexString
    .match(/.{2}/g)!
    .map((byte, index) => (dest[index] = Number.parseInt(byte, 16)));
}

function checksum(type: string, args: string[]): string | undefined {
  if (unaryTypes.includes(type)) {
    return undefined;
  }
  let check: Uint8Array;
  if (type[0] == '#') {
    check = encoder.encode([type].concat(args).join('\t') + '\t');
  } else if (type[0] == '$') {
    check = encoder.encode([type.slice(1)] + args.join(','));
  } else {
    return undefined;
  }
  let s = check.reduce((previous, current) =>
    current == 33 ? previous : previous ^ current
  );
  return hex(s, 2);
}

export class Message {
  readonly type: string;
  readonly args: string[];
  readonly checksum_recv: string | undefined;
  readonly checksum_calc: string | undefined;

  constructor({
    encoded,
    type,
    args
  }: {
    encoded?: string | undefined;
    type?: string | undefined;
    args?: Array<string> | undefined;
  }) {
    this.args = args || [];
    if (!encoded) {
      if (!type) {
        throw new Error('Missing message type');
      }
      this.type = type;
      this.checksum_calc = checksum(type, this.args);
      return;
    }
    if (encoded[0] == '#') {
      // CP mode command message
      let components = encoded.replace(/[\r\n]*$/, '').split('\t');
      this.type = components[0];
      if (components.length > 1) {
        this.checksum_recv = components.at(-1);
        // TODO: check the checksum.
      }
      if (components.length > 2) {
        this.args = components.slice(1, -1);
      }
    } else if (encoded[0] == '$') {
      // NMEA sentence
      this.type = encoded.slice(0, 5);
      let components = encoded
        .slice(5)
        .replace(/[\r\n]*$/, '')
        .split('*');
      this.checksum_recv = components[1];
      this.args = components[0].split(',');
    } else {
      throw new Error(`Invalid message ${encoded}`);
    }
    this.checksum_calc = checksum(this.type, this.args);
  }

  toString(): string {
    if (!this.checksum_calc) {
      return this.type + '\r\n';
    }
    let checksum = this.checksum_recv || this.checksum_calc;
    if (this.type[0] == '#') {
      return (
        [this.type].concat(this.args).concat([checksum]).join('\t') + '\r\n'
      );
    } else if (this.type[0] == '$') {
      return [this.type] + this.args.join(',') + `*${checksum}\r\n`;
    }
    throw new Error(`Unknown message type ${this.type}`);
  }

  validate(): boolean {
    return (
      !this.checksum_calc ||
      !this.checksum_recv ||
      this.checksum_calc == this.checksum_recv
    );
  }
}
