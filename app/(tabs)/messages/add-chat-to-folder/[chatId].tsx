import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/hooks/useAuth';
import { useAddChatToFolderMutation, useChatFoldersQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function AddChatToFolderScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const userId = session?.user?.id ?? '';

  const { data: folders = [], isLoading } = useChatFoldersQuery(userId);
  const addToFolderMutation = useAddChatToFolderMutation();

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      if (!chatId || !userId) return;
      addToFolderMutation.mutate(
        { folderId, chatId, userId },
        {
          onSuccess: () => router.back(),
          onError: (err) => Alert.alert(t('common.error'), getUserFacingError(err)),
        }
      );
    },
    [chatId, userId, addToFolderMutation, router]
  );

  const handleCreateFolder = useCallback(() => {
    router.push('/messages/create-folder');
  }, [router]);

  if (!userId || !chatId) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (folders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('messages.noFolders')}</Text>
          <Text style={styles.emptySubtitle}>{t('messages.noFoldersSubtitle')}</Text>
          <Pressable
            onPress={handleCreateFolder}
            style={styles.createButton}
            accessibilityLabel={t('messages.createFolder')}
            accessibilityHint={t('messages.createFolderHint')}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
            <Text style={styles.createButtonText}>{t('messages.createFolder')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{t('messages.selectFolderSubtitle')}</Text>
      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelectFolder(item.id)}
            style={({ pressed }) => [styles.folderRow, pressed && styles.folderRowPressed]}
            disabled={addToFolderMutation.isPending}
            accessibilityLabel={item.name}
            accessibilityHint={t('messages.addToFolderHint')}
            accessibilityRole="button"
          >
            <Ionicons name="folder-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.folderName} numberOfLines={1}>
              {item.name}
            </Text>
            {addToFolderMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Pressable
          onPress={handleCreateFolder}
          style={styles.createLink}
          accessibilityLabel={t('messages.createFolder')}
          accessibilityHint={t('messages.createFolderHint')}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.createLinkText}>{t('messages.createFolder')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  folderRowPressed: {
    opacity: 0.8,
  },
  folderName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
  },
  createButtonText: {
    ...typography.label,
    color: colors.surface,
  },
  footer: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surfaceContainerLow,
  },
  createLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  createLinkText: {
    ...typography.label,
    color: colors.primary,
  },
});
