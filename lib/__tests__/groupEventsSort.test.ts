import type { GroupEvent } from '@/lib/api';
import {
  compareGroupEventsByStartThenCreated,
  sortGroupEventsForList,
} from '@/lib/groupEventsSort';

function ev(
  partial: Partial<GroupEvent> & Pick<GroupEvent, 'id' | 'startsAt' | 'createdAt'>
): GroupEvent {
  return {
    groupId: 'g',
    createdByUserId: 'u',
    title: 't',
    description: '',
    requiresRsvp: false,
    discussionId: 'd',
    location: '',
    meetingLink: '',
    status: 'active',
    ...partial,
  };
}

describe('compareGroupEventsByStartThenCreated', () => {
  it('orders by startsAt ascending', () => {
    const a = ev({
      id: '1',
      startsAt: '2025-06-02T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const b = ev({
      id: '2',
      startsAt: '2025-06-01T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    expect(compareGroupEventsByStartThenCreated(a, b)).toBeGreaterThan(0);
    expect(compareGroupEventsByStartThenCreated(b, a)).toBeLessThan(0);
  });

  it('ties on startsAt by createdAt descending', () => {
    const sameStart = '2025-06-01T10:00:00.000Z';
    const older = ev({ id: '1', startsAt: sameStart, createdAt: '2025-01-01T00:00:00.000Z' });
    const newer = ev({ id: '2', startsAt: sameStart, createdAt: '2025-02-01T00:00:00.000Z' });
    expect(compareGroupEventsByStartThenCreated(older, newer)).toBeGreaterThan(0);
    expect(compareGroupEventsByStartThenCreated(newer, older)).toBeLessThan(0);
  });
});

describe('sortGroupEventsForList', () => {
  const nowMs = new Date('2025-06-15T12:00:00.000Z').getTime();

  it('puts active upcoming before past', () => {
    const past = ev({
      id: 'p',
      startsAt: '2025-06-01T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const future = ev({
      id: 'f',
      startsAt: '2025-06-20T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const sorted = sortGroupEventsForList([past, future], nowMs);
    expect(sorted.map((e) => e.id)).toEqual(['f', 'p']);
  });

  it('orders active upcoming by start then created', () => {
    const sameStart = '2025-06-20T10:00:00.000Z';
    const a = ev({
      id: 'a',
      startsAt: '2025-06-25T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const b = ev({ id: 'b', startsAt: sameStart, createdAt: '2025-01-01T00:00:00.000Z' });
    const c = ev({ id: 'c', startsAt: sameStart, createdAt: '2025-02-01T00:00:00.000Z' });
    const sorted = sortGroupEventsForList([a, c, b], nowMs);
    expect(sorted.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('orders non-upcoming by most recent start first', () => {
    const olderPast = ev({
      id: 'o',
      startsAt: '2025-05-01T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const newerPast = ev({
      id: 'n',
      startsAt: '2025-06-10T10:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const sorted = sortGroupEventsForList([olderPast, newerPast], nowMs);
    expect(sorted.map((e) => e.id)).toEqual(['n', 'o']);
  });
});
