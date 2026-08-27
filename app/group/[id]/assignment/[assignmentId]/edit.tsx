import { useEffect, useState } from 'react';
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
import { AssignmentDueDateField } from '@/components/patterns/AssignmentDueDateField';
import { AssignmentMaterialsField } from '@/components/patterns/AssignmentMaterialsField';
import { AssignmentTypeField } from '@/components/patterns/AssignmentTypeField';
import { LabeledSwitchRow } from '@/components/patterns/LabeledSwitchRow';
import { QuizBuilder } from '@/components/patterns/QuizBuilder';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import {
  useAssignmentQuery,
  useAssignmentQuestionsQuery,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import type { QuizQuestionInput, UploadedFile } from '@/lib/api';
import { findQuizDraftProblem, toQuizQuestionInput } from '@/lib/quiz';
import { describeQuizDraftProblem } from '@/lib/quizMessages';
import { t } from '@/lib/i18n';
import { confirm } from '@/lib/dialogs';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EditAssignmentScreen() {
  const { id: groupId, assignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const {
    data: assignment,
    isLoading: assignmentLoading,
    isError: isAssignmentError,
  } = useAssignmentQuery(assignmentId, { enabled: !!assignmentId });
  const isQuiz = assignment?.assignmentType === 'quiz';
  const { data: existingQuestions } = useAssignmentQuestionsQuery(assignmentId, {
    enabled: !!assignmentId && isQuiz,
  });
  const updateMutation = useUpdateAssignmentMutation();
  const deleteMutation = useDeleteAssignmentMutation();
  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [materials, setMaterials] = useState<UploadedFile[]>([]);
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([]);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment) return;
    setTitle(assignment.title);
    setDescription(assignment.description ?? '');
    setDueDate(assignment.dueDate ? new Date(assignment.dueDate) : null);
    setMaterials(assignment.materials);
    setAllowResubmission(assignment.allowResubmission);
  }, [assignment]);

  useEffect(() => {
    if (!existingQuestions) return;
    setQuestions(existingQuestions.map(toQuizQuestionInput));
  }, [existingQuestions]);

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
    if (isQuiz) {
      const problem = findQuizDraftProblem(questions);
      if (problem) {
        setError(describeQuizDraftProblem(problem));
        return;
      }
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
          materials,
          allowResubmission,
          questions: isQuiz ? questions : undefined,
        },
      },
      {
        onSuccess: () => router.replace(`/group/${groupId}/assignment/${assignmentId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleDelete = async () => {
    if (!assignmentId || !groupId) return;
    const confirmed = await confirm({
      title: t('assignments.deleteAssignment'),
      message: t('assignments.deleteAssignmentConfirm'),
      confirmLabel: t('assignments.deleteAssignment'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    setError(null);
    deleteMutation.mutate(
      { assignmentId, groupId },
      {
        onSuccess: () => router.replace(`/group/${groupId}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
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

          {/* The type is fixed once students can submit — switching it would strand every
              submission already made in the other format. */}
          <AssignmentTypeField
            value={assignment?.assignmentType ?? 'file'}
            onChange={() => {}}
            locked
          />

          {isQuiz ? (
            <QuizBuilder
              questions={questions}
              onChange={setQuestions}
              disabled={isSubmitting || isDeleting}
            />
          ) : null}

          <LabeledSwitchRow
            label={t('assignments.allowResubmissionLabel')}
            hint={t('assignments.allowResubmissionHint')}
            value={allowResubmission}
            onValueChange={setAllowResubmission}
            disabled={isSubmitting || isDeleting}
            variant="sheet"
            accessibilityLabel={t('assignments.allowResubmissionLabel')}
            accessibilityHint={t('assignments.allowResubmissionHint')}
          />

          <AssignmentDueDateField
            value={dueDate}
            onChange={setDueDate}
            disabled={isSubmitting || isDeleting}
          />

          {userId && groupId ? (
            <AssignmentMaterialsField
              groupId={groupId}
              userId={userId}
              materials={materials}
              onChange={setMaterials}
              disabled={isSubmitting || isDeleting}
            />
          ) : null}

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
