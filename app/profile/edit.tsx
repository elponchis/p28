import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getUserFacingError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  useProfileQuery,
  useUpdateProfileMutation,
  useUploadProfileImageMutation,
} from '@/hooks/useApiQueries';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { Avatar, Button, Input, ListItem } from '@/components/primitives';
import { colors, radius, spacing, typography, shadow } from '@/theme/tokens';
import type { ProfileUpdates } from '@/lib/api';

const LANGUAGE_OPTIONS: {
  value: string;
  labelKey: 'language.english' | 'language.korean' | 'language.khmer';
}[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'km', labelKey: 'language.khmer' },
  { value: 'ko', labelKey: 'language.korean' },
];

function LanguageSelector({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabelKey = LANGUAGE_OPTIONS.find((o) => o.value === value)?.labelKey;
  const selectedLabel = selectedLabelKey ? t(selectedLabelKey) : t('language.selectLanguage');

  return (
    <>
      <Text style={styles.fieldLabel}>{t('profile.preferredLanguage')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.preferredLanguage')}
        accessibilityHint={t('profile.appLanguageHint')}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.languageRow,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.languageIconWrap}>
          <Ionicons name="language-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.languageLabel} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('profile.preferredLanguage')}</Text>
            <Button
              title={t('common.done')}
              variant="text"
              onPress={() => setOpen(false)}
              accessibilityLabel={t('common.done')}
            />
          </View>
          <ScrollView contentContainerStyle={styles.modalList}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <ListItem
                  key={opt.value}
                  title={t(opt.labelKey)}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  iconName={active ? 'checkmark-circle' : 'ellipse-outline'}
                  iconColor={active ? colors.primary : colors.ink300}
                  accessibilityLabel={t(opt.labelKey)}
                  accessibilityHint={`Select ${t(opt.labelKey)}`}
                />
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

export default function ProfileEditScreen() {
  const { session } = useAuth();
  const { setLocale } = useLocale();
  const router = useRouter();
  const userId = session?.user?.id;

  const { data: profile } = useProfileQuery(userId);
  const updateMutation = useUpdateProfileMutation();
  const uploadMutation = useUploadProfileImageMutation();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<string | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (profile && syncedRef.current !== profile.userId) {
      syncedRef.current = profile.userId;
      setDisplayName(profile.displayName ?? '');
      setBio(profile.bio ?? '');
      setPreferredLanguage(profile.preferredLanguage);
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  const isSubmitting = updateMutation.isPending || uploadMutation.isPending;
  const mutationError = updateMutation.error ?? uploadMutation.error;

  const pickImage = async () => {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError(t('profile.photoPermissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setLocalPreviewUri(asset.uri);
    setError(null);
    uploadMutation.mutate(
      {
        userId,
        imageUri: asset.uri,
        base64Data: asset.base64 ?? undefined,
      },
      {
        onSuccess: (url) => setAvatarUrl(url),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const hasChanges =
    (displayName.trim() || undefined) !== (profile?.displayName?.trim() || undefined) ||
    (bio || undefined) !== (profile?.bio ?? undefined) ||
    (preferredLanguage ?? undefined) !== (profile?.preferredLanguage ?? undefined) ||
    (avatarUrl ?? undefined) !== (profile?.avatarUrl ?? undefined);

  const handleSave = () => {
    if (!userId) return;
    setError(null);
    const updates: ProfileUpdates = {
      displayName: displayName.trim() || undefined,
      bio: bio || undefined,
      preferredLanguage: preferredLanguage || undefined,
    };
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    updateMutation.mutate(
      { userId, updates },
      {
        onSuccess: (result) => {
          if (result.preferredLanguage) setLocale(result.preferredLanguage);
          router.back();
        },
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!userId) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarInner}>
          <Avatar
            source={
              localPreviewUri ? { uri: localPreviewUri } : avatarUrl ? { uri: avatarUrl } : null
            }
            fallbackText={displayName || profile?.displayName || session?.user?.email}
            size="xl"
            accessibilityLabel={t('profile.profilePhoto')}
            key={localPreviewUri ?? avatarUrl ?? 'fallback'}
          />
          <Pressable
            onPress={pickImage}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.editPhotoBtn, pressed && styles.editPhotoBtnPressed]}
            accessibilityLabel={t('profile.changePhoto')}
            accessibilityHint={t('profile.changePhotoHint')}
          >
            <Ionicons name="pencil" size={14} color={colors.textPrimary} />
          </Pressable>
        </View>
        <Text style={styles.changePhotoText}>{t('profile.changePhoto')}</Text>
      </View>

      {/* Form fields */}
      <View style={styles.section}>
        <Input
          label={t('profile.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('profile.displayNamePlaceholder')}
          accessibilityLabel={t('profile.displayName')}
        />
      </View>

      <View style={styles.section}>
        <Input
          label={t('profile.bio')}
          value={bio}
          onChangeText={setBio}
          placeholder={t('profile.bioPlaceholderEdit')}
          multiline
          numberOfLines={5}
          inputStyle={styles.bioInput}
          textAlignVertical="top"
          accessibilityLabel={t('profile.bio')}
        />
      </View>

      <View style={styles.section}>
        <LanguageSelector
          value={preferredLanguage ?? null}
          onChange={setPreferredLanguage}
          disabled={isSubmitting}
        />
      </View>

      {error || (mutationError && 'message' in mutationError) ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {error ??
              (mutationError && 'message' in mutationError
                ? getUserFacingError(mutationError)
                : '')}
          </Text>
        </View>
      ) : null}

      <Button
        title={isSubmitting ? t('profile.saving') : t('common.save')}
        onPress={handleSave}
        disabled={isSubmitting || !hasChanges}
        fullWidth
        style={styles.saveBtn}
        accessibilityLabel={t('common.save')}
        accessibilityHint={hasChanges ? t('profile.saveHint') : t('profile.saveHintDisabled')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },

  // Avatar card
  avatarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: shadow.cardSoft.shadowOffset,
    shadowOpacity: shadow.cardSoft.shadowOpacity,
    shadowRadius: shadow.cardSoft.shadowRadius,
    elevation: 2,
  },
  avatarInner: {
    position: 'relative' as const,
    marginBottom: spacing.sm,
  },
  editPhotoBtn: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editPhotoBtnPressed: { opacity: 0.75 },
  changePhotoText: {
    ...typography.caption,
    color: colors.primary,
  },

  // Form sections
  section: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  // Language selector row
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  languageIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  languageLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },

  // Bio
  bioInput: {
    minHeight: 120,
    paddingTop: 12,
  },

  // Error
  errorBanner: {
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.error },

  // Save button
  saveBtn: {
    marginTop: spacing.sm,
    minHeight: 48,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalList: { padding: spacing.lg },
});
