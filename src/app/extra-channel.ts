import { ScramblerCode } from './channel';

export type PowerType = 'disabled' | 'low' | 'default_low' | 'normal';

export type ExtraChannelConfig = {
  channel_groups: 'all' | number[] | number;
  id: string;
  enabled: boolean;
  rx_mhz: number;
  tx: PowerType;
  tx_mhz: undefined | number;
  scrambler: undefined | ScramblerCode;
};

// TODO: write config coding / decoding logic for extra channels
