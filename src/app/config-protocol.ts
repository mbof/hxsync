import { DevicemgrService } from './devicemgr.service';
import { Message, hex, hexarr, unhex } from './message';

const DEFAULT_CHUNK_SIZE: number = 0x20;

async function asyncWithTimeout<T>(
  asyncPromise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutHandle: any;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
}

export interface ConfigProtocolInterface {
  supportsMessaging(): boolean;
  sendMessage(
    type: string,
    args?: Array<string> | undefined,
    timeoutMs?: number | undefined
  ): Promise<void>;
  receiveMessage(timeoutMs?: number | undefined): Promise<Message>;
  waitForReady(): Promise<void>;
  readConfigMemory(
    address: number,
    size: number,
    progressCallback: (offset: number) => void
  ): Promise<Uint8Array>;
  writeConfigMemory(
    data: Uint8Array,
    address: number,
    progressCallback: (offset: number) => void
  ): Promise<void>;
  waitForGps(): Promise<void>;
  clearGpsLog(): Promise<void>;
  getGpsLogStatus(): Promise<number>;
}

export class ConfigProtocol implements ConfigProtocolInterface {
  constructor(private dev: DevicemgrService) {}
  public supportsMessaging(): boolean {
    return true;
  }
  public async sendMessage(
    type: string,
    args?: Array<string> | undefined,
    timeoutMs?: number | undefined
  ): Promise<void> {
    let str = new Message({ type: type, args: args }).toString();
    if (!timeoutMs) {
      await this.dev.write(str);
    } else {
      await asyncWithTimeout(this.dev.write(str), timeoutMs);
    }
    console.log(`Wrote command ${JSON.stringify(str)}`);
  }

  public async receiveMessage(
    timeoutMs?: number | undefined
  ): Promise<Message> {
    let line;
    if (!timeoutMs) {
      line = await this.dev.readline();
    } else {
      line = await asyncWithTimeout(this.dev.readline(), timeoutMs);
    }
    console.log(`Received line ${line}`);
    return new Message({ encoded: line });
  }

  private async waitForReady_() {
    let radio_status = '';
    while (radio_status != '00') {
      this.dev.flushInput();
      await this.sendMessage('#CEPSR', ['00']);
      let ans1 = await this.receiveMessage();
      if (ans1.type != '#CMDOK') {
        throw new Error('Device did not acknowledge status request');
      }
      let ans2 = await this.receiveMessage();
      if (ans2.type != '#CEPSD') {
        throw new Error('Device did not return status');
      }
      radio_status = ans2.args[0];
      if (radio_status != '00') {
        console.log(`Waiting for radio, state=${radio_status}`);
      }
      this.sendMessage('#CMDOK');
    }
  }
  public async waitForReady(): Promise<void> {
    await asyncWithTimeout(this.waitForReady_(), 1000);
  }

  private async readConfigMemoryChunk(
    offset: number,
    length: number
  ): Promise<Uint8Array> {
    await this.waitForReady();
    await this.sendMessage('#CEPRD', [hex(offset, 4), hex(length, 2)]);
    let ans1 = await this.receiveMessage();
    if (ans1.type != '#CMDOK') {
      throw new Error('Device did not acknowledge read');
    }
    let ans2 = await this.receiveMessage();
    if (ans2.type != '#CEPDT') {
      throw new Error('Device did not reply with data');
    }
    this.sendMessage('#CMDOK');
    return unhex(ans2.args[2]);
  }

  private async writeConfigMemoryChunk(offset: number, data: Uint8Array) {
    await this.waitForReady();
    let str = hexarr(data);
    await this.sendMessage('#CEPWR', [
      hex(offset, 4),
      hex(data.length, 2),
      str
    ]);
    let ans = await this.receiveMessage();
    if (ans.type != '#CMDOK') {
      throw new Error('Device did not acknowledge write');
    }
  }
  private getChunkSize(): number {
    return (
      this.dev.configSession._deviceConfig?.dat?.maxChunkLength ||
      DEFAULT_CHUNK_SIZE
    );
  }
  public async readConfigMemory(
    address: number,
    size: number,
    progressCallback: (offset: number) => void
  ): Promise<Uint8Array> {
    const data = new Uint8Array(size);
    for (let offset = 0; offset < size; offset += this.getChunkSize()) {
      data.set(
        await this.readConfigMemoryChunk(
          address + offset,
          Math.min(size - offset, this.getChunkSize())
        ),
        offset
      );
      progressCallback(offset);
    }
    return data;
  }
  public async writeConfigMemory(
    data: Uint8Array,
    address: number,
    progressCallback: (offset: number) => void
  ): Promise<void> {
    for (let offset = 0; offset < data.length; offset += this.getChunkSize()) {
      await this.writeConfigMemoryChunk(
        address + offset,
        data.subarray(
          offset,
          Math.min(offset + this.getChunkSize(), data.length)
        )
      );
      progressCallback(offset);
    }
  }

  private async waitForGps_() {
    while (true) {
      this.dev.flushInput();
      this.sendMessage('$PMTK', ['000']);
      let ans = await this.receiveMessage();
      if (
        ans.type == '$PMTK' &&
        ans.args.length == 3 &&
        ans.args[0] == '001' &&
        ans.args[1] == '0' &&
        ans.args[2] == '3'
      ) {
        return;
      }
    }
  }
  public async waitForGps() {
    await asyncWithTimeout(this.waitForGps_(), 1000);
  }

  public async clearGpsLog() {
    await this.waitForGps();
    await this.sendMessage('$PMTK', ['182', '6', '1']);
    let ans = await this.receiveMessage();
    if (
      ans.type != '$PMTK' ||
      ans.args.length != 3 ||
      ans.args[0] != '001' ||
      ans.args[1] != '182' ||
      ans.args[2] != '3'
    ) {
      throw new Error(`Unexpected ClearLog acknowledgement ${ans.toString()}`);
    }
  }

  public async getGpsLogStatus(): Promise<number> {
    await this.waitForGps();
    await this.sendMessage('$PMTK', ['183']);
    let ans = await this.receiveMessage();

    // The Message parser uses a fixed 5-char type for NMEA ($PMTK),
    // so $PMTKLOG results in type='$PMTK' and args[0]='LOG'.
    if (ans.type != '$PMTK' || ans.args[0] != 'LOG' || ans.args.length < 11) {
      throw new Error(`Unexpected LogStatus response ${ans.toString()}`);
    }

    // Percent is at index 10 (LOG is at 0, Serial# at 1, ..., Percent at 10)
    const percent = parseInt(ans.args[10], 10);

    // Some devices send an ACK ($PMTK001,183,3) after the data message.
    // We try to consume it to avoid leaving it in the buffer for the next command.
    try {
      let ack = await this.receiveMessage(100);
      if (ack.type == '$PMTK' && ack.args[0] == '001' && ack.args[1] == '183') {
        console.log('Consumed LogStatus ACK');
      }
    } catch (e) {
      // Ignore timeout, maybe no ACK is coming
    }

    return percent;
  }
}

// This class operates on a binary image in memory directly.
export class DatConfigProtocol implements ConfigProtocolInterface {
  constructor(public datImage: Uint8Array) {}
  public supportsMessaging(): boolean {
    return false;
  }
  sendMessage(
    type: string,
    args?: Array<string> | undefined,
    timeoutMs?: number | undefined
  ): Promise<void> {
    throw new Error('sendMessage is unavailable on DatConfigProtocol.');
  }
  receiveMessage(timeoutMs?: number | undefined): Promise<Message> {
    throw new Error('sendMessage is unavailable on DatConfigProtocol.');
  }
  async waitForReady(): Promise<void> {
    return;
  }
  async waitForGps(): Promise<void> {
    return;
  }
  async readConfigMemory(
    address: number,
    size: number,
    progressCallback: (offset: number) => void
  ): Promise<Uint8Array> {
    progressCallback(size);
    return this.datImage.slice(address, address + size);
  }
  async writeConfigMemory(
    data: Uint8Array,
    address: number,
    progressCallback: (offset: number) => void
  ): Promise<void> {
    progressCallback(data.length);
    this.datImage.subarray(address).set(data);
  }
  async clearGpsLog(): Promise<void> {
    return;
  }
  async getGpsLogStatus(): Promise<number> {
    return 0;
  }
}
