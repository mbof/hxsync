import { controlKnobsData } from './preferences-knobs';

describe('controlKnobsData', () => {
  it('should be defined', () => {
    expect(controlKnobsData).toBeDefined();
  });
  it('should not have any duplicate keys', () => {
    const keys = new Set<string>();
    for (const knob of controlKnobsData) {
      expect(keys.has(knob.id)).toBeFalsy();
      keys.add(knob.id);
    }
  });
  it('should not have any duplicate addresses', () => {
    const addresses = new Set<number>();
    for (const knob of controlKnobsData) {
      expect(addresses.has(knob.address)).toBeFalsy();
      addresses.add(knob.address);
    }
  });
});
