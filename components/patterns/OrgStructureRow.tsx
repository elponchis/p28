import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export type OrgStructureType = 'org' | 'ministry' | 'group';

export interface OrgStructureRowProps {
  name: string;
  type: OrgStructureType;
  subtitle?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const TYPE_CONFIG: Record<
  OrgStructureType,
  {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
  }
> = {
  org: { icon: 'business-outline', label: 'Organization' },
  ministry: { icon: 'compass-outline', label: 'Ministry' },
  group: { icon: 'people-outline', label: 'Group' },
};

const springConfig = { damping: 22, stiffness: 340 };

export function OrgStructureRow({
  name,
  type,
  subtitle,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: OrgStructureRowProps) {
  const config = TYPE_CONFIG[type];
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withSpring(0.99, springConfig))}
        onPressOut={() => scale.set(withSpring(1, springConfig))}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name}
        accessibilityHint={accessibilityHint ?? `Opens ${config.label.toLowerCase()} details`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={config.icon} size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            <Text style={styles.typeLabel}>{config.label}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.surfaceContainer,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  typeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
