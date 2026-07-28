import { DateTime } from 'luxon';

import { computeNextOccurrenceUtc, parseTimeLocalParts } from '@/lib/recurringMeetingSummary';

describe('parseTimeLocalParts', () => {
  it('parses HH:mm and HH:mm:ss', () => {
    expect(parseTimeLocalParts('14:30')).toEqual({ hour: 14, minute: 30, second: 0 });
    expect(parseTimeLocalParts('09:05:07')).toEqual({ hour: 9, minute: 5, second: 7 });
  });
});

describe('computeNextOccurrenceUtc', () => {
  it('returns weekly Sunday 2pm LA as UTC after a fixed Monday in LA', () => {
    const fixedNow = DateTime.fromISO('2025-03-10T20:00:00.000Z', { zone: 'utc' });
    const next = computeNextOccurrenceUtc(
      {
        recurrenceFrequency: 'weekly',
        weekday: 0,
        timeLocal: '14:00',
        timezone: 'America/Los_Angeles',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      fixedNow
    );
    expect(next).not.toBeNull();
    const la = next!.setZone('America/Los_Angeles');
    expect(la.weekday).toBe(7);
    expect(la.hour).toBe(14);
    expect(la > fixedNow.setZone('America/Los_Angeles')).toBe(true);
  });

  it('returns monthly first Friday after anchor in New York', () => {
    const fixedNow = DateTime.fromISO('2025-03-01T12:00:00.000Z', { zone: 'utc' });
    const next = computeNextOccurrenceUtc(
      {
        recurrenceFrequency: 'monthly_nth',
        weekday: 5,
        timeLocal: '18:30',
        timezone: 'America/New_York',
        monthWeekOrdinal: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      fixedNow
    );
    expect(next).not.toBeNull();
    const ny = next!.setZone('America/New_York');
    expect(ny.weekday).toBe(5);
    expect(ny.day).toBeLessThanOrEqual(7);
    expect(ny.hour).toBe(18);
    expect(ny.minute).toBe(30);
  });
});
