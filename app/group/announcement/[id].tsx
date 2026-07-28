import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';

import {
  useAnnouncementQuery,
  useUserIsGroupAdminQuery,
  useGroupQuery,
  useMarkInAppNotificationsReadMutation,
} from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import { getUserFacingError, isApiError, type Announcement } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

function statusLabel(status: Announcement['status']): string {
  if (status === 'cancelled') return t('announcements.cancelled');
  return t('announcements.published');
}

export default function AnnouncementDetailScreen() {
  const { id: announcementId, groupId: groupIdParam } = useLocalSearchParams<{
    id: string;
    groupId?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const {
    data: announcement,
    isLoading,
    isError,
    error,
    refetch,
  } = useAnnouncementQuery(announcementId, { enabled: !!announcementId });

  const groupId = announcement?.groupId ?? groupIdParam;
  const { data: group } = useGroupQuery(groupId);
  const { data: isGroupAdmin = false } = useUserIsGroupAdminQuery(groupId, userId, {
    enabled: !!groupId && !!userId,
  });
  const { mutate: markInAppNotificationsRead } = useMarkInAppNotificationsReadMutation();

  useEffect(() => {
    if (!userId || !announcementId) return;
    markInAppNotificationsRead({ userId, announcementId });
  }, [userId, announcementId, markInAppNotificationsRead]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!announcementId) {
    router.back();
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.centered} accessibilityLabel={t('announcements.detailTitle')}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !announcement) {
    const message =
      error != null && isApiError(error) ? getUserFacingError(error) : t('common.error');
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.85 }]}
          accessibilityLabel={t('common.retry')}
          accessibilityRole="button"
        >
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const showStatusBadge = isGroupAdmin && announcement.status !== 'published';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            {announcement.authorAvatarUrl ? (
              <Image
                source={{ uri: announcement.authorAvatarUrl }}
                style={styles.avatar}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color={colors.onSurfaceVariant} />
              </View>
            )}
            <View style={styles.meta}>
              <Text style={styles.authorName} numberOfLines={1}>
                {announcement.authorDisplayName ?? t('groups.groupMember')}
              </Text>
              <Text style={styles.dateText}>{formatRelativeTime(announcement.createdAt)}</Text>
            </View>
          </View>
          {showStatusBadge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusLabel(announcement.status)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{announcement.title}</Text>
        <Text style={styles.body}>{announcement.body}</Text>
        {announcement.meetingLink?.trim() ? (
          <Pressable
            onPress={() => {
              void WebBrowser.openBrowserAsync(announcement.meetingLink.trim());
            }}
            style={styles.meetingLinkRow}
            accessibilityLabel={t('groupEvents.joinMeeting')}
            accessibilityHint={t('groupEvents.joinMeetingHint')}
            accessibilityRole="link"
          >
            <Ionicons name="videocam-outline" size={18} color={colors.primary} />
            <Text style={styles.meetingLinkText}>{t('groupEvents.joinMeeting')}</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const editorialShadow = {
  shadowColor: '#151c27',
  shadowOpacity: 0.06,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 15 },
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...editorialShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  authorName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  dateText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  badge: {
    backgroundColor: colors.amberSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 24,
  },
  meetingLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  meetingLinkText: {
    ...typography.bodyMd,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.md,
  },
  retryLabel: {
    ...typography.bodyMd,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
});
