import type { Group, GroupEvent } from '@/lib/api';
import { mergeUpcomingJoinedGroupEvents } from '@/lib/upcomingJoinedGroupEvents';

function ev(
  partial: Partial<GroupEvent> & Pick<GroupEvent, 'id' | 'groupId' | 'startsAt'>
): GroupEvent {
  return {
    createdByUserId: 'u1',
    title: 'T',
    description: '',
    requiresRsvp: false,
    discussionId: 'd1',
    createdAt: '2025-01-01T00:00:00.000Z',
    location: '',
    meetingLink: '',
    status: 'active',
    ...partial,
  };
}

describe('mergeUpcomingJoinedGroupEvents', () => {
  const future = '2099-06-15T12:00:00.000Z';
  const past = '2000-01-01T12:00:00.000Z';

  it('labels events with group meta and drops past or cancelled', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    const groupIds = ['g1', 'g2'] as const;
    const groupById = new Map<string, Pick<Group, 'name' | 'bannerImageUrl'>>([
      ['g1', { name: 'Alpha', bannerImageUrl: 'https://a.test/b.jpg' }],
      ['g2', { name: 'Beta', bannerImageUrl: undefined }],
    ]);
    const eventLists: GroupEvent[][] = [
      [
        ev({ id: 'e1', groupId: 'g1', startsAt: future, title: 'Later' }),
        ev({ id: 'e2', groupId: 'g1', startsAt: past, title: 'Old' }),
        ev({ id: 'e3', groupId: 'g1', startsAt: future, title: 'Soon', status: 'cancelled' }),
      ],
      [ev({ id: 'e4', groupId: 'g2', startsAt: '2099-01-01T10:00:00.000Z', title: 'First' })],
    ];
    const merged = mergeUpcomingJoinedGroupEvents(groupIds, eventLists, groupById);
    expect(merged.map((r) => r.id)).toEqual(['e4', 'e1']);
    expect(merged[0]).toMatchObject({
      id: 'e4',
      groupName: 'Beta',
      title: 'First',
    });
    expect(merged[1]).toMatchObject({
      id: 'e1',
      groupName: 'Alpha',
      groupBannerImageUrl: 'https://a.test/b.jpg',
    });
    jest.useRealTimers();
  });

  it('orders by startsAt ascending', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    const groupIds = ['g1'] as const;
    const groupById = new Map([['g1', { name: 'G', bannerImageUrl: undefined }]]);
    const eventLists: GroupEvent[][] = [
      [
        ev({
          id: 'b',
          groupId: 'g1',
          startsAt: '2099-06-02T10:00:00.000Z',
          createdAt: '2025-01-02T00:00:00.000Z',
        }),
        ev({
          id: 'a',
          groupId: 'g1',
          startsAt: '2099-06-01T10:00:00.000Z',
          createdAt: '2025-01-03T00:00:00.000Z',
        }),
      ],
    ];
    const merged = mergeUpcomingJoinedGroupEvents(groupIds, eventLists, groupById);
    expect(merged.map((r) => r.id)).toEqual(['a', 'b']);
    jest.useRealTimers();
  });
});
