import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { VideoEmbedPlayer } from '@/components/patterns/VideoEmbedPlayer';
import { useLessonQuery } from '@/hooks/useApiQueries';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

export default function LessonPlayerScreen() {
  const { lessonId } = useLocalSearchParams<{ id: string; courseId: string; lessonId: string }>();
  const navigation = useNavigation();

  const { data: lesson, isLoading } = useLessonQuery(lessonId, { enabled: !!lessonId });

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
});
