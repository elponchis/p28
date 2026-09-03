import { summarizeReadReceipt } from '@/lib/readReceipts';
import type { ChatMember } from '@/lib/api';

function member(userId: string, lastReadAt?: string): ChatMember {
  return { userId, chatId: 'chat-1', lastReadAt };
}

const SENT_AT = '2026-09-03T10:00:00.000Z';

describe('summarizeReadReceipt', () => {
  it('reports the other member as a reader when they read at or after the send time', () => {
    const result = summarizeReadReceipt(
      [member('me', SENT_AT), member('you', '2026-09-03T10:00:05.000Z')],
      'me',
      SENT_AT
    );
    expect(result).toEqual({ readerCount: 1, otherCount: 1 });
  });

  it('treats a read exactly at the send time as read', () => {
    const result = summarizeReadReceipt([member('me'), member('you', SENT_AT)], 'me', SENT_AT);
    expect(result).toEqual({ readerCount: 1, otherCount: 1 });
  });

  it('returns null while the other member is still behind the message', () => {
    const result = summarizeReadReceipt(
      [member('me'), member('you', '2026-09-03T09:59:59.000Z')],
      'me',
      SENT_AT
    );
    expect(result).toBeNull();
  });

  it('counts only the members who have caught up, in a group', () => {
    const result = summarizeReadReceipt(
      [
        member('me'),
        member('a', '2026-09-03T10:00:01.000Z'),
        member('b', '2026-09-03T10:00:02.000Z'),
        member('c', '2026-09-03T09:00:00.000Z'),
        member('d'),
      ],
      'me',
      SENT_AT
    );
    expect(result).toEqual({ readerCount: 2, otherCount: 4 });
  });

  it('never counts the viewer as a reader of their own message', () => {
    const result = summarizeReadReceipt([member('me', '2026-09-03T11:00:00.000Z')], 'me', SENT_AT);
    expect(result).toBeNull();
  });

  it('returns null for a member with no read position', () => {
    expect(summarizeReadReceipt([member('me'), member('you')], 'me', SENT_AT)).toBeNull();
  });

  it('returns null when the sent time cannot be parsed', () => {
    const result = summarizeReadReceipt(
      [member('me'), member('you', '2026-09-03T10:00:05.000Z')],
      'me',
      'not-a-date'
    );
    expect(result).toBeNull();
  });

  it('ignores an unparseable read position rather than counting it', () => {
    const result = summarizeReadReceipt([member('me'), member('you', 'nonsense')], 'me', SENT_AT);
    expect(result).toBeNull();
  });

  it('returns null without a current user', () => {
    expect(summarizeReadReceipt([member('you', SENT_AT)], undefined, SENT_AT)).toBeNull();
  });

  it('returns null when there are no members to have read it', () => {
    expect(summarizeReadReceipt([], 'me', SENT_AT)).toBeNull();
    expect(summarizeReadReceipt(undefined, 'me', SENT_AT)).toBeNull();
  });
});
