import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { GroupEventFormSheet } from '@/components/patterns/GroupEventFormSheet';
import { useAuth } from '@/hooks/useAuth';
import {
  useCancelGroupEventMutation,
  useUserIsGroupAdminQuery,
  useGroupEventQuery,
  useGroupQuery,
  useGroupsForUserQuery,
  useMarkInAppNotificationsReadMutation,
  useMyEventRsvpQuery,
  useRemoveEventRsvpMutation,
  useUpdateGroupEventMutation,
  useUpsertEventRsvpMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError, isApiError, type EventRsvpResponse } from '@/lib/api';
import {
  formatGroupEventDateTime,
  isGroupEventDiscussionReadOnly,
  isGroupEventPast,
} from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function GroupEventDetailScreen() {
  const { id: eventId, fromGroup: fromGroupParam } = useLocalSearchParams<{
    id: string;
    fromGroup?: string | string[];
  }>();
  const fromGroup = paramString(fromGroupParam);
  const openedFromGroupScreen = fromGroup === '1' || fromGroup === 'true' || fromGroup === 'yes';
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const {
    data: event,
    isLoading,
    isError,
    error,
    refetch,
  } = useGroupEventQuery(eventId, {
    enabled: !!eventId,
  });
  const showGroupNavLink = !!event?.groupId && !openedFromGroupScreen;
  const { data: groupForNav } = useGroupQuery(event?.groupId, {
    enabled: !!event?.groupId && showGroupNavLink,
  });
  const { mutate: markInAppNotificationsRead } = useMarkInAppNotificationsReadMutation();

  useEffect(() => {
    if (!userId || !eventId) return;
    markInAppNotificationsRead({ userId, groupEventId: eventId });
  }, [userId, eventId, markInAppNotificationsRead]);
  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const isMember = !!event?.groupId && !!userId && memberGroups.some((g) => g.id === event.groupId);
  const { data: isGroupAdmin = false } = useUserIsGroupAdminQuery(event?.groupId, userId, {
    enabled: !!event?.groupId && !!userId,
  });
  const isCreator = !!userId && !!event && event.createdByUserId === userId;

  const { data: myRsvp } = useMyEventRsvpQuery(eventId, userId, {
    enabled: !!eventId && !!userId && !!event?.requiresRsvp,
  });

  const cancelMutation = useCancelGroupEventMutation();
  const updateMutation = useUpdateGroupEventMutation();
  const upsertRsvpMutation = useUpsertEventRsvpMutation();
  const removeRsvpMutation = useRemoveEventRsvpMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const now = Date.now();
  const isFuture = event ? new Date(event.startsAt).getTime() > now : false;
  const isActive = event?.status === 'active';
  const eventDiscussionReadOnly = event
    ? isGroupEventDiscussionReadOnly({ status: event.status, startsAt: event.startsAt })
    : false;
  const isPastEvent = event ? isGroupEventPast(event.startsAt) : false;

  const canEdit = isGroupAdmin && isCreator && isActive && isFuture;
  const canCancelAdmin = isGroupAdmin && isActive && isFuture;
  const canRsvp =
    isMember && !!event?.requiresRsvp && isActive && isFuture && !!userId && !!eventId;

  const handleCancelEvent = useCallback(() => {
    if (!eventId || !event) return;
    Alert.alert(t('groupEvents.cancelEvent'), t('groupEvents.cancelEventConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groupEvents.cancelEvent'),
        style: 'destructive',
        onPress: () => {
          cancelMutation.mutate(
            { eventId, groupId: event.groupId },
            {
              onError: (e) => {
                Alert.alert(t('common.error'), isApiError(e) ? getUserFacingError(e) : '');
              },
            }
          );
        },
      },
    ]);
  }, [eventId, event, cancelMutation]);

  const handleEditSubmit = useCallback(
    (payload: {
      title: string;
      description: string;
      location: string;
      meetingLink: string;
      startsAt: string;
      requiresRsvp: boolean;
    }) => {
      if (!userId || !eventId) return;
      const start = new Date(payload.startsAt);
      if (start.getTime() <= Date.now()) {
        setEditError(t('groupEvents.futureOnly'));
        return;
      }
      setEditError(null);
      updateMutation.mutate(
        { eventId, userId, input: payload },
        {
          onSuccess: () => {
            setEditOpen(false);
            refetch();
          },
          onError: (err) => {
            setEditError(isApiError(err) ? getUserFacingError(err) : t('common.error'));
          },
        }
      );
    },
    [userId, eventId, updateMutation, refetch]
  );

  const setRsvp = useCallback(
    (response: EventRsvpResponse) => {
      if (!userId || !eventId) return;
      upsertRsvpMutation.mutate({ eventId, userId, response });
    },
    [userId, eventId, upsertRsvpMutation]
  );

  const clearRsvp = useCallback(() => {
    if (!userId || !eventId) return;
    removeRsvpMutation.mutate({ eventId, userId });
  }, [userId, eventId, removeRsvpMutation]);

  const openEventDiscussion = useCallback(() => {
    if (!event) return;
    if (!isMember) {
      Alert.alert(t('groups.join'), t('groupEvents.joinToDiscuss'));
      return;
    }
    router.push(`/group/discussion/${event.discussionId}`);
  }, [event, isMember, router]);

  const openAttendees = useCallback(() => {
    if (!event) return;
    if (!isMember) {
      Alert.alert(t('groups.join'), t('groupEvents.joinToSeeAttendees'));
      return;
    }
    router.push(`/group/event/${event.id}/attendees`);
  }, [event, isMember, router]);

  if (!eventId) {
    router.back();
    return null;
  }

  if (isLoading && !event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error && 'message' in error ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {event.status === 'cancelled' ? (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledText}>{t('groupEvents.cancelled')}</Text>
        </View>
      ) : null}

      <Text style={[styles.title, isPastEvent && styles.titlePast]}>{event.title}</Text>
      <Text style={[styles.dateLine, isPastEvent && styles.dateLinePast]}>
        {formatGroupEventDateTime(event.startsAt)}
      </Text>
      {event.location?.trim() ? (
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={18}
            color={isPastEvent ? colors.outlineVariant : colors.onSurfaceVariant}
          />
          <Text style={[styles.locationText, isPastEvent && styles.locationTextPast]}>
            {event.location.trim()}
          </Text>
        </View>
      ) : null}
      {event.meetingLink?.trim() ? (
        <Pressable
          onPress={() => {
            void WebBrowser.openBrowserAsync(event.meetingLink.trim());
          }}
          style={[styles.meetingLinkRow, isPastEvent && styles.meetingLinkRowPast]}
          accessibilityLabel={t('groupEvents.joinMeeting')}
          accessibilityHint={t('groupEvents.joinMeetingHint')}
          accessibilityRole="link"
        >
          <Ionicons
            name="videocam-outline"
            size={18}
            color={isPastEvent ? colors.onSurfaceVariant : colors.primary}
          />
          <Text style={[styles.meetingLinkText, isPastEvent && styles.meetingLinkTextPast]}>
            {t('groupEvents.joinMeeting')}
          </Text>
          <Ionicons
            name="open-outline"
            size={16}
            color={isPastEvent ? colors.onSurfaceVariant : colors.primary}
          />
        </Pressable>
      ) : null}
      <Text style={[styles.author, isPastEvent && styles.authorPast]}>
        {event.authorDisplayName ?? t('groups.groupMember')}
      </Text>

      {showGroupNavLink ? (
        <Pressable
          onPress={() => router.push(`/group/${event.groupId}`)}
          style={styles.linkRow}
          accessibilityLabel={
            groupForNav
              ? `${t('groupEvents.viewGroup')}, ${groupForNav.name}`
              : t('groupEvents.viewGroup')
          }
          accessibilityHint={t('groupEvents.viewGroupHint')}
          accessibilityRole="link"
        >
          <View style={styles.linkTextCol}>
            <Text style={styles.linkTitle}>{t('groupEvents.viewGroup')}</Text>
            <Text style={styles.linkSub} numberOfLines={1}>
              {groupForNav?.name ?? t('common.loading')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}

      {event.description ? (
        <Text style={[styles.body, isPastEvent && styles.bodyPast]}>{event.description}</Text>
      ) : null}

      {!isMember && event.requiresRsvp && isActive && isFuture ? (
        <Text style={styles.joinForRsvpHint}>{t('groupEvents.joinToRsvp')}</Text>
      ) : null}

      {event.requiresRsvp ? (
        <Text style={styles.rsvpNote}>{t('groupEvents.requiresRsvpHint')}</Text>
      ) : null}

      {canRsvp ? (
        <View style={styles.rsvpBlock}>
          <Text style={styles.rsvpHeading}>{t('groupEvents.yourResponse')}</Text>
          <View style={styles.rsvpRow}>
            <Pressable
              onPress={() => setRsvp('going')}
              style={[styles.rsvpBtn, myRsvp?.response === 'going' && styles.rsvpBtnActive]}
              accessibilityLabel={t('groupEvents.going')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.rsvpBtnLabel,
                  myRsvp?.response === 'going' && styles.rsvpBtnLabelActive,
                ]}
              >
                {t('groupEvents.going')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRsvp('maybe')}
              style={[styles.rsvpBtn, myRsvp?.response === 'maybe' && styles.rsvpBtnActive]}
              accessibilityLabel={t('groupEvents.maybe')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.rsvpBtnLabel,
                  myRsvp?.response === 'maybe' && styles.rsvpBtnLabelActive,
                ]}
              >
                {t('groupEvents.maybe')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRsvp('not_going')}
              style={[styles.rsvpBtn, myRsvp?.response === 'not_going' && styles.rsvpBtnActive]}
              accessibilityLabel={t('groupEvents.notGoing')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.rsvpBtnLabel,
                  myRsvp?.response === 'not_going' && styles.rsvpBtnLabelActive,
                ]}
              >
                {t('groupEvents.notGoing')}
              </Text>
            </Pressable>
          </View>
          {myRsvp ? (
            <Pressable
              onPress={clearRsvp}
              style={styles.clearRsvp}
              accessibilityLabel={t('groupEvents.clearResponse')}
              accessibilityRole="button"
            >
              <Text style={styles.clearRsvpText}>{t('groupEvents.clearResponse')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {event.requiresRsvp ? (
        <Pressable
          onPress={openAttendees}
          style={styles.linkRow}
          accessibilityLabel={t('groupEvents.attendeesLink')}
          accessibilityHint={isMember ? undefined : t('groupEvents.joinToSeeAttendees')}
          accessibilityRole="link"
        >
          <View style={styles.linkTextCol}>
            <Text style={styles.linkTitle}>{t('groupEvents.attendeesLink')}</Text>
            <Text style={styles.linkSub}>
              {t('groupEvents.goingCount', { count: event.goingCount ?? 0 })}
              {typeof event.maybeCount === 'number' && event.maybeCount > 0
                ? ` · ${t('groupEvents.maybeCount', { count: event.maybeCount })}`
                : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={openEventDiscussion}
        style={[styles.discussionCard, eventDiscussionReadOnly && styles.discussionCardMuted]}
        accessibilityLabel={t('groupEvents.discussionLink')}
        accessibilityHint={
          !isMember
            ? t('groupEvents.joinToDiscuss')
            : eventDiscussionReadOnly
              ? `${t('groupEvents.discussionReadOnlyBanner')} ${t('groupEvents.discussionDisabledCancelled')}`
              : t('groupEvents.discussionHint')
        }
        accessibilityRole="button"
      >
        <Ionicons
          name="chatbubbles-outline"
          size={22}
          color={eventDiscussionReadOnly ? colors.onSurfaceVariant : colors.primary}
        />
        <View style={styles.discussionTextWrap}>
          <Text style={styles.discussionTitle}>{t('groupEvents.discussionLink')}</Text>
          <Text style={styles.discussionSub}>
            {eventDiscussionReadOnly
              ? t('groupEvents.discussionReadOnlyBanner')
              : t('groupEvents.discussionHint')}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={eventDiscussionReadOnly ? colors.onSurfaceVariant : colors.primary}
        />
      </Pressable>

      {canEdit ? (
        <Button
          title={t('groupEvents.editEvent')}
          variant="secondary"
          onPress={() => {
            setEditError(null);
            setEditOpen(true);
          }}
          accessibilityLabel={t('groupEvents.editEvent')}
        />
      ) : null}

      {canCancelAdmin ? (
        <Pressable
          onPress={handleCancelEvent}
          style={styles.cancelBtn}
          disabled={cancelMutation.isPending}
          accessibilityLabel={t('groupEvents.cancelEvent')}
          accessibilityRole="button"
        >
          <Text style={styles.cancelBtnText}>{t('groupEvents.cancelEvent')}</Text>
        </Pressable>
      ) : null}

      <GroupEventFormSheet
        visible={editOpen}
        onRequestClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        mode="edit"
        initialEvent={event}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.lg,
  },
  cancelledBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  cancelledText: {
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    color: colors.primary,
  },
  titlePast: {
    color: colors.onSurfaceVariant,
  },
  dateLine: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  dateLinePast: {
    color: colors.outlineVariant,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    maxWidth: '100%',
  },
  locationText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  locationTextPast: {
    color: colors.outlineVariant,
  },
  meetingLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  meetingLinkRowPast: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.9,
  },
  meetingLinkTextPast: {
    color: colors.onSurfaceVariant,
  },
  author: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  authorPast: {
    color: colors.outlineVariant,
  },
  body: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  bodyPast: {
    color: colors.onSurfaceVariant,
  },
  joinForRsvpHint: {
    ...typography.bodyMd,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  rsvpNote: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  rsvpBlock: {
    marginTop: spacing.sm,
  },
  rsvpHeading: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  rsvpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rsvpBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  rsvpBtnActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  rsvpBtnLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rsvpBtnLabelActive: {
    color: colors.onSecondaryContainer,
  },
  clearRsvp: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  clearRsvpText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  linkTextCol: {
    flex: 1,
  },
  linkTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  linkSub: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },
  discussionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  discussionCardMuted: {
    opacity: 0.85,
  },
  discussionTextWrap: {
    flex: 1,
  },
  discussionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  discussionSub: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },
  cancelBtn: {
    marginTop: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
  },
});
