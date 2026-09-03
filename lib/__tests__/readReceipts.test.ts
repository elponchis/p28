import { countUnreadMembers } from '@/lib/readReceipts';
import type { ChatMember } from '@/lib/api';

function member(userId: string, lastReadAt?: string): ChatMember {
  return { userId, chatId: 'chat-1', lastReadAt };
}

const SENT_AT = '2026-09-03T10:00:00.000Z';

describe('countUnreadMembers', () => {
  it('counts the other member as unread until they catch up', () => {
    expect(
      countUnreadMembers([member('me'), member('you', '2026-09-03T09:59:59.000Z')], 'me', SENT_AT)
    ).toBe(1);
  });

  it('drops to zero once they read it', () => {
    expect(
      countUnreadMembers([member('me'), member('you', '2026-09-03T10:00:05.000Z')], 'me', SENT_AT)
    ).toBe(0);
  });

  it('treats a read exactly at the send time as read', () => {
    expect(countUnreadMembers([member('me'), member('you', SENT_AT)], 'me', SENT_AT)).toBe(0);
  });

  it('counts a member who has never opened the chat', () => {
    expect(countUnreadMembers([member('me'), member('you')], 'me', SENT_AT)).toBe(1);
  });

  it('counts only the members still behind, in a group', () => {
    const members = [
      member('me'),
      member('a', '2026-09-03T10:00:01.000Z'),
      member('b', '2026-09-03T10:00:02.000Z'),
      member('c', '2026-09-03T09:00:00.000Z'),
      member('d'),
    ];
    expect(countUnreadMembers(members, 'me', SENT_AT)).toBe(2);
  });

  it('never counts the viewer against their own message', () => {
    expect(countUnreadMembers([member('me')], 'me', SENT_AT)).toBe(0);
    expect(countUnreadMembers([member('me', '2026-09-03T09:00:00.000Z')], 'me', SENT_AT)).toBe(0);
  });

  it('treats an unparseable read position as unread rather than as read', () => {
    expect(countUnreadMembers([member('me'), member('you', 'nonsense')], 'me', SENT_AT)).toBe(1);
  });

  it('returns zero when the sent time cannot be parsed, rather than marking everyone unread', () => {
    expect(countUnreadMembers([member('me'), member('you')], 'me', 'not-a-date')).toBe(0);
  });

  it('returns zero without a current user', () => {
    expect(countUnreadMembers([member('you')], undefined, SENT_AT)).toBe(0);
  });

  it('returns zero when there is nobody else in the chat', () => {
    expect(countUnreadMembers([], 'me', SENT_AT)).toBe(0);
    expect(countUnreadMembers(undefined, 'me', SENT_AT)).toBe(0);
  });
});
