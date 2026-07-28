import {
  formatGroupEventCalendarBlock,
  isGroupEventDiscussionReadOnly,
  isGroupEventPast,
  messageLocalMinuteKey,
} from '@/lib/dates';

describe('isGroupEventDiscussionReadOnly', () => {
  it('returns true when event is cancelled', () => {
    expect(
      isGroupEventDiscussionReadOnly({
        status: 'cancelled',
        startsAt: '2099-01-01T00:00:00.000Z',
      })
    ).toBe(true);
  });

  it('returns false when active and start is in the future', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isGroupEventDiscussionReadOnly({ status: 'active', startsAt: future })).toBe(false);
  });

  it('returns false when active even if start is in the past', () => {
    expect(
      isGroupEventDiscussionReadOnly({
        status: 'active',
        startsAt: '2000-01-01T00:00:00.000Z',
      })
    ).toBe(false);
  });
});

describe('formatGroupEventCalendarBlock', () => {
  it('returns a short month label and numeric day', () => {
    const { month, day } = formatGroupEventCalendarBlock('2025-10-24T15:00:00.000Z');
    expect(day).toMatch(/^\d{1,2}$/);
    expect(month.length).toBeGreaterThan(0);
  });
});

describe('messageLocalMinuteKey', () => {
  it('matches for two instants in the same local minute', () => {
    const a = '2024-06-15T14:30:10.000Z';
    const b = '2024-06-15T14:30:59.000Z';
    expect(messageLocalMinuteKey(a)).toBe(messageLocalMinuteKey(b));
  });

  it('differs across minute boundaries', () => {
    const a = '2024-06-15T14:30:59.000Z';
    const b = '2024-06-15T14:31:00.000Z';
    expect(messageLocalMinuteKey(a)).not.toBe(messageLocalMinuteKey(b));
  });
});

describe('isGroupEventPast', () => {
  it('returns false when start is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isGroupEventPast(future)).toBe(false);
  });

  it('returns true when start is in the past', () => {
    expect(isGroupEventPast('2000-01-01T00:00:00.000Z')).toBe(true);
  });
});
