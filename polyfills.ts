import { Buffer } from 'buffer';
(window as any).Buffer = (window as any).Buffer || Buffer;
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

import * as process from 'process';
(window as any).process = (window as any).process || process;
(globalThis as any).process = (globalThis as any).process || process;
