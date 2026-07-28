import { auth } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import type { ApiError } from '@/lib/api/contracts/errors';
import { AuthFormLayout } from '@/components/auth/AuthFormLayout';
import { authScreenStyles } from '@/components/auth/authScreenStyles';
import { Button, Input } from '@/components/primitives';
import { usePendingSignUp } from '@/contexts/PendingSignUpContext';
import { t } from '@/lib/i18n';

import { router } from 'expo-router';
import React, { useState } from 'react';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setPendingSignUp } = usePendingSignUp();

  const canSubmit = !!email.trim() && !!password && !!confirmPassword && password.length >= 6;

  async function handleSubmit() {
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    if (!email.trim()) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    if (!password) {
      setPasswordError(t('auth.passwordRequiredCreate'));
      return;
    }
    if (password.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordsMismatch'));
      return;
    }
    setIsSubmitting(true);
    const check = await auth.checkEmailAvailable(email.trim());
    setIsSubmitting(false);
    if ('error' in check) {
      setEmailError(getUserFacingError(check.error as ApiError));
      return;
    }
    if (!check.available) {
      setEmailError(t('auth.emailTaken'));
      return;
    }
    setPendingSignUp(email.trim(), password);
    router.replace('/auth/onboarding');
  }

  return (
    <AuthFormLayout
      title={t('auth.createAccount')}
      subtitle={t('auth.createAccountSubtitle')}
      footer={
        <Button
          title={t('auth.alreadyHaveAccountSignIn')}
          onPress={() => router.back()}
          variant="text"
          disabled={isSubmitting}
          style={authScreenStyles.secondaryCtaButton}
          accessibilityLabel={t('auth.alreadyHaveAccountSignIn')}
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
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordMinLength')}
        secureTextEntry
        autoComplete="new-password"
        editable={!isSubmitting}
        error={passwordError ?? undefined}
        containerStyle={authScreenStyles.inputSpacing}
      />
      <Input
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        secureTextEntry
        autoComplete="new-password"
        editable={!isSubmitting}
        error={confirmPasswordError ?? undefined}
        containerStyle={authScreenStyles.inputSpacing}
      />
      <Button
        title={isSubmitting ? t('auth.checking') : t('common.continue')}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        style={authScreenStyles.ctaButton}
        accessibilityLabel={t('common.continue')}
        accessibilityHint={t('auth.continueHint')}
      />
    </AuthFormLayout>
  );
}
