import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/patterns/EmptyState';
import { GroupMemberRowList } from '@/components/patterns/GroupMemberRowList';
import { useAuth } from '@/hooks/useAuth';
import { useEventRsvpsQuery, useFriendIdsQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import type { EventRsvpAttendee } from '@/lib/api';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

export default function EventAttendeesScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const { data: rsvps = [], isLoading } = useEventRsvpsQuery(eventId, { enabled: !!eventId });
  const { data: friendIds = [] } = useFriendIdsQuery(currentUserId || undefined);
  const friendSet = useMemo(() => new Set(friendIds), [friendIds]);

  const { going, maybe } = useMemo(() => {
    const g: EventRsvpAttendee[] = [];
    const m: EventRsvpAttendee[] = [];
    for (const r of rsvps) {
      if (r.response === 'going') g.push(r);
      else if (r.response === 'maybe') m.push(r);
    }
    return { going: g, maybe: m };
  }, [rsvps]);

  const handleMemberPress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  if (!eventId) {
    router.back();
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const empty = going.length === 0 && maybe.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.hint}>{t('groupEvents.attendeesLink')}</Text>

      {empty ? <EmptyState iconName="people-outline" title={t('groupEvents.noRsvpsYet')} /> : null}

      {going.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>
            {t('groupEvents.attendeesTitle')} ({going.length})
          </Text>
          <GroupMemberRowList
            items={going}
            currentUserId={currentUserId}
            friendUserIds={friendSet}
            onMemberPress={handleMemberPress}
          />
        </>
      ) : null}

      {maybe.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, styles.sectionSpacer]}>
            {t('groupEvents.attendeesMaybeTitle')} ({maybe.length})
          </Text>
          <GroupMemberRowList
            items={maybe}
            currentUserId={currentUserId}
            friendUserIds={friendSet}
            onMemberPress={handleMemberPress}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  sectionSpacer: {
    marginTop: spacing.lg,
  },
});
