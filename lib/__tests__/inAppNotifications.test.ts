import { inAppNotificationPresentation } from '@/lib/inAppNotifications';

describe('inAppNotificationPresentation', () => {
  it('sends a chat message to the conversation', () => {
    const p = inAppNotificationPresentation({ kind: 'chat_message', chatId: 'chat-1' });
    expect(p.iconName).toBe('chatbubble-ellipses-outline');
    expect(p.route).toEqual({ pathname: '/messages/chat/[id]', params: { id: 'chat-1' } });
  });

  it('sends an event to the event', () => {
    const p = inAppNotificationPresentation({
      kind: 'group_event',
      groupId: 'g1',
      groupEventId: 'e1',
    });
    expect(p.iconName).toBe('calendar-outline');
    expect(p.route).toEqual({ pathname: '/group/event/[id]', params: { id: 'e1' } });
  });

  it('sends an announcement to the announcement, carrying its group', () => {
    const p = inAppNotificationPresentation({
      kind: 'announcement',
      groupId: 'g1',
      announcementId: 'a1',
    });
    expect(p.iconName).toBe('megaphone-outline');
    expect(p.route).toEqual({
      pathname: '/group/announcement/[id]',
      params: { id: 'a1', groupId: 'g1' },
    });
  });

  it('gives every kind its own label', () => {
    const labels = (['announcement', 'group_event', 'chat_message'] as const).map(
      (kind) => inAppNotificationPresentation({ kind }).kindLabel
    );
    expect(new Set(labels).size).toBe(3);
    expect(labels.every((l) => l.length > 0)).toBe(true);
  });

  it('has no route when the row lost what it pointed at', () => {
    expect(inAppNotificationPresentation({ kind: 'chat_message' }).route).toBeNull();
    expect(inAppNotificationPresentation({ kind: 'group_event' }).route).toBeNull();
    expect(inAppNotificationPresentation({ kind: 'announcement', groupId: 'g' }).route).toBeNull();
    // An announcement needs its group too: the screen cannot open one without knowing where it is.
    expect(
      inAppNotificationPresentation({ kind: 'announcement', announcementId: 'a1' }).route
    ).toBeNull();
  });
});
