import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  useCourseQuery,
  useDeleteCourseMutation,
  useUpdateCourseMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EditCourseScreen() {
  const { id: groupId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const router = useRouter();

  const { data: course, isLoading: courseLoading, isError: isCourseError } = useCourseQuery(
    courseId,
    { enabled: !!courseId }
  );
  const updateMutation = useUpdateCourseMutation();
  const deleteMutation = useDeleteCourseMutation();
  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) return;
    setTitle(course.title);
    setDescription(course.description ?? '');
    setCoverImageUrl(course.coverImageUrl ?? '');
    setSortOrder(String(course.sortOrder));
  }, [course]);

  useEffect(() => {
    if (courseId && isCourseError) {
      router.back();
    }
  }, [courseId, isCourseError, router]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !courseId) {
      setError(t('courses.fieldsRequired'));
      return;
    }
    setError(null);
    updateMutation.mutate(
      {
        courseId,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
        },
      },
      {
        onSuccess: () => router.replace(`/group/${groupId}/course/${courseId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleDelete = () => {
    if (!courseId || !groupId) return;
    Alert.alert(t('courses.deleteCourse'), t('courses.deleteCourseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('courses.deleteCourse'),
        style: 'destructive',
        onPress: () => {
          setError(null);
          deleteMutation.mutate(
            { courseId, groupId },
            {
              onSuccess: () => router.replace(`/group/${groupId}`),
              onError: (err) => setError(getUserFacingError(err)),
            }
          );
        },
      },
    ]);
  };

  if (!groupId || !courseId) {
    return null;
  }

  if (courseLoading && !course) {
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
            label={t('courses.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('courses.titlePlaceholder')}
            autoCapitalize="sentences"
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('courses.titleLabel')}
          />

          <Input
            label={t('courses.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('courses.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
            inputStyle={{ minHeight: 80 }}
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('courses.descriptionLabel')}
          />

          <Input
            label={t('courses.coverImageUrlLabel')}
            value={coverImageUrl}
            onChangeText={setCoverImageUrl}
            placeholder={t('courses.coverImageUrlPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('courses.coverImageUrlLabel')}
          />

          <Input
            label={t('courses.sortOrderLabel')}
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder={t('courses.sortOrderPlaceholder')}
            keyboardType="number-pad"
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('courses.sortOrderLabel')}
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
              disabled={!title.trim() || isSubmitting || isDeleting}
              fullWidth
              accessibilityLabel={t('common.save')}
              accessibilityHint={t('courses.editCourseSaveHint')}
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
            accessibilityLabel={t('courses.deleteCourse')}
            accessibilityHint={t('courses.deleteCourseConfirm')}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t('courses.deleteCourse')}</Text>
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
