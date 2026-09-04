/**
 * Watch: every video this person is allowed to see, in one place.
 *
 * The shelves are the access rules made visible — open videos anyone signed in can watch, and
 * below them the courses that came with a group they belong to. Nothing here decides who sees
 * what: the read policy already returned only the courses this user may watch, so a course that
 * belongs to someone else's training school, or whose term has ended, is simply not in the list.
 */
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/patterns/EmptyState';
import { useWatchCoursesQuery } from '@/hooks/useApiQueries';
import type { WatchCourse } from '@/lib/api';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, tabScreenContent, typography } from '@/theme/tokens';

interface Shelf {
  key: string;
  title: string;
  /** Named on the shelf so a training school reads as one, rather than as a group of videos. */
  isTrainingSchool: boolean;
  courses: WatchCourse[];
}

function buildShelves(courses: WatchCourse[]): Shelf[] {
  const open: WatchCourse[] = [];
  const byGroup = new Map<string, Shelf>();

  for (const course of courses) {
    if (!course.groupId) {
      open.push(course);
      continue;
    }
    const existing = byGroup.get(course.groupId);
    if (existing) {
      existing.courses.push(course);
      continue;
    }
    byGroup.set(course.groupId, {
      key: course.groupId,
      title: course.groupName ?? t('watch.groupCourses'),
      isTrainingSchool: course.groupType === 'training_school',
      courses: [course],
    });
  }

  const shelves: Shelf[] = [];
  if (open.length > 0) {
    shelves.push({
      key: 'open',
      title: t('watch.openToEveryone'),
      isTrainingSchool: false,
      courses: open,
    });
  }
  // Training schools first: they are the ones with a term running, and the reason someone opens
  // this tab on a given week.
  const groups = [...byGroup.values()].sort((a, b) => {
    if (a.isTrainingSchool !== b.isTrainingSchool) return a.isTrainingSchool ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return [...groups, ...shelves.filter((s) => s.key === 'open')];
}

function CourseCard({ course, onPress }: { course: WatchCourse; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
  const { data: courses = [], isLoading, isError, error, refetch } = useWatchCoursesQuery();

  const shelves = useMemo(() => buildShelves(courses), [courses]);

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
      contentContainerStyle={[styles.content, tabScreenContent]}
      showsVerticalScrollIndicator={false}
    >
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
                  onPress={() => router.push(`/watch/${course.id}`)}
                />
              ))}
            </View>
          </View>
        ))
      )}
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
    height: 124,
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
