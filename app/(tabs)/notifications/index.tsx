import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/hooks/useAuth';
import {
  useInAppNotificationsQuery,
  useMarkInAppNotificationsReadMutation,
  usePendingFriendRequestCountQuery,
} from '@/hooks/useApiQueries';
import type { InAppNotification } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export default function NotificationsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const { data: pendingCount } = usePendingFriendRequestCountQuery(userId);
  const { data: inAppItems = [], isLoading: inAppLoading } = useInAppNotificationsQuery(userId);
  const markRead = useMarkInAppNotificationsReadMutation();

  const hasFriendNotifications = pendingCount != null && pendingCount > 0;
  const hasGroupActivity = inAppItems.length > 0;
  const hasAnyContent = hasFriendNotifications || hasGroupActivity;
  const showEmpty = !hasAnyContent && !inAppLoading;

  const handleOpenInApp = useCallback(
    (item: InAppNotification) => {
      if (!userId) return;
      markRead.mutate({ userId, notificationIds: [item.id] });
      if (item.kind === 'announcement' && item.announcementId) {
        router.push({
          pathname: '/group/announcement/[id]',
          params: { id: item.announcementId, groupId: item.groupId },
        });
        return;
      }
      if (item.kind === 'group_event' && item.groupEventId) {
        router.push({
          pathname: '/group/event/[id]',
          params: { id: item.groupEventId },
        });
      }
    },
    [markRead, router, userId]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, showEmpty && styles.scrollContentEmpty]}
      showsVerticalScrollIndicator={false}
    >
      {hasFriendNotifications ? (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/(tabs)/notifications/friend-requests')}
          accessibilityLabel={t('notifications.friendRequests')}
          accessibilityHint={t('notifications.friendRequestsHint')}
          accessibilityRole="button"
        >
          <View style={styles.cardIconWrap}>
            <Ionicons name="person-add-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t('notifications.friendRequests')}</Text>
            <Text style={styles.cardSubtitle}>
              {pendingCount} {t('notifications.pendingCount')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.ink300} />
        </Pressable>
      ) : null}

      {inAppLoading && !hasGroupActivity ? (
        <View
          style={styles.loadingRow}
          accessibilityLabel={t('notifications.groupActivityLoading')}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>{t('notifications.groupActivityLoading')}</Text>
        </View>
      ) : null}

      {hasGroupActivity ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.groupActivitySection')}</Text>
          {inAppItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                styles.activityCard,
                !item.readAt && styles.activityCardUnread,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleOpenInApp(item)}
              accessibilityLabel={`${item.kind === 'announcement' ? t('notifications.kindAnnouncement') : t('notifications.kindEvent')}: ${item.title}`}
              accessibilityHint={
                item.kind === 'announcement'
                  ? t('notifications.openAnnouncementHint')
                  : t('notifications.openEventHint')
              }
              accessibilityRole="button"
            >
              <View style={styles.cardIconWrap}>
                <Ionicons
                  name={item.kind === 'announcement' ? 'megaphone-outline' : 'calendar-outline'}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.activityTitleRow}>
                  {!item.readAt ? <View style={styles.unreadDot} /> : null}
                  <Text
                    style={[styles.cardTitle, !item.readAt && styles.cardTitleUnread]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text style={styles.kindRow}>
                  {item.kind === 'announcement'
                    ? t('notifications.kindAnnouncement')
                    : t('notifications.kindEvent')}
                  {item.groupName.trim().length > 0
                    ? ` · ${t('notifications.inGroupNamed', { name: item.groupName.trim() })}`
                    : ''}
                </Text>
                <Text style={styles.summaryText} numberOfLines={3}>
                  {item.summary}
                </Text>
                <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink300} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.ink300} />
          <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
          <Text style={styles.emptySubtitle}>{t('notifications.noNotificationsSubtitle')}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: shadow.cardSoft.shadowOffset,
    shadowOpacity: shadow.cardSoft.shadowOpacity,
    shadowRadius: shadow.cardSoft.shadowRadius,
    elevation: 2,
  },
  activityCard: {
    alignItems: 'flex-start',
  },
  activityCardUnread: {
    backgroundColor: colors.surfaceContainer,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  kindRow: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.ink300,
    marginTop: spacing.xs,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
