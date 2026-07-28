import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { useAuth } from '@/hooks/useAuth';
import {
  useChatsForUserQuery,
  useCreateChatFolderMutation,
  useAddChatToFolderMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function CreateFolderScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id ?? '';

  const [name, setName] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());

  const { data: chats = [] } = useChatsForUserQuery(userId);
  const createFolderMutation = useCreateChatFolderMutation();
  const addToFolderMutation = useAddChatToFolderMutation();

  const handleToggleChat = useCallback((chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    const n = name.trim();
    if (!n) {
      Alert.alert(t('messages.folderName'), t('messages.folderName'));
      return;
    }
    createFolderMutation.mutate(
      { userId, name: n },
      {
        onSuccess: (folder) => {
          const toAdd = [...selectedChatIds];
          if (toAdd.length === 0) {
            router.back();
            return;
          }
          let added = 0;
          toAdd.forEach((chatId) => {
            addToFolderMutation.mutate(
              { folderId: folder.id, chatId, userId },
              {
                onSettled: () => {
                  added++;
                  if (added === toAdd.length) router.back();
                },
              }
            );
          });
        },
        onError: (err) => {
          Alert.alert(t('common.error'), getUserFacingError(err));
        },
      }
    );
  }, [name, selectedChatIds, userId, createFolderMutation, addToFolderMutation, router]);

  if (!userId) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.folderName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('messages.folderNamePlaceholder')}
          placeholderTextColor={colors.ink300}
          value={name}
          onChangeText={setName}
          accessibilityLabel={t('messages.folderName')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.addToFolder')}</Text>
        {chats.length === 0 ? (
          <Text style={styles.hint}>{t('messages.noChats')}</Text>
        ) : (
          <View style={styles.chatList}>
            {chats.map((chat) => {
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
      </View>

      <Pressable
        onPress={handleCreate}
        disabled={createFolderMutation.isPending || !name.trim()}
        style={[
          styles.createButton,
          (createFolderMutation.isPending || !name.trim()) && styles.createButtonDisabled,
        ]}
        accessibilityLabel={t('messages.createFolder')}
      >
        {createFolderMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Text style={styles.createButtonText}>{t('messages.createFolder')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatList: { gap: spacing.sm },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
  },
  chatRowSelected: { backgroundColor: colors.surfaceContainerHighest },
  chatName: { flex: 1, ...typography.body, color: colors.textPrimary },
  check: { ...typography.label, color: colors.primary },
  createButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { ...typography.label, color: colors.surface },
  hint: { ...typography.caption, color: colors.textSecondary },
});
