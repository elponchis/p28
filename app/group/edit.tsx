import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { COUNTRIES } from '@/constants/countries';
import { useAuth } from '@/hooks/useAuth';
import {
  useDeleteGroupMutation,
  useUserIsGroupAdminQuery,
  useGroupQuery,
  useIsAdminQuery,
  useUpdateGroupMutation,
  useUploadGroupBannerImageMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const LANGUAGES = [
  { code: 'en', nameKey: 'language.english' as const },
  { code: 'km', nameKey: 'language.khmer' as const },
  { code: 'ko', nameKey: 'language.korean' as const },
];

export default function EditGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;
  const { data: group, isLoading: groupLoading, isError: isGroupError } = useGroupQuery(groupId);
  const { data: isCurrentUserGroupAdmin = false } = useUserIsGroupAdminQuery(groupId, userId, {
    enabled: !!groupId && !!userId,
  });
  const { data: isAppAdmin } = useIsAdminQuery(userId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [country, setCountry] = useState('Online');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);

  const updateMutation = useUpdateGroupMutation();
  const deleteMutation = useDeleteGroupMutation();
  const uploadMutation = useUploadGroupBannerImageMutation();
  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isUploadingBanner = uploadMutation.isPending;

  const mutationError = updateMutation.error ?? deleteMutation.error ?? uploadMutation.error;

  const isCreator = !!userId && group?.createdByUserId === userId;
  const isGroupAdmin = !!userId && isCurrentUserGroupAdmin;
  const canDeleteGroup = isCreator || isGroupAdmin || isAppAdmin;

  const handleDeleteConfirm = () => {
    if (!groupId || !session?.user?.id) return;
    setError(null);
    deleteMutation.mutate(
      { groupId, userId: session.user.id },
      {
        onSuccess: () => {
          setDeleteConfirmVisible(false);
          router.replace('/(tabs)/groups');
        },
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description ?? '');
    setPreferredLanguage(group.preferredLanguage ?? 'en');
    setCountry(group.country ?? 'Online');
    setBannerImageUrl(group.bannerImageUrl ?? null);
  }, [group]);

  const selectedCountryName = COUNTRIES.find((c) => c.code === country)?.name ?? country;

  const pickBannerImage = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError(t('profile.photoPermissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setLocalBannerUri(asset.uri);
    setError(null);
    uploadMutation.mutate(
      {
        userId,
        imageUri: asset.uri,
        base64Data: asset.base64 ?? undefined,
      },
      {
        onSuccess: (url) => setBannerImageUrl(url),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const removeBannerImage = () => {
    setBannerImageUrl(null);
    setLocalBannerUri(null);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !groupId) return;

    setError(null);
    updateMutation.mutate(
      {
        groupId,
        params: {
          name: trimmedName,
          description: description.trim() || undefined,
          bannerImageUrl: bannerImageUrl ?? undefined,
          preferredLanguage,
          country,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  useEffect(() => {
    if (groupId && isGroupError) {
      router.back();
    }
  }, [groupId, isGroupError, router]);

  if (!groupId) {
    return null;
  }

  if (groupLoading || !group) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>{t('groups.bannerImage')}</Text>
        <Pressable
          onPress={pickBannerImage}
          disabled={isUploadingBanner}
          style={styles.bannerContainer}
          accessibilityLabel={t('groups.addBannerImage')}
          accessibilityHint={t('groups.addBannerImageHint')}
        >
          {bannerImageUrl || localBannerUri ? (
            <>
              <Image
                source={{ uri: bannerImageUrl ?? localBannerUri ?? '' }}
                style={styles.bannerImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <Pressable
                style={styles.removeBannerButton}
                onPress={removeBannerImage}
                accessibilityLabel={t('groups.removeBannerImage')}
                accessibilityHint={t('groups.removeBannerImage')}
              >
                <Ionicons name="close-circle" size={28} color={colors.textPrimary} />
              </Pressable>
            </>
          ) : (
            <View style={styles.bannerPlaceholder}>
              {isUploadingBanner ? (
                <Text style={styles.bannerPlaceholderText}>{t('common.loading')}</Text>
              ) : (
                <>
                  <Ionicons name="image-outline" size={40} color={colors.ink300} />
                  <Text style={styles.bannerPlaceholderText}>{t('groups.addBannerImage')}</Text>
                </>
              )}
            </View>
          )}
        </Pressable>

        <Input
          label={t('groups.groupName')}
          value={name}
          onChangeText={setName}
          placeholder={t('groups.groupNamePlaceholder')}
          autoCapitalize="words"
          accessibilityLabel={t('groups.groupName')}
        />

        <Input
          label={t('groups.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('groups.descriptionPlaceholder')}
          multiline
          numberOfLines={3}
          inputStyle={{ minHeight: 80 }}
          accessibilityLabel={t('groups.description')}
        />

        <Text style={styles.label}>{t('groups.language')}</Text>
        <View style={styles.chipRow}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => setPreferredLanguage(lang.code)}
              style={[styles.chip, preferredLanguage === lang.code && styles.chipActive]}
              accessibilityLabel={t(lang.nameKey)}
            >
              <Text
                style={[styles.chipText, preferredLanguage === lang.code && styles.chipTextActive]}
              >
                {t(lang.nameKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('groups.location')}</Text>
        <Pressable
          style={styles.dropdown}
          onPress={() => setLocationModalVisible(true)}
          accessibilityLabel={t('groups.location')}
          accessibilityHint={t('groups.locationSelectionHint')}
        >
          <Text style={styles.dropdownText}>{selectedCountryName}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>

        <Modal
          visible={locationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLocationModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setLocationModalVisible(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('groups.location')}</Text>
                <Pressable
                  onPress={() => setLocationModalVisible(false)}
                  hitSlop={8}
                  accessibilityLabel={t('common.cancel')}
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>
              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.code}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.modalOption,
                      country === item.code && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setCountry(item.code);
                      setLocationModalVisible(false);
                    }}
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected: country === item.code }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        country === item.code && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {country === item.code && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

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

        <Modal
          visible={deleteConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !isDeleting && setDeleteConfirmVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => !isDeleting && setDeleteConfirmVisible(false)}
            />
            <View style={[styles.modalContent, styles.deleteConfirmModal]}>
              <Text style={styles.modalTitle}>{t('groups.deleteGroupConfirm')}</Text>
              <Text style={styles.deleteConfirmHint}>
                {t('groups.deleteGroupTypeNamePrompt', { name: group.name })}
              </Text>
              <Input
                value={deleteConfirmName}
                onChangeText={setDeleteConfirmName}
                placeholder={group.name}
                accessibilityLabel={t('groups.deleteGroupTypeNamePrompt', { name: group.name })}
              />
              <View style={styles.deleteConfirmActions}>
                <Button
                  title={t('common.cancel')}
                  variant="secondary"
                  onPress={() => {
                    setDeleteConfirmName('');
                    setDeleteConfirmVisible(false);
                  }}
                  disabled={isDeleting}
                  accessibilityLabel={t('common.cancel')}
                />
                <Button
                  title={isDeleting ? t('common.loading') : t('groups.deleteGroup')}
                  variant="primary"
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting || deleteConfirmName.trim() !== group.name.trim()}
                  accessibilityLabel={t('groups.deleteGroup')}
                  accessibilityHint={t('groups.deleteGroupPermanentlyHint')}
                />
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.actions}>
          <Button
            title={isSubmitting ? t('common.loading') : t('common.save')}
            onPress={handleSubmit}
            disabled={!name.trim() || isSubmitting || isDeleting}
            fullWidth
            accessibilityLabel={t('common.save')}
            accessibilityHint={t('groups.editGroupHint')}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSubmitting || isDeleting}
            fullWidth
            accessibilityLabel={t('common.cancel')}
          />
        </View>

        {canDeleteGroup ? (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.85 },
              (isSubmitting || isDeleting) && { opacity: 0.4 },
            ]}
            onPress={() => {
              setDeleteConfirmName('');
              setDeleteConfirmVisible(true);
            }}
            disabled={isSubmitting || isDeleting}
            accessibilityLabel={t('groups.deleteGroup')}
            accessibilityHint={t('groups.deleteGroupConfirm')}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t('groups.deleteGroup')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  bannerContainer: {
    width: '100%',
    height: 160,
    marginBottom: spacing.lg,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface100,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bannerPlaceholderText: {
    ...typography.label,
    color: colors.ink300,
  },
  removeBannerButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerLow,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  dropdownText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 28, 0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '70%',
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.brandSoft,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  deleteButtonText: {
    ...typography.buttonLabel,
    color: colors.error,
  },
  deleteConfirmModal: {
    padding: spacing.lg,
  },
  deleteConfirmHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'flex-end',
  },
});
