import {
  MAX_OPEN_CHATS,
  capByActivation,
  mergeRestoredOpenChats,
  parseStoredOpenChats,
  withChatOpened,
  type OpenChat,
} from '@/lib/openChats';

const chat = (id: string, activatedAt: number, title = `Chat ${id}`): OpenChat => ({
  id,
  title,
  activatedAt,
});

describe('openChats', () => {
  describe('withChatOpened', () => {
    it('adds a chat that is not listed yet', () => {
      const next = withChatOpened([], { id: 'c1', title: 'Ada' }, 1000);
      expect(next).toEqual([{ id: 'c1', title: 'Ada', activatedAt: 1000 }]);
    });

    it('re-activates a chat that is already listed instead of duplicating it', () => {
      const next = withChatOpened([chat('c1', 1000)], { id: 'c1', title: 'Chat c1' }, 9000);
      expect(next).toHaveLength(1);
      expect(next[0].activatedAt).toBe(9000);
    });

    it('takes the newer title when a chat has been renamed', () => {
      const next = withChatOpened([chat('c1', 1000, 'Old')], { id: 'c1', title: 'New' }, 1200);
      expect(next[0].title).toBe('New');
    });

    it('returns the same list when nothing moved, so React can skip the render', () => {
      const prev = [chat('c1', 1000)];
      expect(withChatOpened(prev, { id: 'c1', title: 'Chat c1' }, 1500)).toBe(prev);
    });

    it('ignores a chat with no id', () => {
      const prev = [chat('c1', 1000)];
      expect(withChatOpened(prev, { id: '', title: 'Nowhere' }, 2000)).toBe(prev);
    });

    it('evicts the least recently active once the list is full', () => {
      const full = Array.from({ length: MAX_OPEN_CHATS }, (_, i) => chat(`c${i}`, 1000 + i));
      const next = withChatOpened(full, { id: 'new', title: 'New' }, 9000);
      expect(next).toHaveLength(MAX_OPEN_CHATS);
      expect(next.map((c) => c.id)).toContain('new');
      // c0 was opened first and never touched again; c1 stayed because it was used later.
      expect(next.map((c) => c.id)).not.toContain('c0');
      expect(next.map((c) => c.id)).toContain('c1');
    });
  });

  describe('capByActivation', () => {
    it('leaves a list at or under the cap untouched', () => {
      const chats = [chat('c1', 1), chat('c2', 2)];
      expect(capByActivation(chats)).toBe(chats);
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
      expect(parseStoredOpenChats(raw)).toEqual([{ id: 'c1', title: 'Ada', activatedAt: 1000 }]);
    });

    it('returns nothing for corrupt or unexpected content', () => {
      expect(parseStoredOpenChats('not json')).toEqual([]);
      expect(parseStoredOpenChats('{"id":"c1"}')).toEqual([]);
    });

    it('drops malformed entries rather than the whole list', () => {
      const raw = JSON.stringify([
        { id: 'c1', title: 'Ada', activatedAt: 1000 },
        { id: 42, title: 'Wrong type' },
        { title: 'No id' },
        null,
        { id: 'c1', title: 'Duplicate', activatedAt: 5000 },
      ]);
      expect(parseStoredOpenChats(raw).map((c) => c.id)).toEqual(['c1']);
      expect(parseStoredOpenChats(raw)[0].title).toBe('Ada');
    });

    it('accepts an entry written before activation times existed, sorted last', () => {
      const raw = JSON.stringify([{ id: 'c1', title: 'Ada' }]);
      expect(parseStoredOpenChats(raw)[0].activatedAt).toBe(0);
    });

    it('trims a stored list longer than the cap this build enforces', () => {
      const raw = JSON.stringify(
        Array.from({ length: MAX_OPEN_CHATS + 5 }, (_, i) => chat(`c${i}`, i))
      );
      expect(parseStoredOpenChats(raw)).toHaveLength(MAX_OPEN_CHATS);
    });
  });
});
