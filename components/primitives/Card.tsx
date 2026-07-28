import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '@/theme/tokens';

export type CardVariant = 'solid' | 'glass';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  /** Overlay padding for glass variant. Use 0 for full-bleed content (e.g. edge-to-edge images). */
  contentPadding?: number;
}

export function Card({
  children,
  variant = 'solid',
  style,
  contentPadding = spacing.cardPadding,
}: CardProps) {
  if (variant === 'glass') {
    return (
      <View
        style={[
          styles.card,
          styles.cardGlass,
          { padding: contentPadding },
          contentPadding === 0 && styles.cardGlassOverlayFullBleed,
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return <View style={[styles.card, styles.cardSolid, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    paddingTop: spacing.cardPaddingTop,
    paddingBottom: spacing.cardPaddingBottom,
    paddingHorizontal: spacing.cardPadding,
    gap: spacing.cardGap,
  },
  cardSolid: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  cardGlass: {
    backgroundColor: colors.glass.surface,
  },
  cardGlassOverlayFullBleed: {
    padding: 0,
  },
});
