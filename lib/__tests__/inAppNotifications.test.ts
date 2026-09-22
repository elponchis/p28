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

  it('sends a platform-wide announcement to the home feed, where it lives', () => {
    const p = inAppNotificationPresentation({ kind: 'global_announcement' });
    expect(p.iconName).toBe('megaphone-outline');
    expect(p.route).toEqual({ pathname: '/(tabs)' });
  });

  it('sends a discussion reply to the thread', () => {
    const p = inAppNotificationPresentation({
      kind: 'discussion_post',
      groupId: 'g1',
      discussionId: 'd1',
    });
    expect(p.iconName).toBe('chatbubbles-outline');
    expect(p.route).toEqual({ pathname: '/group/discussion/[id]', params: { id: 'd1' } });
  });

  it('sends an accepted friend request to that person', () => {
    const p = inAppNotificationPresentation({ kind: 'friend_accepted', actorUserId: 'u9' });
    expect(p.iconName).toBe('person-add-outline');
    expect(p.route).toEqual({ pathname: '/profile/[userId]', params: { userId: 'u9' } });
  });

  it('sends an assignment to the assignment, carrying its group', () => {
    const p = inAppNotificationPresentation({
      kind: 'assignment',
      groupId: 'g1',
      assignmentId: 'as1',
    });
    expect(p.iconName).toBe('document-text-outline');
    expect(p.route).toEqual({
      pathname: '/group/[id]/assignment/[assignmentId]',
      params: { id: 'g1', assignmentId: 'as1' },
    });
  });

  it('gives every kind its own label', () => {
    const labels = (
      [
        'announcement',
        'group_event',
        'chat_message',
        'global_announcement',
        'discussion_post',
        'friend_accepted',
        'assignment',
      ] as const
    ).map((kind) => inAppNotificationPresentation({ kind }).kindLabel);
    expect(new Set(labels).size).toBe(7);
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
    expect(inAppNotificationPresentation({ kind: 'discussion_post' }).route).toBeNull();
    expect(inAppNotificationPresentation({ kind: 'friend_accepted' }).route).toBeNull();
    // An assignment needs its group too — the route is nested under it.
    expect(
      inAppNotificationPresentation({ kind: 'assignment', assignmentId: 'as1' }).route
    ).toBeNull();
  });
});
