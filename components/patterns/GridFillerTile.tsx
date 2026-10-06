import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, minTouchTarget, radius, spacing, typography } from '@/theme/tokens';

export interface GridFillerTileProps {
  /** What the tile invites; omit it (with onPress) to leave an inert gap instead. */
  label?: string;
  hint?: string;
  onPress?: () => void;
}

/**
 * The empty cells at the end of a grid row.
 *
 * Without them a single card stretches across the whole row and stops looking like a card. With
 * one or two things in a section, the leftover cells are also the most natural place to ask for
 * the next one — so a viewer who may add gets a dashed "+" tile, and everyone else gets a gap
 * that only holds the shape.
 */
export function GridFillerTile({ label, hint, onPress }: GridFillerTileProps) {
  if (!label || !onPress) {
    return (
      <View style={styles.spacer} accessibilityElementsHidden importantForAccessibility="no" />
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Ionicons name="add" size={22} color={colors.onSurfaceVariant} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spacer: {
    flex: 1,
  },
  tile: {
    flex: 1,
    minHeight: minTouchTarget * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
