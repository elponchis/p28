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
import { AssignmentDueDateField } from '@/components/patterns/AssignmentDueDateField';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import {
  useAssignmentQuery,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EditAssignmentScreen() {
  const { id: groupId, assignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
  }>();
  const router = useRouter();

  const {
    data: assignment,
    isLoading: assignmentLoading,
    isError: isAssignmentError,
  } = useAssignmentQuery(assignmentId, { enabled: !!assignmentId });
  const updateMutation = useUpdateAssignmentMutation();
  const deleteMutation = useDeleteAssignmentMutation();
  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment) return;
    setTitle(assignment.title);
    setDescription(assignment.description ?? '');
    setDueDate(assignment.dueDate ? new Date(assignment.dueDate) : null);
  }, [assignment]);

  useEffect(() => {
    if (assignmentId && isAssignmentError) {
      router.back();
    }
  }, [assignmentId, isAssignmentError, router]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !assignmentId) {
      setError(t('assignments.fieldsRequired'));
      return;
    }
    setError(null);
    updateMutation.mutate(
      {
        assignmentId,
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          sortOrder: assignment?.sortOrder ?? 0,
        },
      },
      {
        onSuccess: () => router.replace(`/group/${groupId}/assignment/${assignmentId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleDelete = () => {
    if (!assignmentId || !groupId) return;
    Alert.alert(t('assignments.deleteAssignment'), t('assignments.deleteAssignmentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('assignments.deleteAssignment'),
        style: 'destructive',
        onPress: () => {
          setError(null);
          deleteMutation.mutate(
            { assignmentId, groupId },
            {
              onSuccess: () => router.replace(`/group/${groupId}`),
              onError: (err) => setError(getUserFacingError(err)),
            }
          );
        },
      },
    ]);
  };

  if (!groupId || !assignmentId) {
    return null;
  }

  if (assignmentLoading && !assignment) {
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
            label={t('assignments.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('assignments.titlePlaceholder')}
            autoCapitalize="sentences"
            editable={!isSubmitting && !isDeleting}
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
            editable={!isSubmitting && !isDeleting}
            accessibilityLabel={t('assignments.descriptionLabel')}
          />

          <AssignmentDueDateField
            value={dueDate}
            onChange={setDueDate}
            disabled={isSubmitting || isDeleting}
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
              accessibilityHint={t('assignments.editAssignmentSaveHint')}
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
            accessibilityLabel={t('assignments.deleteAssignment')}
            accessibilityHint={t('assignments.deleteAssignmentConfirm')}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t('assignments.deleteAssignment')}</Text>
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
