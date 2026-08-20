import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Input } from '@/components/primitives';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import {
  useDeleteLessonMutation,
  useLessonQuery,
  useUpdateLessonMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { parseVideoEmbedUrl } from '@/lib/videoEmbed';
import { confirm } from '@/lib/dialogs';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EditLessonScreen() {
  const {
    id: groupId,
    courseId,
    lessonId,
  } = useLocalSearchParams<{ id: string; courseId: string; lessonId: string }>();
  const router = useRouter();

  const {
    data: lesson,
    isLoading: lessonLoading,
    isError: isLessonError,
  } = useLessonQuery(lessonId, { enabled: !!lessonId });
  const updateMutation = useUpdateLessonMutation();
  const deleteMutation = useDeleteLessonMutation();
  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setDescription(lesson.description ?? '');
    setVideoUrl(lesson.videoUrl);
    setSortOrder(String(lesson.sortOrder));
  }, [lesson]);

  useEffect(() => {
    if (lessonId && isLessonError) {
      router.back();
    }
  }, [lessonId, isLessonError, router]);

  const trimmedVideoUrl = videoUrl.trim();
  const videoUrlValid = useMemo(
    () => (trimmedVideoUrl ? !!parseVideoEmbedUrl(trimmedVideoUrl) : true),
    [trimmedVideoUrl]
  );

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !trimmedVideoUrl || !lessonId) {
      setError(t('lessons.fieldsRequired'));
      return;
    }
    if (!parseVideoEmbedUrl(trimmedVideoUrl)) {
      setError(t('lessons.unsupportedVideoUrl'));
      return;
    }
    setError(null);
    updateMutation.mutate(
      {
        lessonId,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          videoUrl: trimmedVideoUrl,
          sortOrder: parseInt(sortOrder, 10) || 0,
        },
      },
      {
        onSuccess: () => router.replace(`/group/${groupId}/course/${courseId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleDelete = async () => {
    if (!lessonId || !courseId) return;
    const confirmed = await confirm({
      title: t('lessons.deleteLesson'),
      message: t('lessons.deleteLessonConfirm'),
      confirmLabel: t('lessons.deleteLesson'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    setError(null);
    deleteMutation.mutate(
      { lessonId, courseId },
      {
        onSuccess: () => router.replace(`/group/${groupId}/course/${courseId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!groupId || !courseId || !lessonId) {
    return null;
  }

  if (lessonLoading && !lesson) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DesktopContentContainer maxWidth={600}>
          <Input
            label={t('lessons.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('lessons.titlePlaceholder')}
            autoCapitalize="sentences"
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('lessons.titleLabel')}
          />

          <Input
            label={t('lessons.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('lessons.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
            inputStyle={{ minHeight: 80 }}
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('lessons.descriptionLabel')}
          />

          <Input
            label={t('lessons.videoUrlLabel')}
            value={videoUrl}
            onChangeText={(v) => {
              setVideoUrl(v);
              setError(null);
            }}
            placeholder={t('lessons.videoUrlPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!isSubmitting && !isDeleting}
            error={!videoUrlValid ? t('lessons.unsupportedVideoUrl') : undefined}
            accessibilityLabel={t('lessons.videoUrlLabel')}
          />

          <Input
            label={t('lessons.sortOrderLabel')}
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder={t('lessons.sortOrderPlaceholder')}
            keyboardType="number-pad"
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('lessons.sortOrderLabel')}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={isSubmitting ? t('common.loading') : t('common.save')}
              onPress={handleSave}
              disabled={!title.trim() || !trimmedVideoUrl || isSubmitting || isDeleting}
              fullWidth
              accessibilityLabel={t('common.save')}
              accessibilityHint={t('lessons.editLessonSaveHint')}
            />
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting || isDeleting}
              fullWidth
              accessibilityLabel={t('common.cancel')}
            />
          </View>

          <Pressable
            onPress={handleDelete}
            disabled={isSubmitting || isDeleting}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.85 },
              (isSubmitting || isDeleting) && { opacity: 0.4 },
            ]}
            accessibilityLabel={t('lessons.deleteLesson')}
            accessibilityHint={t('lessons.deleteLessonConfirm')}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t('lessons.deleteLesson')}</Text>
          </Pressable>
        </DesktopContentContainer>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  deleteButtonText: {
    ...typography.buttonLabel,
    color: colors.error,
  },
});
