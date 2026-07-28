import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import {
  useChatFoldersQuery,
  useChatsForUserQuery,
  useRemoveChatFromFolderMutation,
  useUpdateChatFolderMutation,
} from '@/hooks/useApiQueries';
import type { Chat } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function FolderChatRow({
  chat,
  currentUserId,
  onRemove,
  isRemoving,
}: {
  chat: Chat;
  currentUserId: string;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const displayName =
    chat.name?.trim() ||
    chat.participantDisplayNames ||
    (chat.members && chat.members.length > 0
      ? chat.members
          .filter((m) => m.userId && m.userId !== currentUserId)
          .map((m) => m.displayName ?? t('common.loading'))
          .join(', ') || chat.members.map((m) => m.displayName ?? t('common.loading')).join(', ')
      : t('messages.lastMessage'));

  const avatarSource = chat.imageUrl ? { uri: chat.imageUrl } : null;
  const fallbackText = chat.name?.trim()?.slice(0, 2) ?? displayName?.slice(0, 2) ?? '?';

  return (
    <View style={styles.chatRow}>
      <View style={styles.chatRowMain}>
        <Avatar source={avatarSource} fallbackText={fallbackText} size="md" />
        <View style={styles.chatRowContent}>
          <Text style={styles.chatName} numberOfLines={1}>
            {displayName}
          </Text>
          {chat.lastMessagePreview ? (
            <Text style={styles.chatPreview} numberOfLines={1}>
              {chat.lastMessagePreview}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={onRemove}
        disabled={isRemoving}
        style={({ pressed }) => [
          styles.removeButton,
          (pressed || isRemoving) && styles.removeButtonDisabled,
        ]}
        accessibilityLabel={t('messages.removeFromFolder')}
        accessibilityHint={t('messages.removeFromFolderHint')}
        accessibilityRole="button"
      >
        {isRemoving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.removeButtonText}>{t('messages.remove')}</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function EditFolderScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const userId = session?.user?.id ?? '';

  const [name, setName] = useState('');
  const [removingChatId, setRemovingChatId] = useState<string | null>(null);

  const { data: folders = [] } = useChatFoldersQuery(userId);
  const { data: chatsInFolder = [] } = useChatsForUserQuery(userId, {
    folderId: folderId ?? undefined,
    enabled: !!folderId,
  });
  const folder = folders.find((f) => f.id === folderId);
  const updateFolderMutation = useUpdateChatFolderMutation();
  const removeFromFolderMutation = useRemoveChatFromFolderMutation();

  useEffect(() => {
    if (folder) setName(folder.name);
  }, [folder]);

  const handleSave = useCallback(() => {
    const n = name.trim();
    if (!n || !folderId || !userId) return;
    if (!folder) {
      Alert.alert(t('common.error'), t('messages.folderNotFound'));
      return;
    }
    updateFolderMutation.mutate(
      { folderId, userId, name: n },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert(t('common.error'), getUserFacingError(err)),
      }
    );
  }, [folderId, userId, name, folder, updateFolderMutation, router]);

  const handleAddToFolder = useCallback(() => {
    if (!folderId) return;
    router.push(`/messages/add-chats-to-folder/${folderId}`);
  }, [folderId, router]);

  const handleRemoveFromFolder = useCallback(
    (chatId: string) => {
      if (!folderId || !userId) return;
      setRemovingChatId(chatId);
      removeFromFolderMutation.mutate(
        { folderId, chatId, userId },
        {
          onSettled: () => setRemovingChatId(null),
          onError: (err) => Alert.alert(t('common.error'), getUserFacingError(err)),
        }
      );
    },
    [folderId, userId, removeFromFolderMutation]
  );

  if (!userId || !folderId) return null;
  if (!folder) return null;

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
        <Pressable
          onPress={handleAddToFolder}
          style={({ pressed }) => [
            styles.addToFolderButton,
            pressed && styles.addToFolderButtonPressed,
          ]}
          accessibilityLabel={t('messages.addToFolder')}
          accessibilityHint={t('messages.addToFolderHint')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addToFolderButtonText}>{t('messages.addToFolder')}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.chatsInFolder')}</Text>
        {chatsInFolder.length === 0 ? (
          <Text style={styles.emptyText}>{t('messages.noChats')}</Text>
        ) : (
          chatsInFolder.map((chat) => (
            <FolderChatRow
              key={chat.id}
              chat={chat}
              currentUserId={userId}
              onRemove={() => handleRemoveFromFolder(chat.id)}
              isRemoving={removingChatId === chat.id}
            />
          ))
        )}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={updateFolderMutation.isPending || !name.trim()}
        style={[
          styles.saveButton,
          (updateFolderMutation.isPending || !name.trim()) && styles.saveButtonDisabled,
        ]}
        accessibilityLabel={t('common.save')}
        accessibilityHint={t('profile.saveHint')}
      >
        {updateFolderMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addToFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
  },
  addToFolderButtonPressed: { opacity: 0.8 },
  addToFolderButtonText: { ...typography.label, color: colors.primary },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  chatRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chatRowContent: { flex: 1, minWidth: 0 },
  chatName: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  chatPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  removeButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  removeButtonText: { ...typography.label, color: colors.primary },
  removeButtonDisabled: { opacity: 0.6 },
  saveButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.label, color: colors.surface },
});
