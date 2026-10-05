import { describe, expect, it } from 'vitest';
import {
  buildSlotTimes,
  isBlocked,
  rangesOverlap,
  parseHm,
} from '../src/modules/slots/slot.utils';

describe('slot utils', () => {
  it('detects overlaps', () => {
    expect(rangesOverlap(600, 630, 615, 645)).toBe(true);
    expect(rangesOverlap(600, 630, 630, 660)).toBe(false);
  });

  it('blocks break intervals', () => {
    expect(isBlocked(780, 810, [{ start: 780, end: 840 }])).toBe(true);
    expect(isBlocked(750, 780, [{ start: 780, end: 840 }])).toBe(false);
  });

  it('builds grid respecting duration', () => {
    const times = buildSlotTimes(parseHm('10:00'), parseHm('12:00'), 45, 15);
    expect(times[0]).toBe(600);
    expect(times.at(-1)).toBe(675);
  });
});
