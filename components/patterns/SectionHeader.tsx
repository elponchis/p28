import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

export interface SectionHeaderProps {
  title: string;
  /** Optional action label shown as a tappable link on the right */
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sectionGap,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  actionPressed: { opacity: 0.5 },
  actionText: {
    ...typography.body,
    color: colors.primary,
  },
});
