import { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { IconButton } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { DiscussionListSection } from '@/components/patterns/DiscussionListSection';
import { useAuth } from '@/hooks/useAuth';
import {
  useCourseQuery,
  useDeleteLessonMutation,
  useDiscussionsQuery,
  useLessonsByCourseQuery,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import type { Discussion } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function CourseDetailScreen() {
  const { id: groupId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const navigation = useNavigation();

  const { data: course, isLoading: courseLoading } = useCourseQuery(courseId, {
    enabled: !!courseId,
  });
  const {
    data: lessons = [],
    isLoading: lessonsLoading,
    refetch: refetchLessons,
  } = useLessonsByCourseQuery(courseId, { enabled: !!courseId });
  const { data: isGroupAdmin = false } = useUserIsGroupAdminQuery(groupId, userId, {
    enabled: !!groupId && !!userId,
  });
  const deleteLessonMutation = useDeleteLessonMutation();
  const { data: boardDiscussions = [], isLoading: boardLoading } = useDiscussionsQuery({
    courseId,
    enabled: !!courseId,
  });

  const handleEditCourse = useCallback(() => {
    if (groupId && courseId) router.push(`/group/${groupId}/course/${courseId}/edit`);
  }, [router, groupId, courseId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: course?.title ?? '',
      headerRight: isGroupAdmin
        ? () => (
            <Pressable
              onPress={handleEditCourse}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
              accessibilityLabel={t('courses.editCourse')}
              accessibilityHint={t('courses.editCourseHint')}
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [course?.title, isGroupAdmin, handleEditCourse, navigation]);

  const handleAddLesson = useCallback(() => {
    if (groupId && courseId) router.push(`/group/${groupId}/course/${courseId}/lesson/create`);
  }, [router, groupId, courseId]);

  const handleAddBoardTopic = useCallback(() => {
    if (groupId && courseId) {
      router.push(`/group/discussion/create?groupId=${groupId}&courseId=${courseId}`);
    }
  }, [router, groupId, courseId]);

  const handleOpenBoardTopic = useCallback(
    (discussion: Discussion) => {
      router.push(`/group/discussion/${discussion.id}`);
    },
    [router]
  );

  const handleEditLesson = useCallback(
    (lessonId: string) => {
      if (groupId && courseId) {
        router.push(`/group/${groupId}/course/${courseId}/lesson/${lessonId}/edit`);
      }
    },
    [router, groupId, courseId]
  );

  const handleDeleteLesson = useCallback(
    (lessonId: string, lessonTitle: string) => {
      if (!courseId) return;
      Alert.alert(
        t('lessons.deleteLesson'),
        `${lessonTitle}\n\n${t('lessons.deleteLessonConfirm')}`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('lessons.deleteLesson'),
            style: 'destructive',
            onPress: () => {
              deleteLessonMutation.mutate(
                { lessonId, courseId },
                { onSuccess: () => refetchLessons() }
              );
            },
          },
        ]
      );
    },
    [courseId, deleteLessonMutation, refetchLessons]
  );

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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('lessons.sectionTitle')}</Text>
            {isGroupAdmin && lessons.length > 0 ? (
              <Pressable
                onPress={handleAddLesson}
                style={styles.addLessonButton}
                accessibilityLabel={t('lessons.addLesson')}
                accessibilityHint={t('lessons.addLessonHint')}
              >
                <Ionicons name="add-circle" size={16} color={colors.secondary} />
                <Text style={styles.addLessonText}>{t('lessons.addLesson')}</Text>
              </Pressable>
            ) : null}
          </View>

          {lessonsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : lessons.length === 0 ? (
            <EmptyState
              iconName="videocam-outline"
              title={t('lessons.noLessons')}
              subtitle={t('lessons.noLessonsHint')}
              actionLabel={isGroupAdmin ? t('lessons.addLesson') : undefined}
              onAction={isGroupAdmin ? handleAddLesson : undefined}
              actionVariant="link"
              actionAccessibilityHint={t('lessons.addLessonHint')}
            />
          ) : (
            <View style={styles.lessonList}>
              {lessons.map((lesson, index) => (
                <View key={lesson.id} style={styles.lessonCard}>
                  <Pressable
                    onPress={() =>
                      router.push(`/group/${groupId}/course/${courseId}/lesson/${lesson.id}`)
                    }
                    style={({ pressed }) => [styles.lessonCardMain, pressed && { opacity: 0.92 }]}
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
                  {isGroupAdmin ? (
                    <View style={styles.lessonCardActions}>
                      <IconButton
                        name="pencil-outline"
                        size={18}
                        onPress={() => handleEditLesson(lesson.id)}
                        accessibilityLabel={t('lessons.editLesson')}
                        accessibilityHint={t('lessons.editLessonHint')}
                      />
                      <IconButton
                        name="trash-outline"
                        size={18}
                        color={colors.error}
                        onPress={() => handleDeleteLesson(lesson.id, lesson.title)}
                        accessibilityLabel={t('lessons.deleteLesson')}
                        accessibilityHint={t('lessons.deleteLessonConfirm')}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <DiscussionListSection
            title={t('courses.discussionBoard')}
            discussions={boardDiscussions}
            isLoading={boardLoading}
            emptyIconName="chatbubbles-outline"
            emptyTitle={t('discussions.noDiscussions')}
            emptySubtitle={t('discussions.noDiscussionsHint')}
            canAdd={!!userId}
            addLabel={t('discussions.addDiscussion')}
            addHint={t('discussions.addDiscussionHint')}
            onAddPress={handleAddBoardTopic}
            onItemPress={handleOpenBoardTopic}
          />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  addLessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  addLessonText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  lessonList: {
    gap: spacing.md,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lessonCardMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lessonCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
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
