import type { ChatMessage } from '@/lib/api';

import {
  chatMessageQualifiesForSharedIndex,
  chatMessagesToSharedContentPlaceholder,
} from '@/lib/chatSharedContent';

function msg(partial: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return {
    chatId: 'c1',
    userId: 'u1',
    body: '',
    ...partial,
  };
}

describe('chatSharedContent', () => {
  it('qualifies messages with attachments, images, or URLs in body', () => {
    expect(chatMessageQualifiesForSharedIndex(msg({ id: '1', createdAt: '2020-01-01', body: 'hi' }))).toBe(
      false
    );
    expect(
      chatMessageQualifiesForSharedIndex(
        msg({ id: '2', createdAt: '2020-01-02', body: 'see https://a.com' })
      )
    ).toBe(true);
    expect(
      chatMessageQualifiesForSharedIndex(
        msg({
          id: '3',
          createdAt: '2020-01-03',
          body: '',
          attachments: [{ kind: 'file', url: 'https://x/f.pdf' }],
        })
      )
    ).toBe(true);
    expect(
      chatMessageQualifiesForSharedIndex(
        msg({ id: '4', createdAt: '2020-01-04', body: '', imageUrls: ['https://x/i.jpg'] })
      )
    ).toBe(true);
  });

  it('placeholder sorts newest first', () => {
    const a = msg({ id: 'a', createdAt: '2020-01-01T00:00:00Z', body: 'https://old.com' });
    const b = msg({ id: 'b', createdAt: '2020-02-01T00:00:00Z', body: 'https://new.com' });
    const out = chatMessagesToSharedContentPlaceholder([a, b]);
    expect(out.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
