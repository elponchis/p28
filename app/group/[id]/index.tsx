import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, StackedAvatars, type StackedAvatarMember } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { LatestAnnouncementRow } from '@/components/patterns/LatestAnnouncementRow';
import { GroupLeaderRows } from '@/components/patterns/GroupLeaderRows';
import { FadeActionSheet } from '@/components/patterns/FadeActionSheet';
import { GroupEventFormSheet } from '@/components/patterns/GroupEventFormSheet';
import { GroupRecurringMeetingFormSheet } from '@/components/patterns/GroupRecurringMeetingFormSheet';
import { useAuth } from '@/hooks/useAuth';
import {
  useAnnouncementsQuery,
  useCreateGroupEventMutation,
  useCreateGroupRecurringMeetingMutation,
  useDeleteGroupRecurringMeetingMutation,
  useDiscussionsQuery,
  useGroupAdminsQuery,
  useGroupEventsQuery,
  useUserIsGroupAdminQuery,
  useGroupRecurringMeetingsQuery,
  useGroupMembersQuery,
  useGroupQuery,
  useGroupsForUserQuery,
  useIsSuperAdminQuery,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useUpdateGroupRecurringMeetingMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError, isApiError } from '@/lib/api';
import type { CreateGroupRecurringMeetingInput, GroupRecurringMeeting } from '@/lib/api';
import { formatGroupEventDateTime, formatRelativeTime } from '@/lib/dates';
import { compareGroupEventsByStartThenCreated } from '@/lib/groupEventsSort';
import { t } from '@/lib/i18n';
import { formatRecurringMeetingSummary } from '@/lib/recurringMeetingSummary';
import { colors, fontFamily, radius, shadow, spacing, typography } from '@/theme/tokens';

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en: t('language.english'),
    km: t('language.khmer'),
    ko: t('language.korean'),
  };
  return map[code] ?? code;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const {
    data: group,
    isLoading,
    isError: isGroupError,
    error: groupError,
    refetch: refetchGroup,
  } = useGroupQuery(id);
  const { data: memberGroups = [], refetch: refetchMembership } = useGroupsForUserQuery(userId);
  const isMember = !!id && memberGroups.some((g) => g.id === id);
  const { data: groupEvents = [], refetch: refetchGroupEvents } = useGroupEventsQuery(id, {
    enabled: !!id,
    discover: !isMember,
  });
  // Member + leader lists: filtered RPCs (lib/groupCommunityDisplay.ts). “Am I admin?” uses
  // isUserGroupAdmin — not the filtered list (see migration 00057).
  const { data: members = [], refetch: refetchMembers } = useGroupMembersQuery(id, {
    enabled: !!id,
  });
  const {
    data: discussions = [],
    isLoading: discussionsLoading,
    refetch: refetchDiscussions,
  } = useDiscussionsQuery({ groupId: id, enabled: !!id });
  const { data: announcements = [], refetch: refetchAnnouncements } = useAnnouncementsQuery(id, {
    enabled: !!id,
    discover: !isMember,
  });
  const { data: recurringMeetings = [], refetch: refetchRecurringMeetings } =
    useGroupRecurringMeetingsQuery(id, {
      enabled: !!id && group?.type === 'ministry',
      discover: !isMember,
    });
  const { data: groupAdmins = [] } = useGroupAdminsQuery(id, { enabled: !!id });
  const { data: isCurrentUserGroupAdmin = false } = useUserIsGroupAdminQuery(id, userId, {
    enabled: !!id && !!userId,
  });
  const { data: isSuperAdmin = false } = useIsSuperAdminQuery(userId, { enabled: !!userId });
  const createEventMutation = useCreateGroupEventMutation();
  const createRecurringMutation = useCreateGroupRecurringMeetingMutation();
  const updateRecurringMutation = useUpdateGroupRecurringMeetingMutation();
  const deleteRecurringMutation = useDeleteGroupRecurringMeetingMutation();
  const isGroupAdmin = isCurrentUserGroupAdmin;
  /** Group admins are usually members; platform super_admins may moderate without joining. */
  const canModerateAsAdmin = useMemo(
    () => isGroupAdmin && (isMember || isSuperAdmin),
    [isGroupAdmin, isMember, isSuperAdmin]
  );
  const joinMutation = useJoinGroupMutation();
  const leaveMutation = useLeaveGroupMutation();
  const isJoining = joinMutation.isPending || leaveMutation.isPending;

  const isCreator = !!userId && !!group && group.createdByUserId === userId;
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isCreator
        ? () => (
            <Pressable
              onPress={() => id && router.push(`/group/edit?groupId=${id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
              accessibilityLabel={t('groups.editGroup')}
              accessibilityHint={t('groups.editGroupHint')}
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#ffffff" />
            </Pressable>
          )
        : undefined,
    });
  }, [isCreator, id, navigation, router]);

  const mutationError = joinMutation.error ?? leaveMutation.error;
  const error =
    (isGroupError && groupError && 'message' in groupError ? groupError : null) ?? mutationError;

  useFocusEffect(
    useCallback(() => {
      refetchGroup();
      refetchMembership();
      refetchMembers();
      refetchDiscussions();
      refetchAnnouncements();
      refetchGroupEvents();
      refetchRecurringMeetings();
    }, [
      refetchGroup,
      refetchMembership,
      refetchMembers,
      refetchDiscussions,
      refetchAnnouncements,
      refetchGroupEvents,
      refetchRecurringMeetings,
    ])
  );

  const handleJoin = useCallback(() => {
    if (!userId || !id) return;
    joinMutation.mutate(
      { groupId: id, userId },
      {
        onError: () => {},
      }
    );
  }, [userId, id, joinMutation]);

  const handleLeave = useCallback(() => {
    if (!userId || !id) return;
    leaveMutation.mutate(
      { groupId: id, userId },
      {
        onError: () => {},
      }
    );
  }, [userId, id, leaveMutation]);

  const handleCreateDiscussion = useCallback(() => {
    router.push(`/group/discussion/create?groupId=${id}`);
  }, [router, id]);

  const handleSeeAllMembers = useCallback(() => {
    router.push(`/group/members?groupId=${id}`);
  }, [router, id]);

  const handleLeaderProfilePress = useCallback(
    (memberId: string) => {
      router.push(`/profile/${memberId}`);
    },
    [router]
  );

  const [joinedSheetVisible, setJoinedSheetVisible] = useState(false);

  const handleOpenJoinedSheet = useCallback(() => {
    setJoinedSheetVisible(true);
  }, []);

  const handleCloseJoinedSheet = useCallback(() => {
    setJoinedSheetVisible(false);
  }, []);

  const handleManageSettings = useCallback(() => {
    router.push(`/group/settings?groupId=${id}`);
  }, [router, id]);

  const handleCreateAnnouncement = useCallback(() => {
    if (id) router.push(`/group/announcement/create?groupId=${id}`);
  }, [router, id]);

  const handleSeeAllAnnouncements = useCallback(() => {
    if (id) router.push(`/group/announcement/list?groupId=${id}`);
  }, [router, id]);

  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [eventFormError, setEventFormError] = useState<string | null>(null);

  const [recurringSheetOpen, setRecurringSheetOpen] = useState(false);
  const [recurringFormError, setRecurringFormError] = useState<string | null>(null);
  const [recurringEdit, setRecurringEdit] = useState<GroupRecurringMeeting | null>(null);

  const viewerTimeZone =
    typeof Intl !== 'undefined'
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC')
      : 'UTC';

  const { width: windowWidth } = useWindowDimensions();
  /** Horizontal strip: first card aligns with content inset; next card peeks. */
  const recurringCarouselCardWidth = useMemo(() => {
    const inset = spacing.lg;
    const gap = spacing.md;
    const peek = spacing.md;
    return Math.max(260, windowWidth - inset - gap - peek);
  }, [windowWidth]);

  const handleOpenRecurringCreate = useCallback(() => {
    setRecurringEdit(null);
    setRecurringFormError(null);
    setRecurringSheetOpen(true);
  }, []);

  const handleOpenRecurringEdit = useCallback((m: GroupRecurringMeeting) => {
    setRecurringEdit(m);
    setRecurringFormError(null);
    setRecurringSheetOpen(true);
  }, []);

  const handleCloseRecurringSheet = useCallback(() => {
    setRecurringSheetOpen(false);
    setRecurringEdit(null);
    setRecurringFormError(null);
  }, []);

  const handleRecurringDeleteRequest = useCallback(() => {
    if (!recurringEdit) return;
    Alert.alert(
      t('recurringMeetings.deleteRecurring'),
      t('recurringMeetings.deleteRecurringConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recurringMeetings.deleteRecurring'),
          style: 'destructive',
          onPress: () => {
            setRecurringFormError(null);
            deleteRecurringMutation.mutate(
              { meetingId: recurringEdit.id, groupId: recurringEdit.groupId },
              {
                onSuccess: () => {
                  handleCloseRecurringSheet();
                  refetchRecurringMeetings();
                },
                onError: (err) => {
                  setRecurringFormError(
                    isApiError(err) ? getUserFacingError(err) : t('common.error')
                  );
                },
              }
            );
          },
        },
      ]
    );
  }, [recurringEdit, deleteRecurringMutation, handleCloseRecurringSheet, refetchRecurringMeetings]);

  const handleSubmitRecurring = useCallback(
    (payload: CreateGroupRecurringMeetingInput) => {
      if (!userId || !id) return;
      if (recurringEdit) {
        updateRecurringMutation.mutate(
          { meetingId: recurringEdit.id, userId, input: payload },
          {
            onSuccess: () => {
              handleCloseRecurringSheet();
              refetchRecurringMeetings();
            },
            onError: (err) => {
              setRecurringFormError(isApiError(err) ? getUserFacingError(err) : t('common.error'));
            },
          }
        );
        return;
      }
      createRecurringMutation.mutate(
        { groupId: id, userId, input: payload },
        {
          onSuccess: () => {
            handleCloseRecurringSheet();
            refetchRecurringMeetings();
          },
          onError: (err) => {
            setRecurringFormError(isApiError(err) ? getUserFacingError(err) : t('common.error'));
          },
        }
      );
    },
    [
      userId,
      id,
      recurringEdit,
      createRecurringMutation,
      updateRecurringMutation,
      refetchRecurringMeetings,
      handleCloseRecurringSheet,
    ]
  );

  const handleOpenCreateEvent = useCallback(() => {
    setEventFormError(null);
    setEventSheetOpen(true);
  }, []);

  const handleCloseEventSheet = useCallback(() => {
    setEventSheetOpen(false);
    setEventFormError(null);
  }, []);

  const handleSeeAllEvents = useCallback(() => {
    if (id) router.push(`/group/event/list?groupId=${id}`);
  }, [router, id]);

  const handleSubmitCreateEvent = useCallback(
    (payload: {
      title: string;
      description: string;
      location: string;
      meetingLink: string;
      startsAt: string;
      requiresRsvp: boolean;
    }) => {
      if (!userId || !id) return;
      const start = new Date(payload.startsAt);
      if (start.getTime() <= Date.now()) {
        setEventFormError(t('groupEvents.futureOnly'));
        return;
      }
      setEventFormError(null);
      createEventMutation.mutate(
        { groupId: id, userId, input: payload },
        {
          onSuccess: () => {
            setEventSheetOpen(false);
            refetchGroupEvents();
          },
          onError: (err) => {
            setEventFormError(isApiError(err) ? getUserFacingError(err) : t('common.error'));
          },
        }
      );
    },
    [userId, id, createEventMutation, refetchGroupEvents]
  );

  /** Hero stack: leaders first, then other members (deduped by userId). */
  const heroStackMembers = useMemo((): StackedAvatarMember[] => {
    const byId = new Map<string, StackedAvatarMember>();
    const add = (userId: string, avatarUrl?: string | null, displayName?: string | null) => {
      if (byId.has(userId)) return;
      byId.set(userId, {
        userId,
        avatarUrl: avatarUrl ?? null,
        displayName: displayName ?? null,
      });
    };
    for (const a of groupAdmins) {
      add(a.userId, a.avatarUrl, a.displayName);
    }
    for (const m of members) {
      add(m.userId, m.avatarUrl, m.displayName);
    }
    return Array.from(byId.values());
  }, [groupAdmins, members]);

  const publishedAnnouncements = announcements.filter((a) => a.status === 'published');
  const latestPublished =
    publishedAnnouncements.length > 0
      ? publishedAnnouncements.reduce((acc, cur) =>
          new Date(cur.createdAt) > new Date(acc.createdAt) ? cur : acc
        )
      : undefined;

  const handleOpenLatestAnnouncementDetail = useCallback(() => {
    if (!id || !latestPublished) return;
    router.push(`/group/announcement/${latestPublished.id}?groupId=${encodeURIComponent(id)}`);
  }, [router, id, latestPublished]);

  if (!id) {
    router.back();
    return null;
  }

  if ((isLoading && !group) || (isGroupError && !group)) {
    return (
      <View style={styles.centered}>
        {isGroupError ? (
          <Text style={styles.errorText}>
            {groupError && 'message' in groupError
              ? getUserFacingError(groupError)
              : t('common.error')}
          </Text>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  if (!group) {
    return null;
  }

  const typeLabel = group.type === 'forum' ? t('groups.forum') : t('groups.ministry');
  const languageName = getLanguageName(group.preferredLanguage);
  const memberCountLabel = `${members.length} ${members.length === 1 ? t('groups.member') : t('groups.members')}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: Editorial featured card ── */}
      <View style={styles.heroWrap}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPlaceholderBg]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,32,70,0.18)', 'rgba(0,32,70,0.88)']}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.heroDescription} numberOfLines={3}>
              {'\u201C'}
              {group.description}
              {'\u201D'}
            </Text>
          ) : null}
          <View style={styles.heroMetaRow}>
            {group.country ? (
              <View style={styles.heroMetaItem}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroMetaText}>{group.country}</Text>
              </View>
            ) : null}
            <View style={styles.heroMetaItem}>
              <Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.heroMetaText}>{languageName}</Text>
            </View>
          </View>
          <View style={styles.heroActionsColumn}>
            <View style={styles.heroPrimaryRow}>
              {isMember ? (
                <Pressable
                  onPress={handleOpenJoinedSheet}
                  style={({ pressed }) => [styles.heroJoinedPill, pressed && { opacity: 0.85 }]}
                  disabled={isJoining}
                  accessibilityLabel={t('groups.joined')}
                  accessibilityHint={t('groups.opensOptions')}
                >
                  <Ionicons name="checkmark-circle" size={15} color={colors.onSecondaryContainer} />
                  <Text style={styles.heroJoinedPillText}>{t('groups.joined')}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.onSecondaryContainer} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleJoin}
                  style={({ pressed }) => [
                    styles.heroJoinPill,
                    pressed && { opacity: 0.9 },
                    isJoining && { opacity: 0.5 },
                  ]}
                  disabled={isJoining}
                  accessibilityLabel={t('groups.join')}
                  accessibilityHint={t('groups.joinsGroupHint')}
                  accessibilityRole="button"
                >
                  {joinMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.heroJoinPillText}>{t('groups.join')}</Text>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={handleSeeAllMembers}
                style={({ pressed }) => [styles.heroMembersTapRow, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel={memberCountLabel}
                accessibilityHint={t('groups.viewAllMembersHint')}
              >
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroMemberCountText}>{memberCountLabel}</Text>
                {heroStackMembers.length > 0 ? (
                  <StackedAvatars
                    members={heroStackMembers}
                    maxCount={3}
                    size="sm"
                    ringed
                    accessibilityLabel={t('groups.heroStackedAvatarsA11y')}
                  />
                ) : null}
              </Pressable>
            </View>
            {canModerateAsAdmin || (isSuperAdmin && id) ? (
              <View style={styles.heroLeaderRow}>
                {canModerateAsAdmin ? (
                  <>
                    <Pressable
                      onPress={handleCreateAnnouncement}
                      style={({ pressed }) => [
                        styles.heroAnnounceBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityLabel={t('announcements.newAnnouncement')}
                      accessibilityHint={t('announcements.announceHint')}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="megaphone-outline"
                        size={20}
                        color={colors.onSecondaryContainer}
                      />
                    </Pressable>
                    <Pressable
                      onPress={handleOpenCreateEvent}
                      style={({ pressed }) => [
                        styles.heroAnnounceBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityLabel={t('groupEvents.newEvent')}
                      accessibilityHint={t('groupEvents.newEventHint')}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={colors.onSecondaryContainer}
                      />
                    </Pressable>
                  </>
                ) : null}
                {isSuperAdmin && id ? (
                  <Pressable
                    onPress={() => router.push(`/group/${id}/super-admin`)}
                    style={({ pressed }) => [styles.heroAnnounceBtn, pressed && { opacity: 0.85 }]}
                    accessibilityLabel={t('groups.superAdminAssignEntryLabel')}
                    accessibilityHint={t('groups.superAdminAssignEntryHint')}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={colors.onSecondaryContainer}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Content canvas ── */}
      <View style={styles.contentCanvas}>
        {error && 'message' in error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getUserFacingError(error)}</Text>
          </View>
        ) : null}

        {/* ── Leaders (group admins) — Stitch: Ministry leaders editorial block ── */}
        <View style={styles.leadersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {group.type === 'ministry'
                ? t('groups.ministryLeadersTitle')
                : t('groups.forumLeadersTitle')}
            </Text>
          </View>
          {groupAdmins.length === 0 ? (
            <Text style={styles.leadersEmptyInline} accessibilityRole="text">
              {t('groups.noLeadersYet')}
            </Text>
          ) : (
            <GroupLeaderRows
              items={groupAdmins.map((a) => ({
                userId: a.userId,
                displayName: a.displayName,
                avatarUrl: a.avatarUrl ?? null,
              }))}
              currentUserId={userId ?? ''}
              leaderSubtitle={t('groups.leaderListSubtitle')}
              yourselfSubtitle={t('groups.yourself')}
              onLeaderPress={handleLeaderProfilePress}
              edgeToEdge
              listAccessibilityLabel={
                group.type === 'ministry'
                  ? t('groups.ministryLeadersTitle')
                  : t('groups.forumLeadersTitle')
              }
            />
          )}
        </View>

        {/* ── Recurring meetings (ministry only) ── */}
        {group.type === 'ministry' ? (
          <View style={styles.section}>
            <View style={styles.recurringSacredHeader}>
              <View style={styles.recurringSacredHeaderText}>
                <Text style={styles.recurringSacredTitle}>
                  {t('recurringMeetings.sectionTitle')}
                </Text>
                <Text style={styles.recurringSacredSubtitle}>
                  {t('recurringMeetings.sectionSubtitle')}
                </Text>
              </View>
              {canModerateAsAdmin && recurringMeetings.length > 0 ? (
                <Pressable
                  onPress={handleOpenRecurringCreate}
                  style={styles.recurringSacredAdd}
                  accessibilityLabel={t('recurringMeetings.addMeeting')}
                  accessibilityHint={t('recurringMeetings.addMeetingHint')}
                >
                  <Ionicons name="add-circle" size={18} color={colors.secondary} />
                  <Text style={styles.recurringSacredAddLabel}>
                    {t('recurringMeetings.addMeeting')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.recurringSectionWrap}>
              {recurringMeetings.length > 0 ? (
                <RecurringMeetingsList
                  meetings={recurringMeetings}
                  viewerTimeZone={viewerTimeZone}
                  canModerateAsAdmin={canModerateAsAdmin}
                  isMember={isMember}
                  screenWidth={windowWidth}
                  carouselCardWidth={recurringCarouselCardWidth}
                  onEdit={handleOpenRecurringEdit}
                />
              ) : (
                <EmptyState
                  iconName="repeat-outline"
                  title={t('recurringMeetings.noMeetings')}
                  subtitle={t('recurringMeetings.noMeetingsHint')}
                  actionLabel={canModerateAsAdmin ? t('recurringMeetings.createLink') : undefined}
                  onAction={canModerateAsAdmin ? handleOpenRecurringCreate : undefined}
                  actionVariant="link"
                  actionAccessibilityHint={t('recurringMeetings.createLinkHint')}
                />
              )}
            </View>
          </View>
        ) : null}

        {/* ── Events (cards + RSVP CTA) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('groupEvents.sectionTitle')}</Text>
            {groupEvents.length > 0 ? (
              <Pressable
                onPress={handleSeeAllEvents}
                style={styles.addTopicButton}
                accessibilityLabel={t('groupEvents.seeAll')}
                accessibilityHint={t('groupEvents.seeAll')}
              >
                <Text style={styles.addTopicText}>{t('groupEvents.seeAll')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
              </Pressable>
            ) : null}
          </View>
          {(() => {
            const now = Date.now();
            const upcoming = groupEvents
              .filter((e) => e.status === 'active' && new Date(e.startsAt).getTime() > now)
              .sort(compareGroupEventsByStartThenCreated)
              .slice(0, 3);
            if (upcoming.length === 0) {
              return (
                <EmptyState
                  iconName="calendar-outline"
                  title={t('groupEvents.noEvents')}
                  subtitle={t('groupEvents.noEventsHint')}
                />
              );
            }
            return (
              <View style={[styles.recurringCarouselBleed, { width: windowWidth }]}>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  style={{ width: windowWidth }}
                  showsHorizontalScrollIndicator={Platform.OS === 'android'}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.recurringListHorizontal}
                  accessibilityLabel={t('groupEvents.sectionTitle')}
                >
                  {upcoming.map((ev) => {
                    const openEvent = () =>
                      router.push({
                        pathname: '/group/event/[id]',
                        params: { id: ev.id, fromGroup: '1' },
                      });
                    const ctaLabel = ev.requiresRsvp
                      ? t('groupEvents.rsvpNow')
                      : t('groupEvents.viewDetailsCta');
                    const a11yHint = ev.requiresRsvp
                      ? t('groupEvents.rsvpNowHint')
                      : t('home.opensEventDetail');
                    return (
                      <Pressable
                        key={ev.id}
                        onPress={openEvent}
                        style={({ pressed }) => [
                          styles.eventCard,
                          { width: recurringCarouselCardWidth },
                          pressed && { opacity: 0.92 },
                        ]}
                        accessibilityLabel={`${ev.title}, ${formatGroupEventDateTime(ev.startsAt)}`}
                        accessibilityHint={a11yHint}
                        accessibilityRole="button"
                      >
                        <View style={styles.eventCardContent}>
                          <Text style={styles.eventCardTitle}>{ev.title}</Text>
                          <Text style={styles.eventCardMeta}>
                            {formatGroupEventDateTime(ev.startsAt)}
                          </Text>
                          {ev.requiresRsvp ? (
                            <Text style={styles.eventRsvpLine}>
                              {t('groupEvents.goingCount', {
                                count: ev.goingCount ?? 0,
                              })}
                              {typeof ev.maybeCount === 'number' && ev.maybeCount > 0
                                ? ` · ${t('groupEvents.maybeCount', { count: ev.maybeCount })}`
                                : ''}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.eventCardCta,
                            ev.requiresRsvp ? styles.eventCardCtaRsvp : styles.eventCardCtaMuted,
                          ]}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          <Text
                            style={
                              ev.requiresRsvp
                                ? styles.eventCardCtaTextRsvp
                                : styles.eventCardCtaTextMuted
                            }
                          >
                            {ctaLabel}
                          </Text>
                          <Ionicons
                            name={ev.requiresRsvp ? 'calendar-outline' : 'chevron-forward'}
                            size={18}
                            color={ev.requiresRsvp ? colors.onSecondaryContainer : colors.primary}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })()}
        </View>

        {/* ── Announcements (Stitch “Latest Updates” layout) ── */}
        <View style={styles.section}>
          <View style={styles.latestUpdatesHeader}>
            <Text style={styles.latestUpdatesTitle}>
              {t('announcements.latestUpdatesSectionTitle')}
            </Text>
            {announcements.length > 0 ? (
              <Pressable
                onPress={handleSeeAllAnnouncements}
                style={styles.addTopicButton}
                accessibilityLabel={t('announcements.seeAll')}
                accessibilityHint={t('announcements.seeAll')}
              >
                <Text style={styles.addTopicText}>{t('announcements.seeAll')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
              </Pressable>
            ) : null}
          </View>
          {latestPublished ? (
            <View style={styles.latestUpdatesList}>
              <LatestAnnouncementRow
                title={latestPublished.title}
                body={latestPublished.body}
                createdAt={latestPublished.createdAt}
                onPress={handleOpenLatestAnnouncementDetail}
                meetingLink={latestPublished.meetingLink ?? undefined}
                showMeetingLink={isMember && !!latestPublished.meetingLink?.trim()}
              />
            </View>
          ) : null}
          {!latestPublished ? (
            <EmptyState
              iconName="megaphone-outline"
              title={t('announcements.noAnnouncements')}
              subtitle={t('announcements.noAnnouncementsHint')}
            />
          ) : null}
        </View>

        {/* ── Discussions section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('groups.discussions')}</Text>
            {isMember ? (
              <Pressable
                onPress={handleCreateDiscussion}
                style={styles.addTopicButton}
                accessibilityLabel={t('discussions.addDiscussion')}
                accessibilityHint={t('discussions.addDiscussionHint')}
              >
                <Ionicons name="add-circle" size={16} color={colors.secondary} />
                <Text style={styles.addTopicText}>{t('discussions.addDiscussion')}</Text>
              </Pressable>
            ) : null}
          </View>
          {discussionsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : discussions.length === 0 ? (
            <EmptyState
              iconName="chatbubble-outline"
              title={t('discussions.noDiscussions')}
              subtitle={t('discussions.noDiscussionsHint')}
            />
          ) : (
            <View style={styles.discussionList}>
              {discussions.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/group/discussion/${d.id}`)}
                  style={({ pressed }) => [styles.discussionCard, pressed && { opacity: 0.92 }]}
                  accessibilityLabel={`${d.title}, ${d.postCount ?? 0}`}
                  accessibilityHint={t('groups.opensDiscussion')}
                >
                  <View style={styles.discussionAuthorRow}>
                    <Avatar
                      source={d.authorAvatarUrl ? { uri: d.authorAvatarUrl } : null}
                      fallbackText={d.authorDisplayName}
                      size="sm"
                      accessibilityLabel={
                        d.authorDisplayName
                          ? `${d.authorDisplayName} ${t('groups.profilePicture')}`
                          : t('groups.originalPoster')
                      }
                    />
                    <Text style={styles.discussionMeta} numberOfLines={1}>
                      {d.authorDisplayName ?? t('common.loading')}{' '}
                      <Text style={styles.discussionMetaDot}>{'\u00B7'}</Text>{' '}
                      {formatRelativeTime(d.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.discussionBody} numberOfLines={2}>
                    {d.body}
                  </Text>
                  <View style={styles.discussionFooter}>
                    <View style={styles.discussionStat}>
                      <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                      <Text style={styles.discussionStatText}>{d.postCount ?? 0}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── CTA for non-members ── */}
        {!isMember ? (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaHeading}>{t('groups.readyToJoin')}</Text>
            <Text style={styles.ctaBody}>{t('groups.joinCta', { name: group.name })}</Text>
            <Pressable
              onPress={handleJoin}
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && { transform: [{ scale: 1.03 }] },
                isJoining && { opacity: 0.5 },
              ]}
              disabled={isJoining}
              accessibilityLabel={t('groups.join')}
              accessibilityHint={t('groups.joinsGroupHint')}
              accessibilityRole="button"
            >
              {joinMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.onSecondaryContainer} />
              ) : (
                <Text style={styles.ctaButtonText}>{t('groups.join').toUpperCase()}</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>

      <FadeActionSheet
        visible={joinedSheetVisible}
        onRequestClose={handleCloseJoinedSheet}
        options={[
          {
            icon: 'settings-outline',
            label: t('groups.settingsTitle'),
            onPress: handleManageSettings,
            accessibilityHint: t('groups.opensGroupSettings'),
          },
          {
            icon: 'exit-outline',
            label: t('groups.leaveGroup'),
            onPress: handleLeave,
            destructive: true,
            accessibilityHint: t('groups.leavesGroupHint'),
          },
        ]}
      />

      <GroupEventFormSheet
        visible={eventSheetOpen}
        onRequestClose={handleCloseEventSheet}
        mode="create"
        onSubmit={handleSubmitCreateEvent}
        isSubmitting={createEventMutation.isPending}
        errorMessage={eventFormError}
      />

      <GroupRecurringMeetingFormSheet
        visible={recurringSheetOpen}
        onRequestClose={handleCloseRecurringSheet}
        mode={recurringEdit ? 'edit' : 'create'}
        initialMeeting={recurringEdit ?? undefined}
        onSubmit={handleSubmitRecurring}
        isSubmitting={createRecurringMutation.isPending || updateRecurringMutation.isPending}
        onRequestDelete={recurringEdit ? handleRecurringDeleteRequest : undefined}
        isDeleting={deleteRecurringMutation.isPending}
        errorMessage={recurringFormError}
      />
    </ScrollView>
  );
}

const HERO_HEIGHT = 480;

const editorialShadow = {
  shadowColor: '#151c27',
  shadowOpacity: 0.06,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 15 },
  ...Platform.select({ android: { elevation: 3 } }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  /* ── Hero ── */
  heroWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroPlaceholderBg: {
    backgroundColor: colors.primaryContainer,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.chip,
    marginBottom: spacing.sm,
  },
  typeBadgeText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 34,
    fontWeight: '400',
    color: '#ffffff',
    lineHeight: 40,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  heroDescription: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
    marginBottom: spacing.sm,
    maxWidth: '90%',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  heroMetaText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  heroActionsColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  heroLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroJoinPill: {
    backgroundColor: '#ffffff',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 36,
  },
  heroJoinPillText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  heroJoinedPill: {
    backgroundColor: colors.secondaryContainer,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 36,
  },
  heroJoinedPillText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  heroMembersTapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  heroMemberCountText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  heroAnnounceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── Content canvas ── */
  contentCanvas: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.textPrimary,
  },

  /* ── Section pattern ── */
  section: {
    marginBottom: spacing.sectionGap,
  },
  leadersSection: {
    marginBottom: spacing.sectionGap,
  },
  leadersEmptyInline: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '400',
    color: colors.primary,
    letterSpacing: -0.1,
  },
  sectionCount: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },

  recurringSectionWrap: {
    backgroundColor: 'transparent',
  },
  recurringSacredHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  recurringSacredHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  recurringSacredTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.35,
    color: colors.primary,
  },
  recurringSacredSubtitle: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },
  recurringSacredAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingBottom: 2,
  },
  recurringSacredAddLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recurringListHorizontal: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  recurringCarouselBleed: {
    marginLeft: -spacing.lg,
  },
  recurringCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  recurringCardLight: {
    backgroundColor: colors.surfaceContainerLow,
  },
  recurringCardDark: {
    backgroundColor: colors.primaryContainer,
  },
  recurringCardInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + spacing.xxs,
  },
  recurringCardInnerWithFooter: {
    justifyContent: 'space-between',
  },
  recurringCardBodyPressable: {
    flexGrow: 0,
  },
  recurringCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recurringIconTileLight: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringIconTileDark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringFreqBadge: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  recurringFreqBadgeLight: {
    color: colors.onSurfaceVariant,
  },
  recurringFreqBadgeDark: {
    color: colors.onPrimaryContainer,
  },
  recurringCardTitleLight: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.15,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  recurringCardTitleDark: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.15,
    color: colors.onPrimary,
    marginBottom: spacing.xxs,
  },
  recurringMetaBlock: {
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  recurringMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recurringMetaTextLight: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  recurringMetaTextDark: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.onPrimaryContainer,
    flex: 1,
  },
  recurringPreviewLight: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  recurringPreviewDark: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimaryContainer,
    marginBottom: spacing.xs,
  },
  recurringCtaLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(0, 32, 70, 0.05)',
  },
  recurringCtaDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.secondaryContainer,
  },
  recurringCtaTextLight: {
    fontFamily: fontFamily.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  recurringCtaTextDark: {
    fontFamily: fontFamily.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },

  /* ── Discussions ── */
  addTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  addTopicText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  /** Stitch “Latest Updates” row layout (announcements) */
  latestUpdatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  latestUpdatesTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.1,
    flex: 1,
    marginRight: spacing.md,
  },
  latestUpdatesList: {
    gap: spacing.xxs,
  },
  eventCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...editorialShadow,
    borderCurve: 'continuous',
  },
  eventCardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  eventCardTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '400',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  eventCardMeta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xxs,
  },
  eventRsvpLine: {
    ...typography.caption,
    color: colors.secondary,
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
  },
  eventCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderCurve: 'continuous',
  },
  eventCardCtaRsvp: {
    backgroundColor: colors.secondaryContainer,
  },
  eventCardCtaMuted: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.recurringMeetingCardDivider,
  },
  eventCardCtaTextRsvp: {
    fontFamily: fontFamily.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  eventCardCtaTextMuted: {
    fontFamily: fontFamily.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  discussionList: {
    gap: spacing.md,
  },
  discussionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...editorialShadow,
  },
  discussionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  discussionMeta: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  discussionMetaDot: {
    color: colors.outlineVariant,
  },
  discussionBody: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  discussionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discussionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  discussionStatText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ── CTA (non-member) ── */
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  ctaHeading: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '400',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ctaBody: {
    ...typography.bodyMd,
    color: 'rgba(174,199,247,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  ctaButton: {
    backgroundColor: colors.secondaryContainer,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl + spacing.xs,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
  ctaButtonText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
    letterSpacing: 0.5,
  },
});

function recurringFrequencyLabel(freq: GroupRecurringMeeting['recurrenceFrequency']): string {
  switch (freq) {
    case 'weekly':
      return t('recurringMeetings.frequencyWeekly');
    case 'biweekly':
      return t('recurringMeetings.frequencyBiweekly');
    case 'monthly_nth':
      return t('recurringMeetings.frequencyMonthlyNth');
    default:
      return t('recurringMeetings.frequencyWeekly');
  }
}

function recurringKindIcon(
  freq: GroupRecurringMeeting['recurrenceFrequency']
): keyof typeof Ionicons.glyphMap {
  switch (freq) {
    case 'weekly':
      return 'home-outline';
    case 'biweekly':
      return 'repeat-outline';
    case 'monthly_nth':
      return 'people-outline';
    default:
      return 'calendar-outline';
  }
}

/** Match Stitch schedule copy: middle dot → bullet. */
function formatSacredScheduleLine(primaryLine: string): string {
  return primaryLine.replace(/\s*·\s*/g, ' • ');
}

interface RecurringMeetingsListProps {
  meetings: GroupRecurringMeeting[];
  viewerTimeZone: string;
  canModerateAsAdmin: boolean;
  isMember: boolean;
  screenWidth: number;
  carouselCardWidth: number;
  onEdit: (meeting: GroupRecurringMeeting) => void;
}

function RecurringMeetingsList({
  meetings,
  viewerTimeZone,
  canModerateAsAdmin,
  isMember,
  screenWidth,
  carouselCardWidth,
  onEdit,
}: RecurringMeetingsListProps) {
  return (
    <View style={[styles.recurringCarouselBleed, { width: screenWidth }]}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        style={{ width: screenWidth }}
        showsHorizontalScrollIndicator={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.recurringListHorizontal}
        accessibilityLabel={t('recurringMeetings.sectionTitle')}
      >
        {meetings.map((rm, index) => {
          const { primaryLine } = formatRecurringMeetingSummary(rm, viewerTimeZone);
          const scheduleLine = formatSacredScheduleLine(primaryLine);
          const canEditRecurring = canModerateAsAdmin;
          const isDark = index % 2 === 1;
          const freqLabel = recurringFrequencyLabel(rm.recurrenceFrequency);
          const kindIcon = recurringKindIcon(rm.recurrenceFrequency);
          const meetingUrl = rm.meetingLink?.trim();
          const hasLink = isMember && !!meetingUrl;
          const metaIconColor = isDark ? colors.onPrimaryContainer : colors.onSurfaceVariant;
          const iconTileColor = isDark ? colors.onPrimary : colors.onSecondaryContainer;

          return (
            <View
              key={rm.id}
              style={[
                styles.recurringCard,
                isDark ? styles.recurringCardDark : styles.recurringCardLight,
                editorialShadow,
                { width: carouselCardWidth },
              ]}
            >
              <View
                style={[
                  styles.recurringCardInner,
                  hasLink ? styles.recurringCardInnerWithFooter : null,
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (canEditRecurring) onEdit(rm);
                  }}
                  disabled={!canEditRecurring}
                  style={({ pressed }) => [
                    styles.recurringCardBodyPressable,
                    canEditRecurring && pressed ? { opacity: 0.92 } : null,
                  ]}
                  accessibilityLabel={rm.title}
                  accessibilityHint={
                    canEditRecurring ? t('recurringMeetings.sheetEdit') : scheduleLine
                  }
                >
                  <View style={styles.recurringCardTopRow}>
                    <View
                      style={isDark ? styles.recurringIconTileDark : styles.recurringIconTileLight}
                    >
                      <Ionicons name={kindIcon} size={22} color={iconTileColor} />
                    </View>
                    <Text
                      style={[
                        styles.recurringFreqBadge,
                        isDark ? styles.recurringFreqBadgeDark : styles.recurringFreqBadgeLight,
                      ]}
                    >
                      {freqLabel}
                    </Text>
                  </View>

                  <Text
                    style={isDark ? styles.recurringCardTitleDark : styles.recurringCardTitleLight}
                  >
                    {rm.title}
                  </Text>

                  <View style={styles.recurringMetaBlock}>
                    <View style={styles.recurringMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={metaIconColor} />
                      <Text
                        style={
                          isDark ? styles.recurringMetaTextDark : styles.recurringMetaTextLight
                        }
                      >
                        {scheduleLine}
                      </Text>
                    </View>
                    {rm.location?.trim() ? (
                      <View style={styles.recurringMetaRow}>
                        <Ionicons name="location-outline" size={16} color={metaIconColor} />
                        <Text
                          style={
                            isDark ? styles.recurringMetaTextDark : styles.recurringMetaTextLight
                          }
                          numberOfLines={2}
                        >
                          {rm.location}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {rm.description?.trim() ? (
                    <Text
                      style={isDark ? styles.recurringPreviewDark : styles.recurringPreviewLight}
                      numberOfLines={1}
                    >
                      {rm.description}
                    </Text>
                  ) : null}
                </Pressable>

                {hasLink && meetingUrl ? (
                  <Pressable
                    onPress={() => {
                      void WebBrowser.openBrowserAsync(meetingUrl);
                    }}
                    style={({ pressed }) => [
                      isDark ? styles.recurringCtaDark : styles.recurringCtaLight,
                      pressed ? { opacity: 0.9 } : null,
                    ]}
                    accessibilityLabel={t('groupEvents.joinMeeting')}
                    accessibilityHint={t('groupEvents.joinMeetingHint')}
                    accessibilityRole="link"
                  >
                    <Text
                      style={isDark ? styles.recurringCtaTextDark : styles.recurringCtaTextLight}
                    >
                      {t('groupEvents.joinMeeting')}
                    </Text>
                    {isDark ? (
                      <Ionicons
                        name="videocam-outline"
                        size={16}
                        color={colors.onSecondaryContainer}
                      />
                    ) : (
                      <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
