import { isIsoDate } from '@/lib/dates';

describe('isIsoDate', () => {
  it('accepts a real date in the form the admin fields ask for', () => {
    expect(isIsoDate('2026-03-02')).toBe(true);
    expect(isIsoDate('2026-12-31')).toBe(true);
  });

  it('rejects a date that does not exist, which the regex alone would let through', () => {
    // A term ending on a day that never comes is a term that never closes.
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });

  it('rejects other shapes rather than guessing at them', () => {
    expect(isIsoDate('2026-3-2')).toBe(false);
    expect(isIsoDate('03/02/2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate('2026-03-02T00:00:00Z')).toBe(false);
  });
});
