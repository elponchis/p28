import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateChatMutation,
  useFriendIdsQuery,
  useProfilesQuery,
  useUpdateChatMutation,
  useUploadChatImageMutation,
} from '@/hooks/useApiQueries';
import { api } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function CreateChatScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: friendIds = [] } = useFriendIdsQuery(userId);
  const { data: profiles = [] } = useProfilesQuery(friendIds.length > 0 ? friendIds : undefined);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.userId, p])), [profiles]);

  const createMutation = useCreateChatMutation();
  const uploadMutation = useUploadChatImageMutation();
  const updateMutation = useUpdateChatMutation();

  useEffect(() => {
    router.replace('/messages');
  }, [router]);

  const handleToggleFriend = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPendingImageUri(asset.uri);
    setPendingImageBase64(asset.base64 ?? null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert(t('messages.addFriends'), t('messages.selectFriends'));
      return;
    }
    const memberIds = [...selectedIds];
    try {
      const existing = await api.data.findExistingChatByMembers(userId, memberIds);
      if (existing && !('message' in existing)) {
        router.replace(`/messages/chat/${existing.id}`);
        return;
      }
    } catch {
      // Proceed with create if lookup fails
    }
    createMutation.mutate(
      {
        userId,
        input: {
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          memberUserIds: [...selectedIds],
        },
      },
      {
        onSuccess: async (chat) => {
          if (pendingImageUri) {
            try {
              const url = await uploadMutation.mutateAsync({
                userId,
                imageUri: pendingImageUri,
                base64Data: pendingImageBase64 ?? undefined,
                chatId: chat.id,
              });
              await updateMutation.mutateAsync({
                chatId: chat.id,
                input: { imageUrl: url },
              });
            } catch {
              // Chat created; image failed - user can add later
            }
          }
          router.replace(`/messages/chat/${chat.id}`);
        },
        onError: (err) => {
          Alert.alert(t('common.error'), getUserFacingError(err));
        },
      }
    );
  }, [
    userId,
    name,
    description,
    selectedIds,
    pendingImageUri,
    pendingImageBase64,
    createMutation,
    uploadMutation,
    updateMutation,
    router,
  ]);

  if (!userId) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.chatName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('messages.chatNamePlaceholder')}
          placeholderTextColor={colors.ink300}
          value={name}
          onChangeText={setName}
          accessibilityLabel={t('messages.chatName')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.chatDescription')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('messages.chatDescriptionPlaceholder')}
          placeholderTextColor={colors.ink300}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          accessibilityLabel={t('messages.chatDescription')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('groups.bannerImage')}</Text>
        <Pressable
          onPress={pickImage}
          style={styles.imageButton}
          accessibilityLabel={t('groups.addBannerImage')}
          accessibilityHint={t('groups.addBannerImageHint')}
        >
          {pendingImageUri ? (
            <Avatar source={{ uri: pendingImageUri }} fallbackText="" size="lg" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.ink300} />
              <Text style={styles.imagePlaceholderText}>{t('groups.addBannerImage')}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('messages.addFriends')}</Text>
        {friendIds.length === 0 ? (
          <Text style={styles.hint}>{t('messages.noFriendsToAdd')}</Text>
        ) : (
          <View style={styles.friendList}>
            {friendIds.map((id) => {
              const profile = profileMap.get(id);
              const displayName = profile?.displayName ?? profile?.firstName ?? id.slice(0, 8);
              const isSelected = selectedIds.has(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => handleToggleFriend(id)}
                  style={[styles.friendRow, isSelected && styles.friendRowSelected]}
                  accessibilityLabel={displayName}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <Avatar
                    source={profile?.avatarUrl ? { uri: profile.avatarUrl } : null}
                    fallbackText={displayName}
                    size="md"
                  />
                  <Text style={styles.friendName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Pressable
        onPress={handleCreate}
        disabled={createMutation.isPending || selectedIds.size === 0}
        style={[
          styles.createButton,
          (createMutation.isPending || selectedIds.size === 0) && styles.createButtonDisabled,
        ]}
        accessibilityLabel={t('messages.createChat')}
        accessibilityHint={t('messages.createChatHint')}
      >
        {createMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Text style={styles.createButtonText}>{t('messages.createChat')}</Text>
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  imageButton: { alignSelf: 'flex-start' },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    backgroundColor: colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  friendList: { gap: spacing.sm },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.card,
  },
  friendRowSelected: { backgroundColor: colors.surfaceContainerHighest },
  friendName: { flex: 1, ...typography.body, color: colors.textPrimary },
  createButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: {
    ...typography.label,
    color: colors.surface,
  },
  hint: { ...typography.caption, color: colors.textSecondary },
});
