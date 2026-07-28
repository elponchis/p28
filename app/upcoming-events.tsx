import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { JoinedGroupUpcomingEventCard } from '@/components/patterns/JoinedGroupUpcomingEventCard';
import { useAuth } from '@/hooks/useAuth';
import {
  useGroupsForUserQuery,
  useMyEventRsvpsMapForEventsQuery,
  useUpcomingJoinedGroupEventsQuery,
} from '@/hooks/useApiQueries';
import { isApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { getUserFacingError } from '@/lib/errors';
import type { JoinedGroupUpcomingEventRow } from '@/lib/upcomingJoinedGroupEvents';
import { colors, spacing, typography } from '@/theme/tokens';

export default function UpcomingEventsListScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: myGroups = [] } = useGroupsForUserQuery(userId);
  const {
    data: upcomingEvents = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useUpcomingJoinedGroupEventsQuery(myGroups, userId);
  const rsvpByEventId = useMyEventRsvpsMapForEventsQuery(userId, upcomingEvents);

  const cardWidth = useMemo(
    () => Math.max(0, windowWidth - spacing.screenHorizontal * 2),
    [windowWidth]
  );

  const renderItem = useCallback(
    ({ item }: { item: JoinedGroupUpcomingEventRow }) => (
      <JoinedGroupUpcomingEventCard
        event={item}
        width={cardWidth}
        rsvpResponse={rsvpByEventId.get(item.id) ?? null}
      />
    ),
    [cardWidth, rsvpByEventId]
  );

  if (!userId) {
    return null;
  }

  if (myGroups.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{t('home.noUpcomingEvents')}</Text>
        <Text style={styles.emptySub}>{t('home.noUpcomingEventsSubtitle')}</Text>
      </View>
    );
  }

  if (isLoading && upcomingEvents.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centeredPadded}>
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error != null && isApiError(error) ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={upcomingEvents}
      keyExtractor={(item) => item.id}
      extraData={rsvpByEventId}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>{t('home.noUpcomingEvents')}</Text>
          <Text style={styles.emptySub}>{t('home.noUpcomingEventsSubtitle')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  centeredPadded: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyBlock: {
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
});
