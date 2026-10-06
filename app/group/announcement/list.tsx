import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { LatestAnnouncementRow } from '@/components/patterns/LatestAnnouncementRow';
import {
  useAnnouncementsQuery,
  useGroupQuery,
  useGroupsForUserQuery,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import type { Announcement } from '@/lib/api';
import { useGridColumns } from '@/hooks/useGridColumns';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

function statusLabel(status: Announcement['status']): string {
  if (status === 'cancelled') return t('announcements.cancelled');
  return t('announcements.published');
}

export default function AnnouncementListScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  // Wide windows fit more than one card on a row (KAN-50).
  const columns = useGridColumns(420);
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: group } = useGroupQuery(groupId);
  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const isMember = !!groupId && !!userId && memberGroups.some((g) => g.id === groupId);
  const { data: announcements = [], isLoading } = useAnnouncementsQuery(groupId, {
    enabled: !!groupId,
    discover: !isMember,
  });
  const { data: isGroupAdmin = false } = useUserIsGroupAdminQuery(groupId, userId, {
    enabled: !!groupId && !!userId,
  });

  useEffect(() => {
    if (!groupId) {
      router.back();
    }
  }, [groupId, router]);

  const renderItem = useCallback(
    ({ item }: { item: Announcement }) => {
      const showStatusBadge = isGroupAdmin && item.status !== 'published';
      return (
        <View style={columns > 1 ? styles.cell : undefined}>
          <LatestAnnouncementRow
            title={item.title}
            body={item.body}
            createdAt={item.createdAt}
            onPress={() => {
              router.push(`/group/announcement/${item.id}?groupId=${encodeURIComponent(groupId)}`);
            }}
            statusBadgeLabel={showStatusBadge ? statusLabel(item.status) : undefined}
            meetingLink={item.meetingLink ?? undefined}
            showMeetingLink={isMember && !!item.meetingLink?.trim()}
          />
        </View>
      );
    },
    [columns, groupId, isGroupAdmin, isMember, router]
  );

  const renderSeparator = useCallback(
    () => <View style={styles.rowSeparator} accessible={false} />,
    []
  );

  if (!groupId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <Text style={styles.sectionTitle}>{t('announcements.latestUpdatesSectionTitle')}</Text>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('announcements.noAnnouncements')}</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.1,
    marginBottom: spacing.xl,
  },
  row: {
    gap: spacing.md,
  },
  /** Each cell shares the row evenly; without it the cards keep their natural width. */
  cell: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.recurringMeetingCardDivider,
    width: '100%',
  },
  empty: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
