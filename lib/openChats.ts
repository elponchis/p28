/**
 * The rules behind the sidebar's list of open chats, kept apart from the React context that
 * holds it so they can be reasoned about — and tested — as plain data.
 *
 * The list is ordered by conversation activity — when someone last wrote — and not by what the
 * reader clicked. Opening a chat therefore adds it without moving anything, so the order stays
 * the one thing the reader did not cause and can rely on.
 */

export interface OpenChat {
  id: string;
  /** Snapshot of the chat's name at open time; refreshed whenever the chat is opened again. */
  title: string;
  /**
   * When this chat entered the list, as epoch ms. Deliberately not refreshed by opening the chat
   * again: it decides where a conversation with no messages yet sits, and which entry the cap
   * evicts, but never reorders a conversation because it was read.
   */
  addedAt: number;
}

/**
 * How many entries to keep. Past this the longest-listed drops, so the sidebar cannot grow
 * without end.
 */
export const MAX_OPEN_CHATS = 10;

/** Keeps the most recently added entries and drops the rest. */
export function capOpenChats(chats: OpenChat[]): OpenChat[] {
  if (chats.length <= MAX_OPEN_CHATS) return chats;
  return [...chats].sort((a, b) => b.addedAt - a.addedAt).slice(0, MAX_OPEN_CHATS);
}

/**
 * Orders the list for display: most recent conversation activity first, with the time the entry
 * was added standing in for a conversation that has no messages yet.
 */
export function orderByActivity<T extends OpenChat>(
  chats: T[],
  lastMessageAtById: Map<string, number>
): T[] {
  const activityOf = (chat: T) => lastMessageAtById.get(chat.id) ?? chat.addedAt;
  return [...chats].sort((a, b) => activityOf(b) - activityOf(a));
}

/**
 * Adds a chat to the list, leaving the order alone.
 *
 * Returns the previous list unchanged when nothing moved, so React can skip the render: the chat
 * screen re-runs this whenever its query settles, which is far more often than anything here
 * actually changes.
 */
export function withChatOpened(
  prev: OpenChat[],
  chat: { id: string; title: string },
  now: number
): OpenChat[] {
  if (!chat.id) return prev;
  const existing = prev.find((c) => c.id === chat.id);

  // Already listed: take the newer title, since the chat may have been renamed, and nothing else.
  if (existing) {
    if (existing.title === chat.title) return prev;
    return prev.map((c) => (c.id === chat.id ? { ...c, title: chat.title } : c));
  }

  return capOpenChats([...prev, { ...chat, addedAt: now }]);
}

/**
 * Folds a restored list into whatever is already open.
 *
 * Anything opened while the read was in flight wins over the stored copy — it is the entry the
 * user is looking at, and its title is the one just seen on screen.
 */
export function mergeRestoredOpenChats(current: OpenChat[], restored: OpenChat[]): OpenChat[] {
  const added = restored.filter((r) => !current.some((c) => c.id === r.id));
  if (added.length === 0) return current;
  return capOpenChats([...current, ...added]);
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
    const { id, title, addedAt } = entry as Partial<OpenChat>;
    if (typeof id !== 'string' || !id || typeof title !== 'string') continue;
    if (chats.some((c) => c.id === id)) continue;
    // `activatedAt` is what an earlier build wrote, back when opening a chat moved it. It is the
    // same clock, so it stands in fine; a missing timestamp sorts last rather than disqualifying
    // the entry, since an older list is still worth restoring.
    const legacy = (entry as { activatedAt?: unknown }).activatedAt;
    const stamp = typeof addedAt === 'number' ? addedAt : typeof legacy === 'number' ? legacy : 0;
    chats.push({ id, title, addedAt: stamp });
  }
  return capOpenChats(chats);
}
