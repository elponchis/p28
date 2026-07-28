import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  useChatQuery,
  useUpdateChatMutation,
  useUploadChatImageMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ChatEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);

  const { data: chat, isLoading: loadingChat } = useChatQuery(id);
  const updateMutation = useUpdateChatMutation();
  const uploadMutation = useUploadChatImageMutation();

  useEffect(() => {
    if (chat) {
      setName(chat.name ?? '');
      setDescription(chat.description ?? '');
    }
  }, [chat]);

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

  const handleSave = useCallback(async () => {
    if (!id || !userId || !chat) return;
    try {
      let imageUrl: string | undefined;
      if (pendingImageUri) {
        imageUrl = await uploadMutation.mutateAsync({
          userId,
          imageUri: pendingImageUri,
          base64Data: pendingImageBase64 ?? undefined,
          chatId: id,
        });
      }
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      const input: { name?: string; description?: string; imageUrl?: string } = {};
      if (trimmedName !== (chat.name ?? '')) input.name = trimmedName || undefined;
      if (trimmedDesc !== (chat.description ?? '')) input.description = trimmedDesc || undefined;
      if (imageUrl) input.imageUrl = imageUrl;
      if (Object.keys(input).length > 0) {
        await updateMutation.mutateAsync({ chatId: id, input });
      }
      router.back();
    } catch (err) {
      const msg = getUserFacingError(err);
      Alert.alert(t('common.error'), msg);
    }
  }, [id, userId, name, description, chat, pendingImageUri, pendingImageBase64]);

  if (!userId || !id) return null;

  if (loadingChat && !chat) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!chat) {
    router.back();
    return null;
  }

  const displayImage = pendingImageUri ?? chat.imageUrl;

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
          {displayImage ? (
            <Avatar source={{ uri: displayImage }} fallbackText="" size="lg" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.ink300} />
              <Text style={styles.imagePlaceholderText}>{t('groups.addBannerImage')}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={updateMutation.isPending || uploadMutation.isPending}
        style={[
          styles.saveButton,
          (updateMutation.isPending || uploadMutation.isPending) && styles.saveButtonDisabled,
        ]}
        accessibilityLabel={t('common.save')}
        accessibilityHint={t('common.save')}
      >
        {updateMutation.isPending || uploadMutation.isPending ? (
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
  centered: { justifyContent: 'center', alignItems: 'center' },
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
