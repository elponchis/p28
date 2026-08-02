import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Input } from '@/components/primitives';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCourseMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CreateCourseScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateCourseMutation();
  const isSubmitting = createMutation.isPending;

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('courses.fieldsRequired'));
      return;
    }
    setError(null);
    createMutation.mutate(
      {
        groupId,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
        },
      },
      {
        onSuccess: (course) => router.replace(`/group/${groupId}/course/${course.id}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!groupId) {
    router.back();
    return null;
  }

  if (!userId) {
    router.replace('/(tabs)/groups');
    return null;
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
            accessibilityLabel={t('courses.coverImageUrlLabel')}
          />

          <Input
            label={t('courses.sortOrderLabel')}
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder={t('courses.sortOrderPlaceholder')}
            keyboardType="number-pad"
            accessibilityLabel={t('courses.sortOrderLabel')}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
              accessibilityLabel={t('common.cancel')}
            />
            <Button
              title={isSubmitting ? t('common.loading') : t('courses.createCourse')}
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              accessibilityLabel={t('courses.createCourse')}
              accessibilityHint={t('courses.createCourseSaveHint')}
            />
          </View>
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
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
