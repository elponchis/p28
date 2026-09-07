/**
 * Watch: every video this person is allowed to see, in one place.
 *
 * The shelves are the access rules made visible — the courses that came with a group they belong
 * to, then the ones open to everyone. Nothing here decides who sees what: the read policy already
 * returned only the courses this user may watch, so a course that belongs to someone else's
 * training school, or whose term has ended, is simply not in the list. How they divide up lives
 * in lib/watchShelves.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/patterns/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdminQuery, useWatchCoursesQuery } from '@/hooks/useApiQueries';
import type { WatchCourse } from '@/lib/api';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { watchCardWidth } from '@/lib/watchGrid';
import { buildShelves } from '@/lib/watchShelves';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

function CourseCard({
  course,
  width,
  onPress,
}: {
  course: WatchCourse;
  /** Undefined until the shelf has measured itself; the card keeps its own width until then. */
  width?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width !== undefined && { width },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={course.title}
      accessibilityHint={t('watch.openCourseHint')}
    >
      <View style={styles.cover}>
        {course.coverImageUrl ? (
          <Image
            source={{ uri: course.coverImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="play-circle-outline" size={32} color={colors.onSurfaceVariant} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.cardMeta}>{t('watch.videoCount', { count: course.lessonCount })}</Text>
      </View>
    </Pressable>
  );
}

export default function WatchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: courses = [], isLoading, isError, error, refetch } = useWatchCoursesQuery();
  // The shelf already shows admins their unpublished courses; this is the way to act on them.
  const { data: isAdmin } = useIsAdminQuery(session?.user?.id);

  const shelves = useMemo(() => buildShelves(courses), [courses]);

  // Measured rather than derived from the window: on the web the sidebar takes a slice of it, and
  // how big a slice is the sidebar's business, not this screen's.
  const [shelfWidth, setShelfWidth] = useState(0);
  const measureShelf = useCallback((e: LayoutChangeEvent) => {
    setShelfWidth(e.nativeEvent.layout.width);
  }, []);
  const cardWidth = watchCardWidth(shelfWidth, spacing.md);

  if (isLoading && courses.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error && 'message' in error ? getUserFacingError(error) : t('common.error')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {isAdmin ? (
        <Pressable
          onPress={() => router.push('/watch/manage')}
          style={({ pressed }) => [styles.manageRow, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={t('watchAdmin.title')}
          accessibilityHint={t('watchAdmin.manageHint')}
        >
          <Ionicons name="settings-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.manageText}>{t('watchAdmin.title')}</Text>
        </Pressable>
      ) : null}
      <View style={styles.grid} onLayout={measureShelf}>
        {shelves.length === 0 ? (
          <EmptyState
            iconName="play-circle-outline"
            title={t('watch.emptyTitle')}
            subtitle={t('watch.emptyDescription')}
          />
        ) : (
          shelves.map((shelf) => (
            <View key={shelf.key} style={styles.shelf}>
              <View style={styles.shelfHeader}>
                <Text style={styles.shelfTitle}>{shelf.title}</Text>
                {shelf.isTrainingSchool ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t('watch.trainingSchool')}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cards}>
                {shelf.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    width={cardWidth}
                    onPress={() => router.push(`/watch/${course.id}`)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
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
    gap: spacing.xl,
    width: '100%',
    // Wider than the 720 a tab of text gets: thumbnails are what this screen is, and a desktop
    // has the room for five. Still bounded, so an ultrawide monitor does not get one long row.
    maxWidth: 1440,
    alignSelf: 'center',
  },
  grid: {
    gap: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  retry: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  retryText: {
    ...typography.body,
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
  },
  manageText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  shelf: {
    gap: spacing.md,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shelfTitle: {
    ...typography.h3,
    color: colors.onSurface,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.secondaryContainer,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.onSecondaryContainer,
    fontFamily: fontFamily.sansSemiBold,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.ghostBorder,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cover: {
    // 16:9, so a card that grows with the row keeps its shape.
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: {
    ...typography.body,
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
