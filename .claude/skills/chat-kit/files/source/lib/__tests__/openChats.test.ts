import {
  MAX_OPEN_CHATS,
  capOpenChats,
  mergeRestoredOpenChats,
  orderByActivity,
  parseStoredOpenChats,
  withChatOpened,
  type OpenChat,
} from '@/lib/openChats';

const chat = (id: string, addedAt: number, title = `Chat ${id}`): OpenChat => ({
  id,
  title,
  addedAt,
});

describe('openChats', () => {
  describe('withChatOpened', () => {
    it('adds a chat that is not listed yet', () => {
      const next = withChatOpened([], { id: 'c1', title: 'Ada' }, 1000);
      expect(next).toEqual([{ id: 'c1', title: 'Ada', addedAt: 1000 }]);
    });

    it('does not duplicate a chat that is already listed', () => {
      const next = withChatOpened([chat('c1', 1000)], { id: 'c1', title: 'Chat c1' }, 9000);
      expect(next).toHaveLength(1);
    });

    it('leaves the order alone when a listed chat is opened again', () => {
      const prev = [chat('c1', 1000), chat('c2', 2000)];
      const next = withChatOpened(prev, { id: 'c1', title: 'Chat c1' }, 9000);
      expect(next.map((c) => c.id)).toEqual(['c1', 'c2']);
      // Opening is not activity: the timestamp that decides eviction must not move either.
      expect(next[0].addedAt).toBe(1000);
    });

    it('takes the newer title when a chat has been renamed', () => {
      const next = withChatOpened([chat('c1', 1000, 'Old')], { id: 'c1', title: 'New' }, 1200);
      expect(next[0].title).toBe('New');
      expect(next[0].addedAt).toBe(1000);
    });

    it('returns the same list when nothing moved, so React can skip the render', () => {
      const prev = [chat('c1', 1000)];
      expect(withChatOpened(prev, { id: 'c1', title: 'Chat c1' }, 1500)).toBe(prev);
    });

    it('ignores a chat with no id', () => {
      const prev = [chat('c1', 1000)];
      expect(withChatOpened(prev, { id: '', title: 'Nowhere' }, 2000)).toBe(prev);
    });

    it('evicts the longest-listed chat once the list is full', () => {
      const full = Array.from({ length: MAX_OPEN_CHATS }, (_, i) => chat(`c${i}`, 1000 + i));
      const next = withChatOpened(full, { id: 'new', title: 'New' }, 9000);
      expect(next).toHaveLength(MAX_OPEN_CHATS);
      expect(next.map((c) => c.id)).toContain('new');
      expect(next.map((c) => c.id)).not.toContain('c0');
      expect(next.map((c) => c.id)).toContain('c1');
    });
  });

  describe('orderByActivity', () => {
    it('puts the most recently written-in conversation first', () => {
      const chats = [chat('c1', 5000), chat('c2', 1000)];
      const ordered = orderByActivity(
        chats,
        new Map([
          ['c1', 7000],
          ['c2', 9000],
        ])
      );
      expect(ordered.map((c) => c.id)).toEqual(['c2', 'c1']);
    });

    it('falls back to when a conversation was added while it has no messages', () => {
      const chats = [chat('quiet', 8000), chat('spoken', 1000)];
      const ordered = orderByActivity(chats, new Map([['spoken', 4000]]));
      expect(ordered.map((c) => c.id)).toEqual(['quiet', 'spoken']);
    });

    it('does not mutate the list it was given', () => {
      const chats = [chat('c1', 1000), chat('c2', 2000)];
      orderByActivity(chats, new Map());
      expect(chats.map((c) => c.id)).toEqual(['c1', 'c2']);
    });
  });

  describe('capOpenChats', () => {
    it('leaves a list at or under the cap untouched', () => {
      const chats = [chat('c1', 1), chat('c2', 2)];
      expect(capOpenChats(chats)).toBe(chats);
    });
  });

  describe('mergeRestoredOpenChats', () => {
    it('restores stored chats when nothing is open yet', () => {
      const restored = [chat('c1', 1000), chat('c2', 2000)];
      expect(mergeRestoredOpenChats([], restored).map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('keeps the live entry for a chat opened while the read was in flight', () => {
      const current = [chat('c1', 9000, 'Live')];
      const merged = mergeRestoredOpenChats(current, [chat('c1', 1000, 'Stored')]);
      expect(merged).toBe(current);
      expect(merged[0].title).toBe('Live');
    });
  });

  describe('parseStoredOpenChats', () => {
    it('reads back a stored list', () => {
      const raw = JSON.stringify([chat('c1', 1000, 'Ada')]);
      expect(parseStoredOpenChats(raw)).toEqual([{ id: 'c1', title: 'Ada', addedAt: 1000 }]);
    });

    it('accepts the timestamp an earlier build wrote under its own name', () => {
      const raw = JSON.stringify([{ id: 'c1', title: 'Ada', activatedAt: 4200 }]);
      expect(parseStoredOpenChats(raw)).toEqual([{ id: 'c1', title: 'Ada', addedAt: 4200 }]);
    });

    it('returns nothing for corrupt or unexpected content', () => {
      expect(parseStoredOpenChats('not json')).toEqual([]);
      expect(parseStoredOpenChats('{"id":"c1"}')).toEqual([]);
    });

    it('drops malformed entries rather than the whole list', () => {
      const raw = JSON.stringify([
        { id: 'c1', title: 'Ada', addedAt: 1000 },
        { id: 42, title: 'Wrong type' },
        { title: 'No id' },
        null,
        { id: 'c1', title: 'Duplicate', addedAt: 5000 },
      ]);
      expect(parseStoredOpenChats(raw).map((c) => c.id)).toEqual(['c1']);
      expect(parseStoredOpenChats(raw)[0].title).toBe('Ada');
    });

    it('accepts an entry written before timestamps existed, sorted last', () => {
      const raw = JSON.stringify([{ id: 'c1', title: 'Ada' }]);
      expect(parseStoredOpenChats(raw)[0].addedAt).toBe(0);
    });

    it('trims a stored list longer than the cap this build enforces', () => {
      const raw = JSON.stringify(
        Array.from({ length: MAX_OPEN_CHATS + 5 }, (_, i) => chat(`c${i}`, i))
      );
      expect(parseStoredOpenChats(raw)).toHaveLength(MAX_OPEN_CHATS);
    });
  });
});
