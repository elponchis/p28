import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useGroupEventsQuery, useGroupQuery, useGroupsForUserQuery } from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { formatGroupEventDateTime, isGroupEventPast } from '@/lib/dates';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';
import type { GroupEvent } from '@/lib/api';
import { sortGroupEventsForList } from '@/lib/groupEventsSort';

export default function GroupEventListScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: group } = useGroupQuery(groupId);
  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const isMember = !!groupId && !!userId && memberGroups.some((g) => g.id === groupId);
  const { data: events = [], isLoading } = useGroupEventsQuery(groupId, {
    enabled: !!groupId,
    discover: !isMember,
  });
  const sortedEvents = useMemo(() => sortGroupEventsForList(events), [events]);

  useEffect(() => {
    if (!groupId) {
      router.back();
    }
  }, [groupId, router]);

  const renderItem = useCallback(
    ({ item }: { item: GroupEvent }) => {
      const isCancelled = item.status === 'cancelled';
      const isPast = isGroupEventPast(item.startsAt);
      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            isPast && styles.cardPast,
            pressed && { opacity: 0.92 },
          ]}
          onPress={() =>
            router.push({
              pathname: '/group/event/[id]',
              params: { id: item.id, fromGroup: '1' },
            })
          }
          accessibilityLabel={item.title}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.title, isPast && styles.titlePast]} numberOfLines={2}>
              {item.title}
            </Text>
            {isCancelled ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('groupEvents.cancelled')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.meta, isPast && styles.metaPast]}>
            {formatGroupEventDateTime(item.startsAt)}
          </Text>
          {item.location?.trim() ? (
            <Text style={[styles.location, isPast && styles.metaPast]} numberOfLines={2}>
              {item.location.trim()}
            </Text>
          ) : null}
          {item.requiresRsvp && !isCancelled ? (
            <Text style={[styles.rsvp, isPast && styles.rsvpPast]}>
              {t('groupEvents.goingCount', { count: item.goingCount ?? 0 })}
            </Text>
          ) : null}
        </Pressable>
      );
    },
    [router]
  );

  if (!groupId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <Text style={styles.sectionTitle}>{t('groupEvents.listTitle')}</Text>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={sortedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>{t('groupEvents.noEvents')}</Text>
              <Text style={styles.emptySub}>{t('groupEvents.noEventsHint')}</Text>
            </View>
          }
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
    fontSize: 20,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  cardPast: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    color: colors.primary,
    flex: 1,
  },
  titlePast: {
    color: colors.onSurfaceVariant,
  },
  badge: {
    backgroundColor: colors.amberSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: fontFamily.sansSemiBold,
  },
  meta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  metaPast: {
    color: colors.outlineVariant,
  },
  location: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  rsvp: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: spacing.xs,
    fontFamily: fontFamily.sansSemiBold,
  },
  rsvpPast: {
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.sansSemiBold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
