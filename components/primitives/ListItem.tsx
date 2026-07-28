import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, typography } from '@/theme/tokens';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  left?: React.ReactNode;
  /** Ionicons icon name rendered on the left (overridden by `left` if both provided) */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  right?: React.ReactNode;
  /** Show a chevron-right indicator on the far right */
  showChevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const springConfig = { damping: 22, stiffness: 340 };

export function ListItem({
  title,
  subtitle,
  onPress,
  left,
  iconName,
  iconColor,
  right,
  showChevron,
  accessibilityLabel,
  accessibilityHint,
}: ListItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const leftSlot =
    left ??
    (iconName ? (
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={20} color={iconColor ?? colors.textSecondary} />
      </View>
    ) : null);

  const rightSlot = (
    <View style={styles.rightGroup}>
      {right ?? null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.ink300} style={styles.chevron} />
      ) : null}
    </View>
  );

  const content = (
    <>
      {leftSlot ? <View style={styles.left}>{leftSlot}</View> : null}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || showChevron ? rightSlot : null}
    </>
  );

  if (onPress) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => scale.set(withSpring(0.99, springConfig))}
          onPressOut={() => scale.set(withSpring(1, springConfig))}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityHint={accessibilityHint}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  left: { marginRight: spacing.md },
  textWrap: { flex: 1 },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  chevron: {
    marginLeft: 4,
  },
});
