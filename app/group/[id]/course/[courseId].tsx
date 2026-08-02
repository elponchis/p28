import { useLayoutEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/patterns/EmptyState';
import { useCourseQuery, useLessonsByCourseQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function CourseDetailScreen() {
  const { id: groupId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const { data: course, isLoading: courseLoading } = useCourseQuery(courseId, {
    enabled: !!courseId,
  });
  const { data: lessons = [], isLoading: lessonsLoading } = useLessonsByCourseQuery(courseId, {
    enabled: !!courseId,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: course?.title ?? '' });
  }, [course?.title, navigation]);

  if (!groupId || !courseId) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {courseLoading && !course ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <>
          {course?.title ? <Text style={styles.courseTitle}>{course.title}</Text> : null}
          {course?.description ? (
            <Text style={styles.courseDescription}>{course.description}</Text>
          ) : null}

          {lessonsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : lessons.length === 0 ? (
            <EmptyState
              iconName="videocam-outline"
              title={t('lessons.noLessons')}
              subtitle={t('lessons.noLessonsHint')}
            />
          ) : (
            <View style={styles.lessonList}>
              {lessons.map((lesson, index) => (
                <Pressable
                  key={lesson.id}
                  onPress={() =>
                    router.push(`/group/${groupId}/course/${courseId}/lesson/${lesson.id}`)
                  }
                  style={({ pressed }) => [styles.lessonCard, pressed && { opacity: 0.92 }]}
                  accessibilityLabel={lesson.title}
                  accessibilityHint={t('lessons.openLessonHint')}
                  accessibilityRole="button"
                >
                  <View style={styles.lessonNumberBadge}>
                    <Text style={styles.lessonNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.lessonTextCol}>
                    <Text style={styles.lessonLabel}>
                      {t('lessons.lessonLabel', { number: index + 1 })}
                    </Text>
                    <Text style={styles.lessonTitle} numberOfLines={2}>
                      {lesson.title}
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={28} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xl,
  },
  courseTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  courseDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  lessonList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  lessonNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumberText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  lessonTextCol: {
    flex: 1,
    minWidth: 0,
  },
  lessonLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  lessonTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
});
