import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AuthFormLayout } from '@/components/auth/AuthFormLayout';
import { authScreenStyles } from '@/components/auth/authScreenStyles';
import { Button, Input } from '@/components/primitives';
import { useLocale } from '@/contexts/LocaleContext';
import { auth } from '@/lib/api';
import type { ApiError } from '@/lib/api/contracts/errors';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

type LocaleOption = 'en' | 'ko' | 'km';

const LOCALES: {
  value: LocaleOption;
  labelKey: 'language.english' | 'language.korean' | 'language.khmer';
}[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'ko', labelKey: 'language.korean' },
  { value: 'km', labelKey: 'language.khmer' },
];

const currentLocaleLabelKey = (loc: LocaleOption) =>
  LOCALES.find((l) => l.value === loc)?.labelKey ?? 'language.english';

export default function SignInScreen() {
  const { locale, setLocale } = useLocale();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setEmailError(null);
    setPasswordError(null);
    if (!email.trim()) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      return;
    }
    setIsSubmitting(true);
    const result = await auth.signIn(email.trim(), password);
    setIsSubmitting(false);
    if ('error' in result) {
      setPasswordError(getUserFacingError(result.error as ApiError));
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <AuthFormLayout
      title={t('auth.signIn')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <View style={styles.footerBlock}>
          <Button
            title={t('auth.createAccount')}
            onPress={() => router.push('/auth/sign-up')}
            variant="text"
            disabled={isSubmitting}
            style={authScreenStyles.secondaryCtaButton}
            accessibilityLabel={t('auth.createAccount')}
            accessibilityHint={t('auth.signUpHint')}
          />
          <Pressable
            style={styles.languageDropdown}
            onPress={() => setLanguageModalVisible(true)}
            accessibilityLabel={t('language.selectLanguage')}
            accessibilityHint={t('language.subtitle')}
            accessibilityRole="button"
          >
            <Text style={styles.languageDropdownText}>{t(currentLocaleLabelKey(locale))}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      }
    >
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLanguageModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language.title')}</Text>
              <Pressable
                onPress={() => setLanguageModalVisible(false)}
                hitSlop={8}
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.modalList}>
              {LOCALES.map(({ value, labelKey }) => (
                <Pressable
                  key={value}
                  style={[styles.modalOption, value === locale && styles.modalOptionSelected]}
                  onPress={() => {
                    setLocale(value);
                    setLanguageModalVisible(false);
                  }}
                  accessibilityLabel={t(labelKey)}
                  accessibilityState={{ selected: value === locale }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      value === locale && styles.modalOptionTextSelected,
                    ]}
                  >
                    {t(labelKey)}
                  </Text>
                  {value === locale && (
                    <Ionicons name="checkmark" size={20} color={colors.onSecondaryContainer} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSubmitting}
        error={emailError ?? undefined}
        containerStyle={authScreenStyles.inputSpacing}
      />
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoComplete="password"
        editable={!isSubmitting}
        error={passwordError ?? undefined}
        containerStyle={authScreenStyles.inputSpacing}
      />
      <Button
        title={isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={authScreenStyles.ctaButton}
        accessibilityLabel={t('auth.signIn')}
        accessibilityHint={t('auth.signInHint')}
      />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  footerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  languageDropdownText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 28, 0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
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
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  modalList: {
    paddingVertical: spacing.xs,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.secondaryContainer,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    ...typography.bodyStrong,
    color: colors.onSecondaryContainer,
  },
});
