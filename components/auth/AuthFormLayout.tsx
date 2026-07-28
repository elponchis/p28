/**
 * Shared layout for auth screens: KeyboardAvoidingView + ScrollView + safe area + optional header/footer.
 * Use with authScreenStyles for consistent sign-in, sign-up, onboarding UX.
 */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authScreenStyles } from './authScreenStyles';
import { spacing } from '@/theme/tokens';

export interface AuthFormLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional override for scroll content container (e.g. paddingBottom). */
  contentContainerStyle?: ViewStyle;
}

export function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
  contentContainerStyle,
}: AuthFormLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={authScreenStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          authScreenStyles.scroll,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(250)} style={authScreenStyles.centeredBlock}>
          {(title ?? subtitle) ? (
            <View style={authScreenStyles.header}>
              {title ? <Text style={authScreenStyles.title}>{title}</Text> : null}
              {subtitle ? <Text style={authScreenStyles.subtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}
          <View style={authScreenStyles.form}>{children}</View>
          {footer ? <View style={authScreenStyles.footer}>{footer}</View> : null}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
