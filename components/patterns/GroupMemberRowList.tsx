import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface GroupMemberRowListItem {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface GroupMemberRowListProps {
  items: GroupMemberRowListItem[];
  currentUserId: string;
  friendUserIds?: ReadonlySet<string>;
  onMemberPress: (userId: string) => void;
  /** Current user first, then others (group members screen). Default true. */
  sortCurrentUserFirst?: boolean;
}

export function GroupMemberRowList({
  items,
  currentUserId,
  friendUserIds,
  onMemberPress,
  sortCurrentUserFirst = true,
}: GroupMemberRowListProps) {
  const sorted = useMemo(() => {
    if (!sortCurrentUserFirst) return items;
    return [...items].sort((a, b) =>
      a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0
    );
  }, [items, currentUserId, sortCurrentUserFirst]);

  return (
    <View style={styles.list}>
      {sorted.map((m) => {
        const isSelf = m.userId === currentUserId;
        const displayLabel = (m.displayName && m.displayName.trim()) || m.userId;
        const rowContent = (
          <>
            <Avatar
              source={m.avatarUrl ? { uri: m.avatarUrl } : null}
              fallbackText={displayLabel}
              size="md"
              accessibilityLabel={
                m.displayName
                  ? `${m.displayName} ${t('groups.profilePicture')}`
                  : t('groups.groupMember')
              }
            />
            <View style={styles.memberInfo}>
              <Text style={isSelf ? styles.memberNameMuted : styles.memberName} numberOfLines={1}>
                {m.displayName?.trim() ? m.displayName.trim() : t('groups.groupMember')}
              </Text>
              {isSelf ? (
                <Text style={styles.friendLabel}>{t('groups.yourself')}</Text>
              ) : currentUserId && friendUserIds?.has(m.userId) ? (
                <Text style={styles.friendLabel}>{t('friends.friend')}</Text>
              ) : null}
            </View>
          </>
        );
        if (isSelf) {
          return (
            <View
              key={m.userId}
              style={[styles.memberRow, styles.memberRowSelf]}
              accessibilityLabel={
                m.displayName ? `${m.displayName}, ${t('groups.yourself')}` : t('groups.yourself')
              }
            >
              {rowContent}
            </View>
          );
        }
        return (
          <Pressable
            key={m.userId}
            onPress={() => onMemberPress(m.userId)}
            style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
            accessibilityLabel={m.displayName ?? t('groups.groupMember')}
            accessibilityHint={t('groups.opensProfile')}
          >
            {rowContent}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.input,
  },
  memberRowSelf: {
    opacity: 0.55,
  },
  memberRowPressed: {
    opacity: 0.8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  memberNameMuted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  friendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
