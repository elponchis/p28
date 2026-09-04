/**
 * One course in the Watch tab: its videos, and the one currently playing.
 *
 * Deliberately not the LMS course screen. That one hangs off a group route, carries the
 * discussion board and the admin affordances, and cannot render a course that belongs to no
 * group — which is exactly what a public video is here. This screen is the viewing half only.
 *
 * There is no access check in this file. A course the reader may not watch does not come back
 * from the query at all, so "not found" and "not allowed" are the same screen on purpose: the
 * second one should not be distinguishable from the first.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { VideoEmbedPlayer } from '@/components/patterns/VideoEmbedPlayer';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useCourseQuery, useLessonsByCourseQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { formatDateHeader } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function WatchCourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const {
    data: course,
    isLoading: courseLoading,
    isError,
    error,
  } = useCourseQuery(courseId, { enabled: !!courseId });
  const { data: lessons = [], isLoading: lessonsLoading } = useLessonsByCourseQuery(courseId, {
    enabled: !!courseId,
  });

  const [playingLessonId, setPlayingLessonId] = useState<string | null>(null);

  // Open on the first video rather than on a chooser: a course with one video should play it,
  // and a course with ten still has to start somewhere.
  useEffect(() => {
    if (playingLessonId || lessons.length === 0) return;
    setPlayingLessonId(lessons[0].id);
  }, [lessons, playingLessonId]);

  const playing = useMemo(
    () => lessons.find((l) => l.id === playingLessonId) ?? null,
    [lessons, playingLessonId]
  );

  useEffect(() => {
    navigation.setOptions({ title: course?.title ?? t('tabs.watch') });
  }, [navigation, course?.title]);

  const availability = useMemo(() => {
    if (!course) return null;
    if (course.availableUntil) {
      return t('watch.availableUntil', { date: formatDateHeader(course.availableUntil) });
    }
    if (course.availableFrom) {
      return t('watch.availableFrom', { date: formatDateHeader(course.availableFrom) });
    }
    return null;
  }, [course]);

  if (courseLoading && !course) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !course) {
    return (
      <View style={styles.centered}>
        <EmptyState
          iconName="lock-closed-outline"
          title={t('watch.emptyTitle')}
          subtitle={
            isError && error && 'message' in error
              ? getUserFacingError(error)
              : t('watch.emptyDescription')
          }
          actionLabel={t('watch.backToWatch')}
          onAction={() => router.replace('/watch')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {playing ? (
        <VideoEmbedPlayer videoUrl={playing.videoUrl} accessibilityLabel={playing.title} />
      ) : null}

      <View style={styles.heading}>
        <Text style={styles.title}>{playing?.title ?? course.title}</Text>
        {playing?.description ? (
          <Text style={styles.description}>{playing.description}</Text>
        ) : course.description ? (
          <Text style={styles.description}>{course.description}</Text>
        ) : null}
        {availability ? <Text style={styles.availability}>{availability}</Text> : null}
      </View>

      {lessonsLoading && lessons.length === 0 ? (
        <ActivityIndicator color={colors.primary} />
      ) : lessons.length === 0 ? (
        <Text style={styles.empty}>{t('watch.noVideosYet')}</Text>
      ) : (
        <View style={styles.list}>
          {lessons.map((lesson, index) => {
            const isPlaying = lesson.id === playingLessonId;
            return (
              <Pressable
                key={lesson.id}
                onPress={() => setPlayingLessonId(lesson.id)}
                style={({ pressed }) => [
                  styles.row,
                  isPlaying && styles.rowPlaying,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isPlaying }}
                accessibilityLabel={lesson.title}
              >
                <View style={styles.rowIndex}>
                  {isPlaying ? (
                    <Ionicons name="play" size={14} color={colors.primary} />
                  ) : (
                    <Text style={styles.rowIndexText}>{index + 1}</Text>
                  )}
                </View>
                <Text
                  style={[styles.rowTitle, isPlaying && styles.rowTitlePlaying]}
                  numberOfLines={2}
                >
                  {lesson.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    gap: spacing.lg,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.onSurface,
  },
  description: {
    ...typography.body,
    color: colors.onSurfaceVariant,
  },
  availability: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  empty: {
    ...typography.body,
    color: colors.onSurfaceVariant,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.ghostBorder,
  },
  rowPlaying: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerHigh,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIndex: {
    width: 24,
    alignItems: 'center',
  },
  rowIndexText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  rowTitle: {
    ...typography.body,
    flex: 1,
    color: colors.onSurface,
  },
  rowTitlePlaying: {
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
});
