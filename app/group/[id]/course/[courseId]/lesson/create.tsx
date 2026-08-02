import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Input } from '@/components/primitives';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import { useCreateLessonMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { parseVideoEmbedUrl } from '@/lib/videoEmbed';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CreateLessonScreen() {
  const { id: groupId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateLessonMutation();
  const isSubmitting = createMutation.isPending;

  const trimmedVideoUrl = videoUrl.trim();
  const videoUrlValid = useMemo(
    () => (trimmedVideoUrl ? !!parseVideoEmbedUrl(trimmedVideoUrl) : true),
    [trimmedVideoUrl]
  );

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !trimmedVideoUrl) {
      setError(t('lessons.fieldsRequired'));
      return;
    }
    if (!parseVideoEmbedUrl(trimmedVideoUrl)) {
      setError(t('lessons.unsupportedVideoUrl'));
      return;
    }
    setError(null);
    createMutation.mutate(
      {
        courseId,
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

  if (!groupId || !courseId) {
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
            label={t('lessons.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('lessons.titlePlaceholder')}
            autoCapitalize="sentences"
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
            error={!videoUrlValid ? t('lessons.unsupportedVideoUrl') : undefined}
            accessibilityLabel={t('lessons.videoUrlLabel')}
          />

          <Input
            label={t('lessons.sortOrderLabel')}
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder={t('lessons.sortOrderPlaceholder')}
            keyboardType="number-pad"
            accessibilityLabel={t('lessons.sortOrderLabel')}
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
              title={isSubmitting ? t('common.loading') : t('lessons.createLesson')}
              onPress={handleSubmit}
              disabled={!title.trim() || !trimmedVideoUrl || isSubmitting}
              accessibilityLabel={t('lessons.createLesson')}
              accessibilityHint={t('lessons.createLessonSaveHint')}
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
