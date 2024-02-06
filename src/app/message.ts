import { reduce } from "rxjs";

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const unaryTypes = ["#CMDOK", "#CMDER", "#CMDUN", "#CMDSM", "#CMDSY"];

function checksum(type: string, args: string[]): string | undefined {
  if (unaryTypes.includes(type)) {
    return undefined;
  }
  if (type[0] == '#') {
    let check = encoder.encode([type].concat(args).join('\t') + '\t');
    let s = check.reduce((previous, current) => current == 33 ? previous : previous ^ current);
    return s.toString(16).toUpperCase().padStart(2, '0');
  } else if (type[0] == '$') {
    let check = encoder.encode([type.slice(1)] + args.join(','));
    let s = check.reduce((previous, current) => current == 33 ? previous : previous ^ current);
    return s.toString(16).toUpperCase().padStart(2, '0');
  }
  return undefined;
}

export class Message {
  readonly type: string;
  readonly args: string[];
  readonly checksum_recv: string | undefined;
  readonly checksum_calc: string | undefined;

  constructor({ bytes, type, args }:
    {
      bytes?: ArrayBuffer | undefined;
      type?: string | undefined;
      args?: Array<string> | undefined;
    }) {
    this.args = args || [];
    if (!bytes) {
      if (!type) {
        throw new Error('Missing message type');
      }
      this.type = type;
      this.checksum_calc = checksum(type, this.args);
      return;
    }
    let text = decoder.decode(bytes);
    if (text[0] == '#') {
      // CP mode command message
      let components = text.replace(/[\r\n]*$/, '').split('\t');
      this.type = components[0];
      if (components.length > 1) {
        this.checksum_recv = components.at(-1);
        // TODO: check the checksum.
      }
      if (components.length > 2) {
        this.args = components.slice(1, -1);
      }
    } else if (text[0] == '$') {
      // NMEA sentence
      this.type = text.slice(0, 5);
      let components = text.slice(5).replace(/[\r\n]*$/, '').split('*');
      this.checksum_recv = components[1];
      this.args = components[0].split(',');
    } else {
      throw new Error(`Invalid message ${text}`);
    }
    this.checksum_calc = checksum(this.type, this.args);
  }

  toString(): string {
    if (!this.checksum_calc) {
      return this.type + '\r\n';
    }
    let checksum = this.checksum_recv || this.checksum_calc;
    if (this.type[0] == '#') {
      return [this.type].
        concat(this.args).
        concat([checksum]).
        join('\t') + '\r\n';
    } else if (this.type[0] == '$') {
      return [this.type] + this.args.join(',') + `*${checksum}\r\n`;
    }
    throw new Error(`Unknown message type ${this.type}`);
  }

  validate(): boolean {
    return !this.checksum_calc || !this.checksum_recv || this.checksum_calc == this.checksum_recv;
  }
}
