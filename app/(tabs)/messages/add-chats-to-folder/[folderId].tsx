import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useAddChatToFolderMutation, useChatsForUserQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function AddChatsToFolderScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const userId = session?.user?.id ?? '';

  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [chatFilter, setChatFilter] = useState<'all' | '1on1' | 'group'>('all');

  const { data: allChats = [] } = useChatsForUserQuery(userId, {
    enabled: !!userId,
  });
  const { data: chatsInFolder = [] } = useChatsForUserQuery(userId, {
    folderId: folderId ?? undefined,
    enabled: !!folderId && !!userId,
  });
  const addToFolderMutation = useAddChatToFolderMutation();

  const chatsInFolderIds = useMemo(() => new Set(chatsInFolder.map((c) => c.id)), [chatsInFolder]);
  const chatsToAdd = useMemo(
    () => allChats.filter((c) => !chatsInFolderIds.has(c.id)),
    [allChats, chatsInFolderIds]
  );
  const filteredChats = useMemo(() => {
    if (chatFilter === 'all') return chatsToAdd;
    if (chatFilter === '1on1') return chatsToAdd.filter((c) => (c.memberCount ?? 0) === 2);
    return chatsToAdd.filter((c) => (c.memberCount ?? 0) >= 3);
  }, [chatsToAdd, chatFilter]);

  const handleToggleChat = useCallback((chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const toAdd = [...selectedChatIds];
    if (!folderId || !userId) return;
    if (toAdd.length === 0) {
      router.back();
      return;
    }

    const addPromises = toAdd.map((chatId) =>
      addToFolderMutation.mutateAsync({ folderId, chatId, userId })
    );

    Promise.all(addPromises)
      .then(() => {
        router.back();
      })
      .catch((err) => {
        Alert.alert(t('common.error'), getUserFacingError(err));
      });
  }, [folderId, userId, selectedChatIds, addToFolderMutation, router]);

  if (!userId || !folderId) return null;

  const isSaving = addToFolderMutation.isPending;
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + spacing.xl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.subtitle}>{t('messages.selectChatsToAddSubtitle')}</Text>
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setChatFilter('all')}
          style={[styles.filterPill, chatFilter === 'all' && styles.filterPillSelected]}
          accessibilityLabel={t('messages.filterAll')}
          accessibilityRole="button"
        >
          <Text
            style={[styles.filterPillText, chatFilter === 'all' && styles.filterPillTextSelected]}
          >
            {t('messages.filterAll')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setChatFilter('1on1')}
          style={[styles.filterPill, chatFilter === '1on1' && styles.filterPillSelected]}
          accessibilityLabel={t('messages.filter1on1')}
          accessibilityRole="button"
        >
          <Text
            style={[styles.filterPillText, chatFilter === '1on1' && styles.filterPillTextSelected]}
          >
            {t('messages.filter1on1')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setChatFilter('group')}
          style={[styles.filterPill, chatFilter === 'group' && styles.filterPillSelected]}
          accessibilityLabel={t('messages.filterGroupChats')}
          accessibilityRole="button"
        >
          <Text
            style={[styles.filterPillText, chatFilter === 'group' && styles.filterPillTextSelected]}
          >
            {t('messages.filterGroupChats')}
          </Text>
        </Pressable>
      </View>
      {filteredChats.length === 0 ? (
        <Text style={styles.emptyText}>
          {chatsToAdd.length === 0 ? t('messages.noChatsToAdd') : t('messages.noChatsInFilter')}
        </Text>
      ) : (
        <View style={styles.chatList}>
          {filteredChats.map((chat) => {
            const displayName =
              chat.name?.trim() || chat.participantDisplayNames || t('messages.lastMessage');
            const isSelected = selectedChatIds.has(chat.id);
            return (
              <Pressable
                key={chat.id}
                onPress={() => handleToggleChat(chat.id)}
                style={[styles.chatRow, isSelected && styles.chatRowSelected]}
                accessibilityLabel={displayName}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={styles.chatName} numberOfLines={1}>
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
          disabled={isSaving || selectedChatIds.size === 0}
          style={[
            styles.saveButton,
            (isSaving || selectedChatIds.size === 0) && styles.saveButtonDisabled,
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface100,
  },
  filterPillSelected: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  filterPillTextSelected: {
    color: colors.surface,
  },
  chatList: { gap: spacing.sm, marginBottom: spacing.lg },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  chatRowSelected: { backgroundColor: colors.surfaceContainerHighest },
  chatName: { flex: 1, ...typography.body, color: colors.textPrimary },
  check: { ...typography.label, color: colors.primary },
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
  saveButtonText: { ...typography.label, color: colors.surface },
});
