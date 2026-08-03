import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Input } from '@/components/primitives';
import { AssignmentDueDateField } from '@/components/patterns/AssignmentDueDateField';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import { useCreateAssignmentMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CreateAssignmentScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateAssignmentMutation();
  const isSubmitting = createMutation.isPending;

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('assignments.fieldsRequired'));
      return;
    }
    setError(null);
    createMutation.mutate(
      {
        groupId,
        userId: userId!,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          sortOrder: 0,
        },
      },
      {
        onSuccess: (assignment) => router.replace(`/group/${groupId}/assignment/${assignment.id}`),
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
            label={t('assignments.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('assignments.titlePlaceholder')}
            autoCapitalize="sentences"
            accessibilityLabel={t('assignments.titleLabel')}
          />

          <Input
            label={t('assignments.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('assignments.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
            inputStyle={{ minHeight: 80 }}
            accessibilityLabel={t('assignments.descriptionLabel')}
          />

          <AssignmentDueDateField value={dueDate} onChange={setDueDate} disabled={isSubmitting} />

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
              title={isSubmitting ? t('common.loading') : t('assignments.createAssignment')}
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              accessibilityLabel={t('assignments.createAssignment')}
              accessibilityHint={t('assignments.createAssignmentSaveHint')}
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
