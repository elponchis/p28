import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useAuth } from '@/hooks/useAuth';
import {
  useProfileQuery,
  useGroupsForUserQuery,
  useCreateGlobalAnnouncementMutation,
  useGlobalAnnouncementsQuery,
  useIsSuperAdminQuery,
  useLatestPublishedAnnouncementsPerJoinedGroupQuery,
  useMyEventRsvpsMapForEventsQuery,
  useUpcomingJoinedGroupEventsQuery,
} from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { isApiError, type Group } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import type { JoinedGroupUpcomingEventRow } from '@/lib/upcomingJoinedGroupEvents';
import { colors, fontFamily, radius, spacing, typography, shadow } from '@/theme/tokens';

const GROUP_CARD_WIDTH = 200;
const GROUP_CARD_IMAGE_HEIGHT = 120;
const UPCOMING_EVENT_CARD_WIDTH = 300;

function GroupCarouselCard({ group }: { group: Group }) {
  const { push } = useRouter();

  return (
    <Pressable
      onPress={() => push(`/group/${group.id}`)}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      accessibilityLabel={`${group.name}`}
      accessibilityHint={t('home.opensGroup')}
    >
      <View style={carouselStyles.card}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={carouselStyles.image}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[carouselStyles.image, carouselStyles.imagePlaceholder]}>
            <Ionicons name="people-outline" size={28} color={colors.outlineVariant} />
          </View>
        )}

        <View style={carouselStyles.info}>
          <Text style={carouselStyles.name} numberOfLines={2}>
            {group.name}
          </Text>
          <View style={carouselStyles.meta}>
            <Text style={carouselStyles.type}>
              {group.type === 'forum' ? t('groups.forum') : t('groups.ministry')}
            </Text>
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
  const router = useRouter();
  const userId = session?.user?.id;
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [globalFormError, setGlobalFormError] = useState<string | null>(null);

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

  const handleGlobalAnnouncementSubmit = useCallback(
    async (payload: { title: string; description: string }) => {
      if (!userId) return;
      setGlobalFormError(null);
      try {
        await createGlobalAnnouncementMutation.mutateAsync({ userId, input: payload });
        setGlobalSheetOpen(false);
      } catch (e) {
        setGlobalFormError(e != null && isApiError(e) ? getUserFacingError(e) : t('common.error'));
      }
    },
    [userId, createGlobalAnnouncementMutation]
  );

  const displayName =
    profile && 'firstName' in profile && profile.firstName
      ? profile.firstName
      : profile && 'displayName' in profile && profile.displayName
        ? profile.displayName
        : undefined;

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
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            {displayName ? `${t('home.welcomeBack')}` : t('home.welcomeDefault')}
          </Text>
          {displayName ? <Text style={styles.nameText}>{displayName}.</Text> : null}
        </View>

        {/* Platform global announcements + super-admin compose */}
        {userId ? (
          <View style={styles.sectionPadded}>
            {!superAdminRoleLoading && isSuperAdmin ? (
              <Pressable
                onPress={() => {
                  setGlobalFormError(null);
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
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={styles.globalAnnouncementLinkText}>
                  {t('home.postGlobalAnnouncementLink')}
                </Text>
              </Pressable>
            ) : null}
            {globalAnnouncementsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : globalAnnouncementsIsError ? (
              <Text style={styles.inlineError} accessibilityLiveRegion="polite">
                {globalAnnouncementsError != null && isApiError(globalAnnouncementsError)
                  ? getUserFacingError(globalAnnouncementsError)
                  : t('common.error')}
              </Text>
            ) : globalAnnouncements.length > 0 ? (
              <View style={styles.globalAnnouncementStack}>
                {globalAnnouncements.map((ga) => (
                  <GlobalAnnouncementCard
                    key={ga.id}
                    title={ga.title}
                    description={ga.description}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <GlobalAnnouncementFormSheet
          visible={globalSheetOpen}
          onRequestClose={() => setGlobalSheetOpen(false)}
          onSubmit={handleGlobalAnnouncementSubmit}
          isSubmitting={createGlobalAnnouncementMutation.isPending}
          errorMessage={globalFormError}
        />

        {/* My Groups — horizontal scroll */}
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

        {/* Latest published announcement per joined group */}
        {myGroups.length > 0 ? (
          <View style={styles.latestUpdatesSection}>
            <View style={styles.sectionPadded}>
              <View style={styles.latestUpdatesHeader}>
                <Text style={styles.latestUpdatesTitle}>
                  {t('announcements.latestUpdatesSectionTitle')}
                </Text>
              </View>
            </View>
            {latestAnnouncementsLoading ? (
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
                {latestAnnouncements.map((item) => (
                  <View key={item.id} style={styles.latestUpdateBlock}>
                    <Text style={styles.latestUpdateGroupLabel} numberOfLines={1}>
                      {item.groupName}
                    </Text>
                    <LatestAnnouncementRow
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
        ) : null}

        {/* Upcoming events from joined groups */}
        {myGroups.length > 0 ? (
          <View style={styles.upcomingSection}>
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
        ) : null}

        {/* Reflection Plate */}
        <View style={styles.reflectionSection}>
          <ReflectionPlate
            quote={t('home.reflectionQuote')}
            attribution={t('home.reflectionAttribution')}
            variant="dark"
          />
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
    paddingBottom: spacing.md,
  },
  welcomeText: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  nameText: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: -0.2,
    color: colors.primary,
  },

  sectionPadded: {
    paddingHorizontal: spacing.screenHorizontal,
  },

  globalAnnouncementLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  globalAnnouncementLinkText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
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
    marginTop: spacing.sectionGap,
  },
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
    gap: spacing.md,
  },
  latestUpdateBlock: {
    gap: spacing.xxs,
  },
  latestUpdateGroupLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xxs,
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
    width: GROUP_CARD_WIDTH,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadow.ambient,
  },
  image: {
    width: '100%',
    height: GROUP_CARD_IMAGE_HEIGHT,
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  type: {
    ...typography.labelSm,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  memberCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
