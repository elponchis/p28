import React, { useMemo } from 'react';
import { Tabs, useSegments } from 'expo-router';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/hooks/useAuth';
import { useInAppBadgeClearTimestamp } from '@/hooks/useInAppBadgeClearTimestamp';
import {
  useChatsForUserQuery,
  useInAppUnreadNotificationCountQuery,
  usePendingFriendRequestCountQuery,
} from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, fontFamily } from '@/theme/tokens';

export default function TabLayout() {
  useLocale();
  const segments = useSegments() as readonly string[];
  const messagesIdx = segments.indexOf('messages');
  const hideMessagesTabHeader = messagesIdx >= 0 && segments[messagesIdx + 1] === 'chat';
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: pendingCount } = usePendingFriendRequestCountQuery(userId);
  const { badgeClearedAt, recordNotificationsTabVisited, hydrated } =
    useInAppBadgeClearTimestamp(userId);
  const { data: inAppUnread = 0 } = useInAppUnreadNotificationCountQuery(userId, badgeClearedAt, {
    enabled: !!userId && hydrated,
  });
  const { data: chats = [] } = useChatsForUserQuery(userId);
  const unreadConversationCount = useMemo(
    () => chats.filter((c) => (c.unreadCount ?? 0) > 0).length,
    [chats]
  );
  const messagesTabBadge = unreadConversationCount > 0 ? unreadConversationCount : undefined;
  const notificationsTabBadgeTotal = (pendingCount ?? 0) + inAppUnread;
  const notificationsBadge =
    notificationsTabBadgeTotal > 0 ? notificationsTabBadgeTotal : undefined;
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.ink300,
        tabBarStyle: {},
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: fontFamily.serif,
          fontSize: 18,
          fontWeight: '400',
          color: colors.onSurface,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.home'),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: t('tabs.groups'),
          tabBarAccessibilityLabel: t('tabs.groups'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarAccessibilityLabel: t('tabs.messages'),
          tabBarBadge: messagesTabBadge,
          lazy: false,
          headerShown: !hideMessagesTabHeader,
        }}
      />
      <Tabs.Screen
        name="notifications"
        listeners={{
          focus: () => {
            void recordNotificationsTabVisited();
          },
        }}
        options={{
          title: t('tabs.notifications'),
          tabBarAccessibilityLabel: t('tabs.notifications'),
          tabBarBadge: notificationsBadge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
        }}
      />
    </Tabs>
  );
}
