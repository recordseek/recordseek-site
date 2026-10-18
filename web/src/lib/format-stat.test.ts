import { describe, expect, it } from 'vitest';
import { formatStat } from './format-stat';

describe('formatStat', () => {
  it('rounds down to the thousand with a plus', () => {
    expect(formatStat(2142018)).toBe('2,142,000+');
    expect(formatStat(157472)).toBe('157,000+');
    expect(formatStat(999)).toBe('0+');
    expect(formatStat(1000)).toBe('1,000+');
    expect(formatStat(-5)).toBe('0+');
  });
});
