import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/primitives/Input';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteAccountMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { notify } from '@/lib/dialogs';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const email = session?.user?.email ?? '';

  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useDeleteAccountMutation();
  const isDeleting = deleteMutation.isPending;
  const canConfirm = confirmEmail.trim().toLowerCase() === email.trim().toLowerCase() && !!email;

  const handleDelete = () => {
    if (!canConfirm || isDeleting) return;
    setError(null);
    deleteMutation.mutate(undefined, {
      onSuccess: async () => {
        await notify({
          title: t('profile.accountDeletedTitle'),
          message: t('profile.accountDeletedMessage'),
          dismissLabel: t('common.done'),
        });
        await signOut();
        router.replace('/auth/sign-in');
      },
      onError: (err) => setError(getUserFacingError(err)),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DesktopContentContainer maxWidth={600}>
          <View style={styles.header}>
            <Ionicons name="warning-outline" size={40} color={colors.error} />
            <Text style={styles.title}>{t('profile.deleteAccountTitle')}</Text>
            <Text style={styles.irreversible}>{t('profile.deleteAccountIrreversible')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="close-circle-outline" size={22} color={colors.error} />
            <Text style={styles.infoText}>{t('profile.deleteAccountWillDelete')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.infoText}>{t('profile.deleteAccountWillAnonymize')}</Text>
          </View>

          <Input
            label={t('profile.deleteAccountConfirmLabel', { email })}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder={t('profile.deleteAccountConfirmPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isDeleting}
            accessibilityLabel={t('profile.deleteAccountConfirmLabel', { email })}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorHint}>{t('profile.deleteAccountBlockedHint')}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.85 },
              (!canConfirm || isDeleting) && { opacity: 0.4 },
            ]}
            onPress={handleDelete}
            disabled={!canConfirm || isDeleting}
            accessibilityLabel={t('profile.deleteAccount')}
            accessibilityHint={t('profile.deleteAccountIrreversible')}
            accessibilityRole="button"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            )}
            <Text style={styles.deleteButtonText}>
              {isDeleting ? t('profile.deletingAccount') : t('profile.deleteAccount')}
            </Text>
          </Pressable>
        </DesktopContentContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  irreversible: {
    ...typography.bodyStrong,
    color: colors.error,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
});
