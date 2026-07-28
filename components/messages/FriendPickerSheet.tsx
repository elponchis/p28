import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/primitives';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import { useFriendIdsQuery, useProfilesQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface FriendPickerSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  onSelectFriend: (friendId: string) => void;
  /** Exclude these user IDs from the list (e.g. already in chat) */
  excludeUserIds?: string[];
  userId: string;
}

export function FriendPickerSheet({
  visible,
  onRequestClose,
  onSelectFriend,
  excludeUserIds = [],
  userId,
}: FriendPickerSheetProps) {
  const [search, setSearch] = useState('');
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);

  const { data: friendIds = [] } = useFriendIdsQuery(userId);
  const { data: profiles = [] } = useProfilesQuery(friendIds.length > 0 ? friendIds : undefined);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.userId, p])), [profiles]);

  const filteredIds = useMemo(() => {
    const exclude = new Set(excludeUserIds);
    let ids = friendIds.filter((id) => !exclude.has(id));
    const q = search.trim().toLowerCase();
    if (q) {
      ids = ids.filter((id) => {
        const p = profileMap.get(id);
        const name = p?.displayName ?? [p?.firstName, p?.lastName].filter(Boolean).join(' ') ?? '';
        return name.toLowerCase().includes(q);
      });
    }
    return ids;
  }, [friendIds, excludeUserIds, search, profileMap]);

  const handleSelect = useCallback(
    (friendId: string) => {
      onRequestClose();
      onSelectFriend(friendId);
    },
    [onRequestClose, onSelectFriend]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheetInner}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('messages.newMessage')}</Text>
            <View style={styles.toRow}>
              <Text style={styles.toLabel}>{t('messages.to')}</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('messages.searchFriends')}
                placeholderTextColor={colors.ink300}
                value={search}
                onChangeText={setSearch}
                accessibilityLabel={t('messages.searchFriends')}
              />
            </View>
            <Text style={styles.sectionLabel}>{t('messages.suggested')}</Text>
            <ScrollView
              style={styles.friendList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredIds.length === 0 ? (
                <Text style={styles.empty}>{t('messages.noFriendsToAdd')}</Text>
              ) : (
                filteredIds.map((id) => {
                  const profile = profileMap.get(id);
                  const displayName =
                    profile?.displayName ??
                    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ??
                    t('common.loading');
                  return (
                    <Pressable
                      key={id}
                      onPress={() => handleSelect(id)}
                      style={({ pressed }) => [
                        styles.friendRow,
                        pressed && styles.friendRowPressed,
                      ]}
                      accessibilityLabel={displayName}
                      accessibilityHint={t('messages.selectFriends')}
                      accessibilityRole="button"
                    >
                      <Avatar
                        source={profile?.avatarUrl ? { uri: profile.avatarUrl } : null}
                        fallbackText={displayName}
                        size="md"
                      />
                      <Text style={styles.friendName} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetInner: { paddingHorizontal: spacing.screenHorizontal },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  toRow: {
    marginBottom: spacing.md,
  },
  toLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  searchInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  friendList: {
    maxHeight: 320,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },
  friendRowPressed: {
    opacity: 0.6,
  },
  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  empty: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
  },
});
