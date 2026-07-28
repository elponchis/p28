import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/primitives';
import { colors, spacing, typography, radius } from '@/theme/tokens';

export interface EmptyStateProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Default `button`. Use `link` for a compact text action (e.g. admin-only create). */
  actionVariant?: 'button' | 'link';
  actionAccessibilityHint?: string;
}

export function EmptyState({
  iconName,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'button',
  actionAccessibilityHint,
}: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={32} color={colors.ink300} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction && actionVariant === 'link' ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.75 }]}
          accessibilityLabel={actionLabel}
          accessibilityHint={actionAccessibilityHint}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {actionLabel && onAction && actionVariant === 'button' ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.action}
          accessibilityLabel={actionLabel}
          accessibilityHint={actionAccessibilityHint}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  action: {
    marginTop: spacing.sm,
  },
  linkWrap: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkText: {
    ...typography.bodyStrong,
    color: colors.primary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
