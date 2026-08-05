import { useCallback, useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { VideoEmbedPlayer } from '@/components/patterns/VideoEmbedPlayer';
import { DiscussionListSection } from '@/components/patterns/DiscussionListSection';
import { useAuth } from '@/hooks/useAuth';
import { useDiscussionsQuery, useLessonQuery } from '@/hooks/useApiQueries';
import type { Discussion } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

export default function LessonPlayerScreen() {
  const {
    id: groupId,
    courseId,
    lessonId,
  } = useLocalSearchParams<{ id: string; courseId: string; lessonId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: lesson, isLoading } = useLessonQuery(lessonId, { enabled: !!lessonId });
  const { data: qaDiscussions = [], isLoading: qaLoading } = useDiscussionsQuery({
    courseId,
    lessonId,
    enabled: !!courseId && !!lessonId,
  });

  const handleAddQuestion = useCallback(() => {
    if (groupId && courseId && lessonId) {
      router.push(
        `/group/discussion/create?groupId=${groupId}&courseId=${courseId}&lessonId=${lessonId}`
      );
    }
  }, [router, groupId, courseId, lessonId]);

  const handleOpenQuestion = useCallback(
    (discussion: Discussion) => {
      router.push(`/group/discussion/${discussion.id}`);
    },
    [router]
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: lesson?.title ?? '' });
  }, [lesson?.title, navigation]);

  if (!lessonId) {
    return null;
  }

  if (isLoading && !lesson) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lesson) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <VideoEmbedPlayer videoUrl={lesson.videoUrl} accessibilityLabel={lesson.title} />
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.description ? <Text style={styles.description}>{lesson.description}</Text> : null}

      <View style={styles.qaSection}>
        <DiscussionListSection
          title={t('lessons.qaSectionTitle')}
          discussions={qaDiscussions}
          isLoading={qaLoading}
          emptyIconName="help-circle-outline"
          emptyTitle={t('discussions.noDiscussions')}
          emptySubtitle={t('discussions.noDiscussionsHint')}
          canAdd={!!userId}
          addLabel={t('discussions.addDiscussion')}
          addHint={t('discussions.addDiscussionHint')}
          onAddPress={handleAddQuestion}
          onItemPress={handleOpenQuestion}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  qaSection: {
    marginTop: spacing.xl,
  },
});
