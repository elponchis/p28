import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

export interface SectionHeaderProps {
  title: string;
  /** Optional action label shown as a tappable link on the right */
  actionLabel?: string;
  onAction?: () => void;
  /** How many more there are than the section shows. Hidden when zero. */
  badge?: number;
}

export function SectionHeader({ title, actionLabel, onAction, badge }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <View style={styles.spacer} />
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
    gap: spacing.xs,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    /**
     * A "see all" link is a touch taller than the title beside it, so a header that has one used
     * to sit half a pixel lower than one that does not — enough to show as a step between two
     * columns of sections. A fixed height puts every title on the same line.
     */
    minHeight: 28,
  },
  spacer: {
    flex: 1,
  },
  /** How many more wait behind "see all". */
  badge: {
    minWidth: 20,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 1,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    color: colors.onAccent,
  },
  title: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 19,
    fontWeight: '600',
    color: colors.onSurface,
    // Fills the row's height exactly, so the title's top edge is the row's top edge and the gap
    // above it is the one the screen asked for rather than that minus half a line.
    lineHeight: 28,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  actionPressed: { opacity: 0.5 },
  actionText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.accent,
  },
});
