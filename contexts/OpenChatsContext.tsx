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
}

interface OpenChatsValue {
  openChats: OpenChat[];
  /** Pins a chat, or refreshes its title if already pinned. Called when a chat screen opens. */
  openChat: (chat: OpenChat) => void;
  closeChat: (id: string) => void;
}

const OpenChatsContext = createContext<OpenChatsValue>({
  openChats: [],
  openChat: () => {},
  closeChat: () => {},
});

/** How many pins to keep. Past this the oldest drops, so the sidebar cannot grow without end. */
const MAX_OPEN_CHATS = 10;

export function OpenChatsProvider({ children }: { children: ReactNode }) {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const openChat = useCallback((chat: OpenChat) => {
    if (!chat.id) return;
    setOpenChats((prev) => {
      const existing = prev.find((c) => c.id === chat.id);
      if (existing) {
        // Already pinned: keep its position — a list that reorders under the pointer is a list
        // you misclick — but take the newer title, since the chat may have been renamed.
        if (existing.title === chat.title) return prev;
        return prev.map((c) => (c.id === chat.id ? { ...c, title: chat.title } : c));
      }
      return [...prev, chat].slice(-MAX_OPEN_CHATS);
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
