import { readPaddedString } from './util';

export type ScramblerCode = {
  type: 4 | 32;
  code: number;
};

export type MarineChannelConfig = {
  id: string;
  enabled: boolean;
  flags: Uint8Array;
  dsc: 'enabled' | 'disabled';
  name: string;
  scrambler: undefined | ScramblerCode;
};

export const CHANNEL_NAME_BYTES = 16;
export const MARINE_FLAG_BYTES = 4;

export function decodeChannelConfig(
  n: number,
  enabledData: Uint8Array,
  flags: Uint8Array,
  nameData: Uint8Array
): MarineChannelConfig {
  const enabledByte = Math.floor(n / 8);
  const enabledBitMask = 1 << (7 - (n % 8));
  const enabled = (enabledData[enabledByte] & enabledBitMask) > 0;

  const baseId = `${flags[0]}`.padStart(2, '0');
  const suffixFlags = flags[1] & 0x3;
  const suffix =
    suffixFlags == 0
      ? ''
      : suffixFlags == 1
        ? 'A'
        : suffixFlags == 2
          ? 'B'
          : '?';
  const prefixFlags = flags[2] & 0x7f;
  const prefix = [0x7f, 0].includes(prefixFlags) ? '' : `${prefixFlags}`;
  const id = `${prefix}${baseId}${suffix}`;

  const dsc = flags[2] & 0x80 ? 'enabled' : 'disabled';

  const scramblerFlag = flags[3];
  let scrambler: ScramblerCode | undefined;
  if (flags[3] & 0x80) {
    scrambler = {
      type: flags[3] & 0x40 ? 32 : 4,
      code: flags[3] & 0x1f
    };
  }

  const name = readPaddedString(nameData);

  return {
    id,
    enabled,
    flags,
    dsc,
    name,
    scrambler
  };
}
