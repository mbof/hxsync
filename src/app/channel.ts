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

export function parseChannelId(id: number | string) {
  if (typeof id == 'number') {
    id = `${id}`.padStart(2, '0');
  }
  let numeric_id: number | undefined;
  let prefix = 0x7f;
  let suffix: string | undefined;
  if (id.length == 2) {
    numeric_id = Number(id);
  } else if (id.length == 4) {
    numeric_id = Number(id.substring(2, 4));
    prefix = Number(id.substring(0, 2));
  } else if (id.length == 3) {
    numeric_id = Number(id.substring(0, 2));
    suffix = id.substring(2);
  }
  if (!numeric_id || (suffix && !['A', 'B'].includes(suffix))) {
    throw new Error(`Unparseable channel ID ${id}`);
  }
  return {
    numeric_id,
    prefix,
    suffix
  };
}

export function getChannelIdMatcher(id: number | string) {
  const { numeric_id, prefix, suffix } = parseChannelId(id);
  return function (flags: Uint8Array) {
    const prefixFlags = flags[2] & 0x7f;
    const suffixFlags = flags[1] & 0x03;
    return (
      flags[0] == numeric_id &&
      prefixFlags == prefix &&
      ((suffix == undefined && suffixFlags == 0) ||
        (suffix == 'A' && suffixFlags == 1) ||
        (suffix == 'B' && suffixFlags == 2))
    );
  };
}

export function setIntershipFlag(flags: Uint8Array, enabled: boolean) {
  if (enabled) {
    flags[2] |= 0x80;
  } else {
    flags[2] &= 0xff ^ 0x80;
  }
}

export function setScramblerFlag(
  flags: Uint8Array,
  scrambler: ScramblerCode | undefined
) {
  if (!scrambler) {
    flags[3] = 0;
  } else {
    flags[3] = 0x80;
    if (scrambler.type == 32) {
      flags[3] |= 0x40;
    }
    if (scrambler.code < 0 || scrambler.code >= scrambler.type) {
      throw new Error(
        `Scrambler code ${scrambler.code} must be between 0 and ${scrambler.type - 1}`
      );
    }
    flags[3] |= scrambler.code;
  }
}

export function decodeChannelConfig(
  n: number,
  enabledData: Uint8Array,
  flags: Uint8Array,
  nameData: Uint8Array,
  scramblerSupported: boolean
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
  if (scramblerSupported && flags[3] & 0x80) {
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
