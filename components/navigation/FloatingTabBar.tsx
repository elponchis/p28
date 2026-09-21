import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontFamily, spacing } from '@/theme/tokens';

/** Routes that never get a nav icon — surfaced elsewhere (notifications: header bell). */
const HIDDEN_FROM_NAV = new Set(['notifications']);

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/** Height of the tab bar content (excluding safe area). Export for screen padding. */
export const TAB_BAR_HEIGHT = 52;

const TAB_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

const springConfig = { damping: 22, stiffness: 340 };

function TabItem({
  label,
  iconFocused,
  iconDefault,
  isFocused,
  badge,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  label: string;
  iconFocused: IoniconsName;
  iconDefault: IoniconsName;
  isFocused: boolean;
  badge?: number;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => scale.set(withSpring(0.92, springConfig))}
        onPressOut={() => scale.set(withSpring(1, springConfig))}
        hitSlop={TAB_HIT_SLOP}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={styles.tabPressable}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isFocused ? iconFocused : iconDefault}
            size={20}
            color={isFocused ? colors.primary : colors.outlineVariant}
          />
          {badge != null && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.outlineVariant }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const ICON_MAP: Record<string, { focused: IoniconsName; default: IoniconsName }> = {
  index: { focused: 'home', default: 'home-outline' },
  groups: { focused: 'people', default: 'people-outline' },
  watch: { focused: 'play-circle', default: 'play-circle-outline' },
  messages: { focused: 'chatbubbles', default: 'chatbubbles-outline' },
  profile: { focused: 'person', default: 'person-outline' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) => !HIDDEN_FROM_NAV.has(route.name));

  const items = visibleRoutes.map((route) => {
    const index = state.routes.indexOf(route);
    const { options } = descriptors[route.key];
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : typeof options.title === 'string'
          ? options.title
          : route.name;

    const isFocused = state.index === index;
    const icons = ICON_MAP[route.name] ?? {
      focused: 'ellipse' as IoniconsName,
      default: 'ellipse-outline' as IoniconsName,
    };

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) return;
      if (isFocused) {
        navigation.navigate(route.name);
      } else {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    const rawBadge = typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined;
    const badge = route.name === 'messages' && isFocused ? undefined : rawBadge;

    return {
      routeKey: route.key,
      routeName: route.name,
      label,
      iconFocused: icons.focused,
      iconDefault: icons.default,
      isFocused,
      badge,
      onPress,
      onLongPress,
      accessibilityLabel: options.tabBarAccessibilityLabel,
    };
  });

  return (
    <View
      style={[
        styles.outer,
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <BlurView intensity={20} tint="light" style={styles.bar}>
        <View style={styles.barContent}>
          {items.map(({ routeKey, routeName, ...item }) => (
            <TabItem key={routeKey} {...item} />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.glass.surface,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.glass.surface,
    overflow: 'hidden',
  },
  barContent: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
  },
  tabLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
