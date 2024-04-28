import { DeviceConfig, DevicemgrService } from './devicemgr.service';
import { Message, hex, hexarr, unhex } from './message';

const CHUNK_SIZE: number = 0x40;

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

export class ConfigProtocol {
  constructor(private dev: DevicemgrService) {}
  public async sendMessage(
    type: string,
    args?: Array<string> | undefined,
    timeoutMs?: number | undefined
  ) {
    let str = new Message({ type: type, args: args }).toString();
    if (!timeoutMs) {
      await this.dev.write(str);
    } else {
      await asyncWithTimeout(this.dev.write(str), timeoutMs);
    }
    console.log(`Wrote command ${JSON.stringify(str)}`);
  }

  public async receiveMessage(timeoutMs?: number | undefined) {
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
  public async waitForReady() {
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
  public async readConfigMemory(
    address: number,
    size: number,
    progressCallback: (offset: number) => void
  ) {
    const data = new Uint8Array(size);
    for (let offset = 0; offset < size; offset += CHUNK_SIZE) {
      data.set(
        await this.readConfigMemoryChunk(
          address + offset,
          Math.min(size - offset, CHUNK_SIZE)
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
  ) {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      await this.writeConfigMemoryChunk(
        address + offset,
        data.subarray(offset, Math.min(offset + CHUNK_SIZE, data.length))
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
}
