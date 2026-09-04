/**
 * The chats currently "open" in the sidebar — browser tabs, for conversations.
 *
 * Switching conversations otherwise means going back to the list and finding the row again,
 * which is fine for one chat and tedious for the three or four someone actually keeps up with.
 * Opening a chat adds it here; clicking an entry jumps straight to it; closing removes it.
 *
 * Closing is a view concern and nothing else: the conversation, its messages and its membership
 * are untouched. Reopening it from the list brings the entry back.
 *
 * The list survives a reload, stored per user: on the web a refresh is how people recover from
 * anything, and losing the set of conversations you had lined up each time makes the sidebar
 * something you rebuild rather than something you keep. It is stored per user because the titles
 * name real people, and the next person to sign in on this browser should not see them.
 *
 * What belongs in the list, and what falls out of it, lives in lib/openChats.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/hooks/useAuth';
import {
  mergeRestoredOpenChats,
  parseStoredOpenChats,
  withChatOpened,
  type OpenChat,
} from '@/lib/openChats';

export type { OpenChat };

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

const storageKey = (userId: string) => `@p28/open_chats:${userId}`;

export function OpenChatsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  /** Which user's stored list is currently loaded; nothing is written back before it is. */
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    hydratedFor.current = null;
    // Signing out, or switching accounts, clears the list on the spot rather than after the read
    // resolves: the previous user's conversations must not be on screen in between.
    setOpenChats([]);
    if (!userId) return;

    let cancelled = false;
    void (async () => {
      let restored: OpenChat[] = [];
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (raw) restored = parseStoredOpenChats(raw);
      } catch (e) {
        console.warn('[openChats] could not restore the open chat list', e);
      }
      if (cancelled) return;
      setOpenChats((current) => mergeRestoredOpenChats(current, restored));
      hydratedFor.current = userId;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    AsyncStorage.setItem(storageKey(userId), JSON.stringify(openChats)).catch((e) => {
      // The sidebar still works from memory; only the next reload loses the list.
      console.warn('[openChats] could not save the open chat list', e);
    });
  }, [userId, openChats]);

  const openChat = useCallback((chat: { id: string; title: string }) => {
    setOpenChats((prev) => withChatOpened(prev, chat, Date.now()));
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
