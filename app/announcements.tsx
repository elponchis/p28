import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/patterns/EmptyState';
import { LatestAnnouncementRow } from '@/components/patterns/LatestAnnouncementRow';
import { useAuth } from '@/hooks/useAuth';
import {
  useGroupsForUserQuery,
  useLatestPublishedAnnouncementsPerJoinedGroupQuery,
} from '@/hooks/useApiQueries';
import { isApiError } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

type Row = ReturnType<typeof useLatestPublishedAnnouncementsPerJoinedGroupQuery>['data'];
type Announcement = NonNullable<Row>[number];

/**
 * Every joined group's latest announcement in one list. Home shows only the newest one, so this
 * is where the rest of them live — the counterpart of the upcoming events list.
 */
export default function AnnouncementsListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: myGroups = [] } = useGroupsForUserQuery(userId);
  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useLatestPublishedAnnouncementsPerJoinedGroupQuery(myGroups, userId);

  const renderItem = useCallback(
    ({ item }: { item: Announcement }) => (
      <LatestAnnouncementRow
        tagLabel={item.groupName}
        title={item.title}
        body={item.body}
        createdAt={item.createdAt}
        onPress={() =>
          router.push(`/group/announcement/${item.id}?groupId=${encodeURIComponent(item.groupId)}`)
        }
        accessibilityLabel={`${item.groupName}. ${item.title}`}
        meetingLink={item.meetingLink ?? undefined}
        showMeetingLink={!!item.meetingLink?.trim()}
      />
    ),
    [router]
  );

  if (!userId) return null;

  if (isLoading && announcements.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error != null && isApiError(error) ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={announcements}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListEmptyComponent={
        <EmptyState
          iconName="megaphone-outline"
          title={t('announcements.noAnnouncements')}
          subtitle={t('announcements.noAnnouncementsHint')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenHorizontal,
    backgroundColor: colors.background,
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
});
