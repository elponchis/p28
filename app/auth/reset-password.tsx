import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { AuthFormLayout } from '@/components/auth/AuthFormLayout';
import { authScreenStyles } from '@/components/auth/authScreenStyles';
import { Button, Input } from '@/components/primitives';
import { auth } from '@/lib/api';
import type { ApiError } from '@/lib/api/contracts/errors';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';

type Status = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordScreen() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // The recovery link Supabase emails lands here with tokens in the URL hash
    // (e.g. #access_token=...&refresh_token=...&type=recovery). Only the web build
    // reads that; establish the recovery session before allowing a new password.
    if (Platform.OS !== 'web') {
      setStatus('invalid');
      return;
    }
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setStatus('invalid');
      return;
    }

    auth.setSessionFromRecoveryTokens(accessToken, refreshToken).then((result) => {
      if ('error' in result) {
        setStatus('invalid');
        return;
      }
      window.history.replaceState(null, '', window.location.pathname);
      setStatus('ready');
    });
  }, []);

  const canSubmit = !!password && !!confirmPassword && password.length >= 6;

  async function handleSubmit() {
    setPasswordError(null);
    setConfirmPasswordError(null);
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
    const result = await auth.updatePassword(password);
    if (result.error) {
      setIsSubmitting(false);
      setPasswordError(getUserFacingError(result.error as ApiError));
      return;
    }
    await auth.signOut();
    setIsSubmitting(false);
    setStatus('success');
  }

  if (status === 'checking') {
    return (
      <AuthFormLayout>
        <View />
      </AuthFormLayout>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthFormLayout
        title={t('auth.invalidResetLinkTitle')}
        subtitle={t('auth.invalidResetLinkSubtitle')}
      >
        <Button
          title={t('auth.requestNewLink')}
          onPress={() => router.replace('/auth/forgot-password')}
          style={authScreenStyles.ctaButton}
          accessibilityLabel={t('auth.requestNewLink')}
        />
      </AuthFormLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthFormLayout
        title={t('auth.passwordUpdatedTitle')}
        subtitle={t('auth.passwordUpdatedSubtitle')}
      >
        <Button
          title={t('auth.goToSignIn')}
          onPress={() => router.replace('/auth/sign-in')}
          style={authScreenStyles.ctaButton}
          accessibilityLabel={t('auth.goToSignIn')}
        />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordSubtitle')}>
      <Input
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.newPasswordPlaceholder')}
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
        title={isSubmitting ? t('auth.updatingPassword') : t('auth.updatePassword')}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        style={authScreenStyles.ctaButton}
        accessibilityLabel={t('auth.updatePassword')}
        accessibilityHint={t('auth.updatePasswordHint')}
      />
    </AuthFormLayout>
  );
}
