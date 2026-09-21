import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments, type Href } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { OpenChatsList } from '@/components/messages';
import { Avatar } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import { useChatsForUserQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { breakpoints, colors, fontFamily, radius, spacing } from '@/theme/tokens';

/** Width of the sidebar when it stands in for the bottom tab bar on desktop web. */
export const SIDEBAR_WIDTH = 264;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface NavEntry {
  /** First `(tabs)` segment this entry owns; the home tab owns the empty one. */
  segment: string | null;
  href: Href;
  label: string;
  iconFocused: IoniconsName;
  iconDefault: IoniconsName;
}

/** True on desktop web, where the sidebar replaces the bottom bar for every screen. */
export function useDesktopSidebar() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= breakpoints.sidebar;
}

function SidebarItem({
  label,
  iconFocused,
  iconDefault,
  isFocused,
  badge,
  onPress,
}: {
  label: string;
  iconFocused: IoniconsName;
  iconDefault: IoniconsName;
  isFocused: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.item,
        isFocused && styles.itemFocused,
        pressed && styles.itemPressed,
      ]}
    >
      <Ionicons
        name={isFocused ? iconFocused : iconDefault}
        size={20}
        color={isFocused ? colors.primary : colors.onSurfaceVariant}
      />
      <Text
        style={[styles.label, { color: isFocused ? colors.primary : colors.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * The left navigation on desktop web. It lives at the root of the app rather than inside the
 * tab navigator, so it stays put when a group, an announcement or a profile opens on top —
 * those are pushed on the root stack and would otherwise cover the whole window.
 *
 * It reads the current route from the router instead of navigator state, which is what lets it
 * live outside the navigator at all.
 */
export function DesktopSidebar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments() as readonly string[];
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: chats = [] } = useChatsForUserQuery(userId);

  const unreadConversationCount = useMemo(
    () => chats.filter((c) => (c.unreadCount ?? 0) > 0).length,
    [chats]
  );

  const entries: NavEntry[] = [
    {
      segment: null,
      href: '/(tabs)',
      label: t('tabs.home'),
      iconFocused: 'home',
      iconDefault: 'home-outline',
    },
    {
      segment: 'groups',
      href: '/(tabs)/groups',
      label: t('tabs.groups'),
      iconFocused: 'people',
      iconDefault: 'people-outline',
    },
    {
      segment: 'watch',
      href: '/(tabs)/watch',
      label: t('tabs.watch'),
      iconFocused: 'play-circle',
      iconDefault: 'play-circle-outline',
    },
    {
      segment: 'messages',
      href: '/(tabs)/messages',
      label: t('tabs.messages'),
      iconFocused: 'chatbubbles',
      iconDefault: 'chatbubbles-outline',
    },
  ];

  const inTabs = segments[0] === '(tabs)';
  /**
   * A group screen belongs to Groups, and an announcement or an event list belongs to Home —
   * they are pushed on the root stack, so the tab they came from has to be named here.
   */
  const ownerOutsideTabs: Record<string, string | null> = {
    group: 'groups',
    watch: 'watch',
    announcements: null,
    'upcoming-events': null,
  };
  const activeSegment = inTabs
    ? (segments[1] ?? null)
    : segments[0] in ownerOutsideTabs
      ? ownerOutsideTabs[segments[0]]
      : undefined;

  const profileFocused = inTabs ? segments[1] === 'profile' : segments[0] === 'profile';

  return (
    <View style={[styles.outer, { paddingTop: insets.top + spacing.lg, width: SIDEBAR_WIDTH }]}>
      <View style={styles.main}>
        {/* The app's own mark, so the sidebar says whose app this is before it says where to go. */}
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.brandMark}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>P2:8</Text>
            <Text style={styles.brandSub}>{t('tabs.brandSubtitle')}</Text>
          </View>
        </View>

        {entries.map((entry) => (
          <View key={entry.href as string}>
            <SidebarItem
              label={entry.label}
              iconFocused={entry.iconFocused}
              iconDefault={entry.iconDefault}
              isFocused={activeSegment === entry.segment}
              badge={
                entry.segment === 'messages' && unreadConversationCount > 0
                  ? unreadConversationCount
                  : undefined
              }
              onPress={() => router.navigate(entry.href)}
            />
            {/* Open conversations hang off the Messages entry, because that is what they are
                part of — a flat list beside the tabs would read as more tabs. */}
            {entry.segment === 'messages' ? <OpenChatsList /> : null}
          </View>
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={() => router.navigate('/(tabs)/profile')}
          accessibilityRole="tab"
          accessibilityState={{ selected: profileFocused }}
          accessibilityLabel={t('tabs.profile')}
          style={({ pressed }) => [
            styles.item,
            profileFocused && styles.itemFocused,
            pressed && styles.itemPressed,
          ]}
        >
          <Avatar
            size="sm"
            fallbackText={session?.user?.email}
            accessibilityLabel={t('tabs.profile')}
          />
          <Text
            style={[
              styles.label,
              { color: profileFocused ? colors.primary : colors.onSurfaceVariant },
            ]}
            numberOfLines={1}
          >
            {t('tabs.profile')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    // Fixed width, never grows or shrinks — `flex: 1` here would compete with the screen for
    // the row's main-axis space (roughly 50/50 instead of fixed).
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRightWidth: 1,
    borderRightColor: colors.ghostBorder,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-between',
  },
  main: {
    gap: spacing.xxs,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  brandSub: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.ghostBorder,
    paddingTop: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
  },
  itemFocused: {
    backgroundColor: colors.secondaryContainer,
  },
  itemPressed: {
    opacity: 0.7,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxs,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
    color: colors.onAccent,
  },
});
