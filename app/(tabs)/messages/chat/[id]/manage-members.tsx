import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives';

import { useAuth } from '@/hooks/useAuth';
import {
  useChatQuery,
  useCreateChatMutation,
  useFriendIdsQuery,
  useProfilesQuery,
  useRemoveChatMemberMutation,
} from '@/hooks/useApiQueries';
import { api, getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ManageChatMembersScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = session?.user?.id ?? '';

  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const { data: chat, isLoading: loadingChat } = useChatQuery(id);
  const { data: friendIds = [] } = useFriendIdsQuery(userId, { enabled: !!userId });
  const { data: profiles = [] } = useProfilesQuery(friendIds.length > 0 ? friendIds : undefined, {
    enabled: friendIds.length > 0,
  });
  const createChatMutation = useCreateChatMutation();
  const removeMemberMutation = useRemoveChatMemberMutation();

  const memberUserIds = useMemo(
    () => new Set((chat?.members ?? []).map((m) => m.userId).filter(Boolean)),
    [chat?.members]
  );

  const isChatCreator = chat?.createdByUserId === userId;

  const sortedMembers = useMemo(() => {
    const list = [...(chat?.members ?? [])];
    list.sort((a, b) => {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      const na = (a.displayName ?? '').toLowerCase();
      const nb = (b.displayName ?? '').toLowerCase();
      return na.localeCompare(nb);
    });
    return list;
  }, [chat?.members, userId]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.userId, p])), [profiles]);

  const friendsToAdd = useMemo(() => {
    const ids = friendIds.filter((fid) => !memberUserIds.has(fid));
    const q = search.trim().toLowerCase();
    if (!q) return ids;
    return ids.filter((fid) => {
      const p = profileMap.get(fid);
      const name = p?.displayName ?? [p?.firstName, p?.lastName].filter(Boolean).join(' ') ?? '';
      return name.toLowerCase().includes(q);
    });
  }, [friendIds, memberUserIds, search, profileMap]);

  const handleToggleUser = useCallback((uid: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const handleConfirmRemoveMember = useCallback(
    (memberUserId: string, memberDisplayName: string) => {
      if (!id || !userId) return;
      Alert.alert(
        t('messages.removeMemberConfirmTitle'),
        t('messages.removeMemberConfirmMessage', { name: memberDisplayName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('messages.remove'),
            style: 'destructive',
            onPress: () => {
              removeMemberMutation.mutate(
                { chatId: id, memberUserId, removedByUserId: userId },
                {
                  onError: (err) => {
                    Alert.alert(t('common.error'), getUserFacingError(err));
                  },
                }
              );
            },
          },
        ]
      );
    },
    [id, userId, removeMemberMutation]
  );

  const insets = useSafeAreaInsets();

  const handleSave = useCallback(async () => {
    const toAdd = [...selectedUserIds];
    if (!id || !userId) return;
    if (toAdd.length === 0) {
      router.back();
      return;
    }

    const existingOtherIds = [...memberUserIds].filter((uid) => uid !== userId);
    const newMemberIds = [...existingOtherIds, ...toAdd];

    try {
      const existing = await api.data.findExistingChatByMembers(userId, newMemberIds);
      if (existing && !('message' in existing)) {
        router.replace(`/messages/chat/${existing.id}`);
        return;
      }
    } catch {
      // proceed to create if lookup fails
    }

    createChatMutation.mutate(
      { userId, input: { memberUserIds: newMemberIds } },
      {
        onSuccess: (newChat) => router.replace(`/messages/chat/${newChat.id}`),
        onError: (err) => {
          Alert.alert(t('common.error'), getUserFacingError(err));
        },
      }
    );
  }, [id, userId, selectedUserIds, memberUserIds, createChatMutation, router]);

  if (!userId || !id) return null;

  const isSaving = createChatMutation.isPending;
  const removingMemberId = removeMemberMutation.isPending
    ? removeMemberMutation.variables?.memberUserId
    : undefined;
  const bottomPadding = insets.bottom + spacing.xl;

  if (loadingChat && !chat) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <Text style={styles.sectionTitle}>{t('messages.peopleInChat')}</Text>
      <View style={styles.memberList}>
        {sortedMembers.map((m) => {
          const isSelf = m.userId === userId;
          const displayName = isSelf
            ? t('messages.you')
            : m.displayName?.trim() || t('notifications.unknownUser');
          const showRemove = isChatCreator && !isSelf;
          const isRemoving = removingMemberId === m.userId;
          return (
            <View key={m.userId} style={styles.memberRow}>
              <Avatar
                source={m.avatarUrl ? { uri: m.avatarUrl } : null}
                fallbackText={displayName}
                size="md"
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {displayName}
              </Text>
              {showRemove ? (
                <Pressable
                  onPress={() => handleConfirmRemoveMember(m.userId, displayName)}
                  disabled={!!removingMemberId}
                  style={styles.removeButton}
                  accessibilityLabel={t('messages.removeMemberFromChat')}
                  accessibilityHint={t('messages.removeMemberFromChatHint')}
                  accessibilityRole="button"
                >
                  {isRemoving ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.removeButtonText}>
                      {t('messages.removeMemberFromChat')}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        {t('messages.selectPeopleToAddSubtitle')}
      </Text>
      <TextInput
        style={styles.searchInput}
        placeholder={t('messages.searchFriends')}
        placeholderTextColor={colors.ink300}
        value={search}
        onChangeText={setSearch}
        accessibilityLabel={t('messages.searchFriends')}
      />
      {friendsToAdd.length === 0 ? (
        <Text style={styles.emptyText}>
          {memberUserIds.size > 0 ? t('messages.noFriendsToAdd') : t('messages.noFriendsSubtitle')}
        </Text>
      ) : (
        <View style={styles.friendList}>
          {friendsToAdd.map((friendId) => {
            const profile = profileMap.get(friendId);
            const displayName =
              profile?.displayName ??
              [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ??
              t('common.loading');
            const isSelected = selectedUserIds.has(friendId);
            return (
              <Pressable
                key={friendId}
                onPress={() => handleToggleUser(friendId)}
                style={[styles.friendRow, isSelected && styles.friendRowSelected]}
                accessibilityLabel={displayName}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityHint={t('messages.selectFriends')}
              >
                <Avatar
                  source={profile?.avatarUrl ? { uri: profile.avatarUrl } : null}
                  fallbackText={displayName}
                  size="md"
                />
                <Text style={styles.friendName} numberOfLines={1}>
                  {displayName}
                </Text>
                {isSelected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || selectedUserIds.size === 0}
          style={[
            styles.saveButton,
            (isSaving || selectedUserIds.size === 0) && styles.saveButtonDisabled,
          ]}
          accessibilityLabel={t('common.save')}
          accessibilityHint={t('profile.saveHint')}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },
  memberList: { gap: spacing.sm, marginBottom: spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    gap: spacing.md,
  },
  memberName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  removeButton: {
    minWidth: spacing.xxl,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  removeButtonText: {
    ...typography.label,
    color: colors.error,
  },
  searchInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  friendList: { gap: spacing.sm, marginBottom: spacing.lg },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    gap: spacing.md,
  },
  friendRowSelected: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  friendName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  check: {
    ...typography.label,
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    ...typography.label,
    color: colors.surface,
  },
});
