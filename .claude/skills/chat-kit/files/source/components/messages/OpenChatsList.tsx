/**
 * The chats someone currently has open — a switcher for conversations, rendered wherever the
 * app keeps its navigation. In this app that is the desktop sidebar, under the Messages tab.
 *
 * Switching conversations otherwise means going back to the list and finding the row, which is
 * fine for one chat and tedious for the handful someone keeps up with. Closing a row removes it
 * from here and nothing else — the conversation is untouched, and opening it again brings the
 * row back.
 *
 * Ordered by conversation activity: a chat rises when someone writes in it, never because it was
 * clicked. The reader's own clicks are the one thing that must not shuffle the list, since they
 * are aimed at whatever is under the pointer.
 *
 * Unread counts come from the same query that feeds the Messages badge, which realtime already
 * keeps fresh. Folded away, the header carries their total, so collapsing the list never hides
 * the fact that something is waiting.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useOpenChats } from '@/contexts/OpenChatsContext';
import { useChatsForUserQuery } from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { orderByActivity } from '@/lib/openChats';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export function OpenChatsList() {
  const { openChats, closeChat, collapsed, toggleCollapsed } = useOpenChats();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const { data: chats = [] } = useChatsForUserQuery(session?.user?.id);

  const rows = useMemo(() => {
    const byId = new Map(chats.map((c) => [c.id, c]));
    const lastMessageAtById = new Map<string, number>();
    for (const open of openChats) {
      const at = Date.parse(byId.get(open.id)?.lastMessageAt ?? '');
      if (!Number.isNaN(at)) lastMessageAtById.set(open.id, at);
    }
    return orderByActivity(openChats, lastMessageAtById).map((open) => ({
      ...open,
      unreadCount: byId.get(open.id)?.unreadCount ?? 0,
    }));
  }, [openChats, chats]);

  const hiddenUnread = useMemo(
    () => (collapsed ? rows.reduce((total, row) => total + row.unreadCount, 0) : 0),
    [collapsed, rows]
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.openChats}>
      <Pressable
        onPress={toggleCollapsed}
        style={({ pressed }) => [styles.openChatsHeader, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={
          collapsed ? t('messages.expandOpenChats') : t('messages.collapseOpenChats')
        }
      >
        <Ionicons
          name={collapsed ? 'chevron-forward' : 'chevron-down'}
          size={12}
          color={colors.onSurfaceVariant}
        />
        <Text style={styles.openChatsHeaderLabel} numberOfLines={1}>
          {t('messages.openChats', { count: rows.length })}
        </Text>
        {hiddenUnread > 0 ? (
          <View style={styles.openChatBadge}>
            <Text style={styles.openChatBadgeText}>{hiddenUnread > 99 ? '99+' : hiddenUnread}</Text>
          </View>
        ) : null}
      </Pressable>
      {collapsed
        ? null
        : rows.map((chat) => {
            const isCurrent = pathname === `/messages/chat/${chat.id}`;
            // Reading a chat clears its count server-side, but the query behind it settles a
            // moment later; the row you are standing in should never accuse you of not having
            // read it.
            const unread = isCurrent ? 0 : chat.unreadCount;
            return (
              <View
                key={chat.id}
                style={[styles.openChatRow, isCurrent && styles.openChatRowActive]}
              >
                <Pressable
                  onPress={() => router.push(`/messages/chat/${chat.id}`)}
                  style={styles.openChatOpen}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  accessibilityLabel={
                    unread > 0
                      ? `${chat.title}, ${t('messages.unreadMessages', { count: unread })}`
                      : chat.title
                  }
                >
                  <Text
                    style={[
                      styles.openChatLabel,
                      isCurrent && styles.openChatLabelActive,
                      unread > 0 && styles.openChatLabelUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {chat.title}
                  </Text>
                </Pressable>
                {unread > 0 ? (
                  <View style={styles.openChatBadge}>
                    <Text style={styles.openChatBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => closeChat(chat.id)}
                  style={({ pressed }) => [styles.openChatClose, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('messages.closeOpenChat', { name: chat.title })}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={14} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>
            );
          })}
    </View>
  );
}

const styles = StyleSheet.create({
  openChats: {
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
    // Indented and hairlined so the rows read as belonging to Messages rather than as peers of
    // the tabs above them.
    marginLeft: spacing.lg,
    paddingLeft: spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: colors.ghostBorder,
    gap: 1,
  },
  openChatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingLeft: spacing.xs,
    paddingVertical: 4,
  },
  openChatsHeaderLabel: {
    ...typography.caption,
    flex: 1,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  openChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingLeft: spacing.xs,
  },
  openChatRowActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  openChatOpen: {
    flex: 1,
    paddingVertical: 6,
    minWidth: 0,
  },
  openChatLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  openChatLabelActive: {
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
  openChatLabelUnread: {
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
  openChatBadge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openChatBadgeText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: fontFamily.sansSemiBold,
    color: '#fff',
  },
  openChatClose: {
    padding: 6,
  },
});
