/**
 * The chats currently "open" in the sidebar — browser tabs, for conversations.
 *
 * Switching conversations otherwise means going back to the list and finding the row again,
 * which is fine for one chat and tedious for the three or four someone actually keeps up with.
 * Opening a chat pins it here; clicking a pin jumps straight to it; closing removes the pin.
 *
 * Closing is a view concern and nothing else: the conversation, its messages and its membership
 * are untouched. Reopening it from the list puts the pin back.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

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

interface OpenChatsValue {
  openChats: OpenChat[];
  /** Adds a chat to the list, or marks an existing one as just-activated. */
  openChat: (chat: { id: string; title: string }) => void;
  closeChat: (id: string) => void;
}

const OpenChatsContext = createContext<OpenChatsValue>({
  openChats: [],
  openChat: () => {},
  closeChat: () => {},
});

/**
 * How many entries to keep. Past this the least recently active drops, so the sidebar cannot
 * grow without end.
 */
const MAX_OPEN_CHATS = 10;

export function OpenChatsProvider({ children }: { children: ReactNode }) {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const openChat = useCallback((chat: { id: string; title: string }) => {
    if (!chat.id) return;
    setOpenChats((prev) => {
      const existing = prev.find((c) => c.id === chat.id);
      const activatedAt = Date.now();

      // Opening a chat that is already listed refreshes its activation and its title -- the
      // title because the chat may have been renamed since.
      if (existing) {
        if (existing.title === chat.title && Date.now() - existing.activatedAt < 1000) return prev;
        return prev.map((c) => (c.id === chat.id ? { ...c, title: chat.title, activatedAt } : c));
      }

      const next = [...prev, { ...chat, activatedAt }];
      if (next.length <= MAX_OPEN_CHATS) return next;
      // Drop the least recently active rather than the earliest added: the cap should evict what
      // the user has stopped using, not what they happened to open first.
      return [...next].sort((a, b) => b.activatedAt - a.activatedAt).slice(0, MAX_OPEN_CHATS);
    });
  }, []);

  const closeChat = useCallback((id: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ openChats, openChat, closeChat }),
    [openChats, openChat, closeChat]
  );

  return <OpenChatsContext.Provider value={value}>{children}</OpenChatsContext.Provider>;
}

export function useOpenChats(): OpenChatsValue {
  return useContext(OpenChatsContext);
}
