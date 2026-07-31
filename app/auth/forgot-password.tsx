import React, { useState } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { AuthFormLayout } from '@/components/auth/AuthFormLayout';
import { authScreenStyles } from '@/components/auth/authScreenStyles';
import { Button, Input } from '@/components/primitives';
import { auth } from '@/lib/api';
import type { ApiError } from '@/lib/api/contracts/errors';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setEmailError(null);
    if (!email.trim()) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    setIsSubmitting(true);
    const redirectTo = Linking.createURL('/auth/reset-password');
    const result = await auth.requestPasswordReset(email.trim(), redirectTo);
    setIsSubmitting(false);
    if (result.error) {
      setEmailError(getUserFacingError(result.error as ApiError));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthFormLayout
        title={t('auth.resetLinkSentTitle')}
        subtitle={t('auth.resetLinkSentSubtitle')}
        footer={
          <Button
            title={t('auth.backToSignIn')}
            onPress={() => router.replace('/auth/sign-in')}
            variant="text"
            style={authScreenStyles.secondaryCtaButton}
            accessibilityLabel={t('auth.backToSignIn')}
            accessibilityHint={t('auth.signInNavigateHint')}
          />
        }
      >
        <View />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <Button
          title={t('auth.backToSignIn')}
          onPress={() => router.replace('/auth/sign-in')}
          variant="text"
          disabled={isSubmitting}
          style={authScreenStyles.secondaryCtaButton}
          accessibilityLabel={t('auth.backToSignIn')}
          accessibilityHint={t('auth.signInNavigateHint')}
        />
      }
    >
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
      <Button
        title={isSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={authScreenStyles.ctaButton}
        accessibilityLabel={t('auth.sendResetLink')}
        accessibilityHint={t('auth.forgotPasswordHint')}
      />
    </AuthFormLayout>
  );
}
