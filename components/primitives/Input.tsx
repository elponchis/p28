import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TextStyle } from 'react-native';
import { colors, spacing, radius, typography, fontFamily, minTouchTarget } from '@/theme/tokens';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  containerStyle?: object;
  /** Optional style for the TextInput (e.g. extra padding for auth screens). */
  inputStyle?: TextStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { minHeight: minTouchTarget },
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          inputStyle,
        ]}
        placeholderTextColor="rgba(116, 119, 127, 0.4)"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  input: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400',
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  inputFocused: {
    backgroundColor: colors.primaryFixed,
  },
  inputError: {
    backgroundColor: '#fce8e8',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
