import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ReflectionPlate } from '@/components/patterns/ReflectionPlate';
import { SectionHeader } from '@/components/patterns/SectionHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { JoinedGroupUpcomingEventCard } from '@/components/patterns/JoinedGroupUpcomingEventCard';
import { GlobalAnnouncementCard } from '@/components/patterns/GlobalAnnouncementCard';
import { GlobalAnnouncementFormSheet } from '@/components/patterns/GlobalAnnouncementFormSheet';
import { LatestAnnouncementRow } from '@/components/patterns/LatestAnnouncementRow';
import { MyVerseWeekCard } from '@/components/patterns/MyVerseWeekCard';
import { useAuth } from '@/hooks/useAuth';
import {
  useProfileQuery,
  useGroupsForUserQuery,
  useCreateGlobalAnnouncementMutation,
  useDailyVersesQuery,
  useDeleteGlobalAnnouncementMutation,
  useGlobalAnnouncementsQuery,
  useIsSuperAdminQuery,
  useLatestPublishedAnnouncementsPerJoinedGroupQuery,
  useMyEventRsvpsMapForEventsQuery,
  useUpdateGlobalAnnouncementMutation,
  useUpcomingJoinedGroupEventsQuery,
} from '@/hooks/useApiQueries';
import { useLocale } from '@/contexts/LocaleContext';
import { VERSE_ATTRIBUTION, verseForDay } from '@/lib/dailyVerse';
import { groupTypeLabel } from '@/lib/groupTypes';
import { t } from '@/lib/i18n';
import { isApiError, type Group } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import { confirm, notify } from '@/lib/dialogs';
import type { JoinedGroupUpcomingEventRow } from '@/lib/upcomingJoinedGroupEvents';
import { SIDEBAR_WIDTH } from '@/components/navigation/DesktopSidebar';
import {
  breakpoints,
  colors,
  fontFamily,
  radius,
  spacing,
  tabScreenContent,
  typography,
} from '@/theme/tokens';

/** Narrower than this and a quadrant drops onto its own row instead of sharing one. */
const QUADRANT_MIN_WIDTH = 380;
/** Home shows the newest one; "see all" has the rest. */
const LATEST_UPDATES_ON_HOME = 1;
/** Group cards inside one quadrant. */
const GROUPS_PER_ROW = 2;
const GROUP_CARD_MIN_WIDTH = 200;

/** How much room the content has, once the desktop sidebar has taken its share. */
function useHomeContentWidth() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return width;
  const sidebar = width >= breakpoints.sidebar ? SIDEBAR_WIDTH : 0;
  return Math.min(width - sidebar, tabScreenContent.maxWidth);
}

/**
 * True when the grid puts two quadrants on a row. The welcome row asks the same question, so the
 * week card sits beside the welcome exactly when there is a right-hand column for it to sit in.
 */
function useTwoColumnHome() {
  const content = useHomeContentWidth();
  return Platform.OS === 'web' && content >= QUADRANT_MIN_WIDTH * 2;
}

/** Sizes a group card so a full row of them fills the quadrant it sits in. */
function useGroupCardWidth() {
  const content = useHomeContentWidth();
  const twoColumn = useTwoColumnHome();
  if (Platform.OS !== 'web') return GROUP_CARD_MIN_WIDTH;
  const quadrant = twoColumn ? content / 2 : content;
  const usable = quadrant - spacing.screenHorizontal * 2 - spacing.md * (GROUPS_PER_ROW - 1);
  return Math.max(GROUP_CARD_MIN_WIDTH, Math.floor(usable / GROUPS_PER_ROW));
}
const GROUP_CARD_IMAGE_HEIGHT = 120;
/** A cover with no banner behind it is a touch shorter than a photo. */
const GROUP_CARD_COVER_HEIGHT = 108;
const UPCOMING_EVENT_CARD_WIDTH = 300;

function GroupCarouselCard({ group }: { group: Group }) {
  const { push } = useRouter();
  const width = useGroupCardWidth();

  return (
    <Pressable
      onPress={() => push(`/group/${group.id}`)}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      accessibilityLabel={`${group.name}`}
      accessibilityHint={t('home.opensGroup')}
    >
      <View style={[carouselStyles.card, { width }]}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={carouselStyles.image}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          // No banner: the cover carries the group's own name instead of a generic icon.
          <View style={carouselStyles.coverPlain}>
            <Text style={carouselStyles.coverName} numberOfLines={2}>
              {group.name}
            </Text>
          </View>
        )}

        <View style={carouselStyles.info}>
          <Text style={carouselStyles.name} numberOfLines={2}>
            {group.name}
          </Text>
          <View style={carouselStyles.meta}>
            <View style={carouselStyles.typeChip}>
              <Text style={carouselStyles.type}>{groupTypeLabel(group.type)}</Text>
            </View>
            {group.memberCount != null ? (
              <View style={carouselStyles.memberRow}>
                <Ionicons name="people" size={12} color={colors.onSurfaceVariant} />
                <Text style={carouselStyles.memberCount}>{group.memberCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const userId = session?.user?.id;
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [globalFormError, setGlobalFormError] = useState<string | null>(null);
  const [editingGlobalId, setEditingGlobalId] = useState<string | null>(null);

  const { data: profile } = useProfileQuery(userId);
  const { data: myGroups = [], isLoading: groupsLoading } = useGroupsForUserQuery(userId);
  const {
    data: upcomingEvents = [],
    isLoading: upcomingLoading,
    isError: upcomingIsError,
    error: upcomingError,
  } = useUpcomingJoinedGroupEventsQuery(myGroups, userId);
  const {
    data: latestAnnouncements = [],
    isLoading: latestAnnouncementsLoading,
    isError: latestAnnouncementsIsError,
    error: latestAnnouncementsError,
  } = useLatestPublishedAnnouncementsPerJoinedGroupQuery(myGroups, userId);
  const rsvpByEventId = useMyEventRsvpsMapForEventsQuery(userId, upcomingEvents);

  const { data: isSuperAdmin = false, isLoading: superAdminRoleLoading } = useIsSuperAdminQuery(
    userId,
    { enabled: !!userId }
  );
  const {
    data: globalAnnouncements = [],
    isLoading: globalAnnouncementsLoading,
    isError: globalAnnouncementsIsError,
    error: globalAnnouncementsError,
  } = useGlobalAnnouncementsQuery(userId, { enabled: !!userId, limit: 10 });
  const createGlobalAnnouncementMutation = useCreateGlobalAnnouncementMutation();
  const updateGlobalAnnouncementMutation = useUpdateGlobalAnnouncementMutation();
  const deleteGlobalAnnouncementMutation = useDeleteGlobalAnnouncementMutation();

  // The same sheet writes a new announcement and edits an existing one; this says which.
  const editingGlobal = globalAnnouncements.find((ga) => ga.id === editingGlobalId) ?? null;

  const handleGlobalAnnouncementSubmit = useCallback(
    async (payload: { title: string; description: string }) => {
      if (!userId) return;
      setGlobalFormError(null);
      try {
        if (editingGlobalId) {
          await updateGlobalAnnouncementMutation.mutateAsync({
            announcementId: editingGlobalId,
            input: payload,
          });
        } else {
          await createGlobalAnnouncementMutation.mutateAsync({ userId, input: payload });
        }
        setGlobalSheetOpen(false);
        setEditingGlobalId(null);
      } catch (e) {
        setGlobalFormError(e != null && isApiError(e) ? getUserFacingError(e) : t('common.error'));
      }
    },
    [userId, editingGlobalId, createGlobalAnnouncementMutation, updateGlobalAnnouncementMutation]
  );

  const handleGlobalAnnouncementDelete = useCallback(
    async (announcementId: string) => {
      const ok = await confirm({
        title: t('home.deleteGlobalAnnouncement'),
        message: t('home.deleteGlobalAnnouncementConfirm'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteGlobalAnnouncementMutation.mutateAsync({ announcementId });
      } catch (e) {
        void notify({
          title: t('common.error'),
          message: e != null && isApiError(e) ? getUserFacingError(e) : t('common.error'),
        });
      }
    },
    [deleteGlobalAnnouncementMutation]
  );

  const displayName =
    profile && 'firstName' in profile && profile.firstName
      ? profile.firstName
      : profile && 'displayName' in profile && profile.displayName
        ? profile.displayName
        : undefined;

  const { data: dailyVerses = [] } = useDailyVersesQuery(locale);
  // Falls back to the verse the app shipped with while the list is empty.
  const todaysVerse = useMemo(() => verseForDay(dailyVerses), [dailyVerses]);

  const twoColumn = useTwoColumnHome();
  // Beside the welcome when there is a right-hand column; under the verse card when there is not.
  const myVerseWeek = userId ? <MyVerseWeekCard userId={userId} verse={todaysVerse} /> : null;

  const renderGroupItem = ({ item }: { item: Group }) => <GroupCarouselCard group={item} />;

  const renderUpcomingEventItem = useCallback(
    ({ item }: { item: JoinedGroupUpcomingEventRow }) => (
      <JoinedGroupUpcomingEventCard
        event={item}
        width={UPCOMING_EVENT_CARD_WIDTH}
        rsvpResponse={rsvpByEventId.get(item.id) ?? null}
      />
    ),
    [rsvpByEventId]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(300)} style={tabScreenContent}>
        {/* Header */}
        <View style={twoColumn ? styles.headerRow : undefined}>
          <View style={twoColumn ? styles.headerColumn : undefined}>
            <View style={styles.header}>
              <Text style={styles.welcomeText}>
                {displayName ? `${t('home.welcomeBack')}` : t('home.welcomeDefault')}
              </Text>
              {displayName ? <Text style={styles.nameText}>{displayName}.</Text> : null}
            </View>

            {/* Composing a platform-wide announcement. The announcements themselves are in
                Latest updates just below, with everything else worth reading. Inside the left
                column so the week card beside it cannot push it down. */}
            {userId ? (
              <View style={styles.sectionPadded}>
                {!superAdminRoleLoading && isSuperAdmin ? (
                  <Pressable
                    onPress={() => {
                      setGlobalFormError(null);
                      setEditingGlobalId(null);
                      setGlobalSheetOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.globalAnnouncementLinkRow,
                      pressed && { opacity: 0.78 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.postGlobalAnnouncementLink')}
                    accessibilityHint={t('home.postGlobalAnnouncementHint')}
                  >
                    <Ionicons name="globe-outline" size={17} color={colors.accent} />
                    <Text style={styles.globalAnnouncementLinkText}>
                      {t('home.postGlobalAnnouncementLink')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {twoColumn ? (
            <View style={[styles.headerColumn, styles.sectionPadded, styles.headerNote]}>
              {myVerseWeek}
            </View>
          ) : null}
        </View>

        <GlobalAnnouncementFormSheet
          visible={globalSheetOpen}
          onRequestClose={() => {
            setGlobalSheetOpen(false);
            setEditingGlobalId(null);
          }}
          onSubmit={handleGlobalAnnouncementSubmit}
          isSubmitting={
            createGlobalAnnouncementMutation.isPending || updateGlobalAnnouncementMutation.isPending
          }
          errorMessage={globalFormError}
          initialValues={editingGlobal}
        />

        {/* A platform-wide announcement is addressed to everyone, so it sits across the top
            rather than inside one quadrant. */}
        {globalAnnouncementsIsError ? (
          <View style={styles.sectionPadded}>
            <Text style={styles.inlineError} accessibilityLiveRegion="polite">
              {globalAnnouncementsError != null && isApiError(globalAnnouncementsError)
                ? getUserFacingError(globalAnnouncementsError)
                : t('common.error')}
            </Text>
          </View>
        ) : globalAnnouncements.length > 0 ? (
          <View style={[styles.sectionPadded, styles.globalAnnouncementStack]}>
            {globalAnnouncements.map((ga) => (
              <GlobalAnnouncementCard
                key={ga.id}
                title={ga.title}
                description={ga.description}
                onEdit={
                  isSuperAdmin
                    ? () => {
                        setGlobalFormError(null);
                        setEditingGlobalId(ga.id);
                        setGlobalSheetOpen(true);
                      }
                    : undefined
                }
                onDelete={
                  isSuperAdmin ? () => void handleGlobalAnnouncementDelete(ga.id) : undefined
                }
              />
            ))}
          </View>
        ) : null}

        <View style={styles.grid}>
          {/* My Groups — horizontal scroll */}
          <View style={styles.quadrant}>
            <View style={styles.sectionPadded}>
              <SectionHeader
                title={t('home.yourGroups')}
                actionLabel={myGroups.length > 0 ? t('home.seeAll') : undefined}
                onAction={
                  myGroups.length > 0
                    ? () => router.navigate('/(tabs)/groups?filter=joined')
                    : undefined
                }
              />
            </View>

            {groupsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : myGroups.length === 0 ? (
              <View style={styles.sectionPadded}>
                <EmptyState
                  iconName="people-outline"
                  title={t('home.noGroupsYet')}
                  subtitle={t('home.noGroupsSubtitle')}
                  actionLabel={t('home.browseGroups')}
                  onAction={() => router.navigate('/(tabs)/groups')}
                />
              </View>
            ) : (
              <FlatList
                data={myGroups}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                ItemSeparatorComponent={() => <View style={styles.carouselSeparator} />}
                scrollEnabled
              />
            )}
          </View>

          {/* The day's passage sits beside the groups, not at the bottom of the scroll. */}
          <View style={styles.quadrant}>
            <View style={styles.sectionPadded}>
              <SectionHeader title={t('home.reflectionTitle')} />
              <ReflectionPlate
                quote={todaysVerse ? `“${todaysVerse.passage}”` : t('home.reflectionQuote')}
                attribution={
                  todaysVerse ? `— ${todaysVerse.reference}` : t('home.reflectionAttribution')
                }
                source={todaysVerse ? VERSE_ATTRIBUTION : undefined}
                variant="dark"
              />
              {twoColumn ? null : <View style={styles.stackedNote}>{myVerseWeek}</View>}
            </View>
          </View>

          {/* The latest published announcement from each joined group. Only the newest one is
            shown here — the rest are one tap away, counted on the header. */}
          <View style={styles.quadrant}>
            <View style={styles.sectionPadded}>
              <SectionHeader
                title={t('announcements.latestUpdatesSectionTitle')}
                badge={Math.max(0, latestAnnouncements.length - LATEST_UPDATES_ON_HOME)}
                actionLabel={latestAnnouncements.length > 0 ? t('home.seeAll') : undefined}
                onAction={
                  latestAnnouncements.length > 0 ? () => router.push('/announcements') : undefined
                }
              />
            </View>
            {globalAnnouncementsLoading || latestAnnouncementsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : latestAnnouncementsIsError ? (
              <View style={styles.sectionPadded}>
                <Text style={styles.inlineError} accessibilityLiveRegion="polite">
                  {latestAnnouncementsError != null && isApiError(latestAnnouncementsError)
                    ? getUserFacingError(latestAnnouncementsError)
                    : t('common.error')}
                </Text>
              </View>
            ) : latestAnnouncements.length === 0 ? (
              <View style={styles.sectionPadded}>
                <EmptyState
                  iconName="megaphone-outline"
                  title={t('announcements.noAnnouncements')}
                  subtitle={t('announcements.noAnnouncementsHint')}
                />
              </View>
            ) : (
              <View style={[styles.sectionPadded, styles.latestUpdatesList]}>
                {latestAnnouncements.slice(0, LATEST_UPDATES_ON_HOME).map((item) => (
                  <View key={item.id} style={styles.latestUpdateBlock}>
                    <LatestAnnouncementRow
                      tagLabel={item.groupName}
                      title={item.title}
                      body={item.body}
                      createdAt={item.createdAt}
                      onPress={() =>
                        router.push(
                          `/group/announcement/${item.id}?groupId=${encodeURIComponent(item.groupId)}`
                        )
                      }
                      accessibilityLabel={`${item.groupName}. ${item.title}`}
                      meetingLink={item.meetingLink ?? undefined}
                      showMeetingLink={!!item.meetingLink?.trim()}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Upcoming events from joined groups */}
          <View style={styles.quadrant}>
            <View style={styles.sectionPadded}>
              <SectionHeader
                title={t('home.upcomingEvents')}
                actionLabel={
                  !upcomingLoading && !upcomingIsError && upcomingEvents.length > 0
                    ? t('home.seeAll')
                    : undefined
                }
                onAction={
                  !upcomingLoading && !upcomingIsError && upcomingEvents.length > 0
                    ? () => router.push('/upcoming-events')
                    : undefined
                }
              />
            </View>
            {upcomingLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : upcomingIsError ? (
              <View style={styles.sectionPadded}>
                <Text style={styles.inlineError} accessibilityLiveRegion="polite">
                  {upcomingError != null && isApiError(upcomingError)
                    ? getUserFacingError(upcomingError)
                    : t('common.error')}
                </Text>
              </View>
            ) : upcomingEvents.length === 0 ? (
              <View style={styles.sectionPadded}>
                <Text style={styles.emptyUpcomingTitle}>{t('home.noUpcomingEvents')}</Text>
                <Text style={styles.emptyUpcomingSub}>{t('home.noUpcomingEventsSubtitle')}</Text>
              </View>
            ) : (
              <FlatList
                data={upcomingEvents}
                renderItem={renderUpcomingEventItem}
                keyExtractor={(item) => item.id}
                extraData={rsvpByEventId}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                ItemSeparatorComponent={() => <View style={styles.carouselSeparator} />}
                scrollEnabled
              />
            )}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },

  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  welcomeText: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 43,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  nameText: {
    fontFamily: fontFamily.serifBold,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 43,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },

  sectionPadded: {
    paddingHorizontal: spacing.screenHorizontal,
  },

  /** The welcome and the week card share the top row when the grid has two columns. */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerColumn: {
    flexGrow: 1,
    flexBasis: QUADRANT_MIN_WIDTH,
    minWidth: QUADRANT_MIN_WIDTH,
    maxWidth: '100%',
  },
  headerNote: {
    paddingTop: spacing.lg,
  },
  stackedNote: {
    marginTop: spacing.md,
  },

  /**
   * Two cards across on a desktop row, one below the other on a phone. Each quadrant keeps its
   * own horizontal padding, so the gutter between columns is the two paddings meeting.
   */
  // Each quadrant's SectionHeader already carries its own top margin, so the grid adds none of
  // its own — two stacked 24s read as a gap twice the size the rows need.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quadrant: {
    flexGrow: 1,
    flexBasis: QUADRANT_MIN_WIDTH,
    minWidth: QUADRANT_MIN_WIDTH,
    maxWidth: '100%',
  },

  // An outlined button, sized to its own content so it never stretches across the screen.
  globalAnnouncementLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  globalAnnouncementLinkText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
  },
  globalAnnouncementStack: {
    gap: spacing.md,
  },

  reflectionSection: {
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.sectionGap,
  },

  upcomingSection: {
    marginTop: spacing.sectionGap,
  },

  latestUpdatesSection: {
    marginTop: spacing.lg,
  },
  latestUpdatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  latestUpdatesTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 19,
    fontWeight: '600',
    color: colors.onSurface,
    letterSpacing: -0.1,
    flex: 1,
    marginRight: spacing.md,
  },
  latestUpdatesList: {
    gap: spacing.md,
  },
  latestUpdateBlock: {
    gap: spacing.xxs,
  },

  emptyUpcomingTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.xxs,
  },
  emptyUpcomingSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  inlineError: {
    ...typography.bodyMd,
    color: colors.error,
  },

  loadingRow: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  carouselContent: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  carouselSeparator: {
    width: spacing.md,
  },
});

const carouselStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: GROUP_CARD_IMAGE_HEIGHT,
  },
  coverPlain: {
    width: '100%',
    height: GROUP_CARD_COVER_HEIGHT,
    backgroundColor: colors.accent,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  coverName: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.onAccent,
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeChip: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.chip,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  type: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    color: colors.accent,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  memberCount: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
