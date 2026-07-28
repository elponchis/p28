import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface ReflectionPlateProps {
  quote: string;
  attribution?: string;
  variant?: 'light' | 'dark';
}

/**
 * Signature "Reflection Plate" component for scripture or quotes.
 * light: white card with left accent bar.
 * dark: deep primary background with white serif text.
 */
export function ReflectionPlate({ quote, attribution, variant = 'light' }: ReflectionPlateProps) {
  if (variant === 'dark') {
    return (
      <View style={darkStyles.plate}>
        <Text style={darkStyles.quote}>{quote}</Text>
        {attribution ? <Text style={darkStyles.attribution}>{attribution}</Text> : null}
      </View>
    );
  }

  return (
    <View style={lightStyles.plate}>
      <View style={lightStyles.accent} />
      <View style={lightStyles.content}>
        <Text style={lightStyles.quote}>{quote}</Text>
        {attribution ? <Text style={lightStyles.attribution}>{attribution}</Text> : null}
      </View>
    </View>
  );
}

const lightStyles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: colors.secondary,
    borderTopLeftRadius: radius.card,
    borderBottomLeftRadius: radius.card,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quote: {
    ...typography.headlineSm,
    color: colors.onSurface,
    lineHeight: 34,
  },
  attribution: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
});

const darkStyles = StyleSheet.create({
  plate: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  quote: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 32,
    color: '#ffffff',
  },
  attribution: {
    ...typography.labelMd,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
    letterSpacing: 0.4,
  },
});
