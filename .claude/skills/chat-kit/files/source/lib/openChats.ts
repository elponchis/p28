/**
 * The rules behind the sidebar's list of open chats, kept apart from the React context that
 * holds it so they can be reasoned about — and tested — as plain data.
 *
 * Two things decide what the list looks like: how many entries it keeps, and which ones survive
 * when it is over that. Both answers are "the most recently active", everywhere the question
 * comes up: adding a chat, and restoring a list written by an earlier session.
 */

export interface OpenChat {
  id: string;
  /** Snapshot of the chat's name at open time; refreshed whenever the chat is opened again. */
  title: string;
  /**
   * When this chat was last opened, as epoch ms. The sidebar sorts on the later of this and the
   * chat's last message, so "I just looked at it" and "someone just wrote in it" both float a
   * conversation to the top without either rule having to know about the other.
   */
  activatedAt: number;
}

/**
 * How many entries to keep. Past this the least recently active drops, so the sidebar cannot
 * grow without end.
 */
export const MAX_OPEN_CHATS = 10;

/** Keeps the most recently active entries and drops the rest. */
export function capByActivation(chats: OpenChat[]): OpenChat[] {
  if (chats.length <= MAX_OPEN_CHATS) return chats;
  return [...chats].sort((a, b) => b.activatedAt - a.activatedAt).slice(0, MAX_OPEN_CHATS);
}

/**
 * Adds a chat, or marks one already listed as just activated.
 *
 * Returns the previous list unchanged when nothing meaningful moved, so React can skip the
 * render: the chat screen re-runs this whenever its query settles, which is far more often than
 * anything here actually changes.
 */
export function withChatOpened(
  prev: OpenChat[],
  chat: { id: string; title: string },
  now: number
): OpenChat[] {
  if (!chat.id) return prev;
  const existing = prev.find((c) => c.id === chat.id);

  // Opening a chat that is already listed refreshes its activation and its title -- the title
  // because the chat may have been renamed since.
  if (existing) {
    if (existing.title === chat.title && now - existing.activatedAt < 1000) return prev;
    return prev.map((c) => (c.id === chat.id ? { ...c, title: chat.title, activatedAt: now } : c));
  }

  // Drop the least recently active rather than the earliest added: the cap should evict what the
  // user has stopped using, not what they happened to open first.
  return capByActivation([...prev, { ...chat, activatedAt: now }]);
}

/**
 * Folds a restored list into whatever is already open.
 *
 * Anything opened while the read was in flight wins over the stored copy — it is the newer
 * activation, and it is the chat the user is looking at.
 */
export function mergeRestoredOpenChats(current: OpenChat[], restored: OpenChat[]): OpenChat[] {
  const added = restored.filter((r) => !current.some((c) => c.id === r.id));
  if (added.length === 0) return current;
  return capByActivation([...current, ...added]);
}

/**
 * Reads back what was stored, defensively: this is data from a previous build of the app, and a
 * malformed entry should cost that entry rather than the whole list.
 */
export function parseStoredOpenChats(raw: string): OpenChat[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const chats: OpenChat[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, title, activatedAt } = entry as Partial<OpenChat>;
    if (typeof id !== 'string' || !id || typeof title !== 'string') continue;
    if (chats.some((c) => c.id === id)) continue;
    // A missing timestamp sorts last rather than disqualifying the entry: an older build's list
    // is still worth restoring, just below anything this build has touched.
    chats.push({ id, title, activatedAt: typeof activatedAt === 'number' ? activatedAt : 0 });
  }
  return capByActivation(chats);
}
