
const decoder = new TextDecoder();

export class Message {
  readonly type: string | undefined;
  readonly args: string[];
  readonly checksum: string | undefined;

  constructor({ bytes, type, args }:
    {
      bytes?: ArrayBuffer | undefined;
      type?: string | undefined;
      args?: Array<string> | undefined;
    }) {
    this.type = type;
    this.args = args || [];
    if (!bytes) {
      return;
    }
    let text = decoder.decode(bytes);
    if (text[0] == '#') {
      // CP mode command message
      let components = text.replace(/[\r\n]*$/, '').split('\t');
      this.type = components[0];
      if (components.length > 1) {
        this.checksum = components.at(-1);
        // TODO: check the checksum.
      }
      if (components.length > 2) {
        this.args = components.slice(1, -1);
      }
    } else if (text[0] == '$') {
      // NMEA sentence
      this.type = text.slice(0, 5);
      let components = text.slice(5).replace(/[\r\n]*$/, '').split('*');
      this.checksum = components[1];
      this.args = components[0].split(',');
    } else {
      throw new Error(`Invalid message ${text}`);
    }
  }
}
