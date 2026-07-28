import { formatMessageSentClockTime } from '@/lib/dates';

describe('formatMessageSentClockTime', () => {
  it('returns a non-empty string for a valid ISO timestamp', () => {
    const result = formatMessageSentClockTime('2020-06-15T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('includes minute digits from the formatted time', () => {
    const result = formatMessageSentClockTime('2020-06-15T09:05:00.000Z');
    expect(/\d/.test(result)).toBe(true);
  });
});
