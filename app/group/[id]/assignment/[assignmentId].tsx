import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { FileAttachmentModal } from '@/components/messages';
import { QuizAnswerForm } from '@/components/patterns/QuizAnswerForm';
import { QuizResultCard } from '@/components/patterns/QuizResultCard';
import { UploadProgressBar } from '@/components/patterns/UploadProgressBar';
import { useAuth } from '@/hooks/useAuth';
import {
  useAssignmentQuery,
  useAssignmentQuestionsQuery,
  useMySubmissionQuery,
  useSubmissionDownloadUrlMutation,
  useUpsertSubmissionMutation,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import type { QuizAnswer } from '@/lib/api';
import { answersById, findUnansweredRequired, toSubmittableAnswers } from '@/lib/quiz';
import {
  isAllowedSubmissionMimeType,
  MAX_SUBMISSION_FILE_BYTES,
  MAX_SUBMISSION_FILES,
  SUBMISSION_PICKER_MIME_WHITELIST,
} from '@/lib/api/assignmentSubmissions';
import { normalizeMimeTypeForAllowlist } from '@/lib/api/messageAttachments';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import { formatGroupEventDateTime, formatRelativeTime, isGroupEventPast } from '@/lib/dates';
import { formatFileSize } from '@/lib/formatFileSize';
import { getPublicStorageUrl } from '@/lib/supabasePublicUrl';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

interface PendingFile {
  uri: string;
  name: string;
  size?: number;
  mimeType: string;
}

export default function AssignmentSubmissionScreen() {
  const { id: groupId, assignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
  }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigation = useNavigation();
  const router = useRouter();

  const { data: assignment, isLoading: assignmentLoading } = useAssignmentQuery(assignmentId, {
    enabled: !!assignmentId,
  });
  const {
    data: mySubmission,
    isLoading: submissionLoading,
    refetch: refetchMySubmission,
  } = useMySubmissionQuery(assignmentId, userId, { enabled: !!assignmentId && !!userId });
  const { data: isGroupAdmin = false } = useUserIsGroupAdminQuery(groupId, userId, {
    enabled: !!groupId && !!userId,
  });
  const isQuiz = assignment?.assignmentType === 'quiz';
  const allowResubmission = assignment?.allowResubmission !== false;
  const { data: questions = [], isLoading: questionsLoading } = useAssignmentQuestionsQuery(
    assignmentId,
    { enabled: !!assignmentId && isQuiz }
  );
  const upsertMutation = useUpsertSubmissionMutation();
  const downloadUrlMutation = useSubmissionDownloadUrlMutation();

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{ url: string; fileName: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  // Seeded once from whatever was submitted before, so reopening a quiz shows the previous
  // answers to edit rather than a blank form.
  const [answersSeeded, setAnswersSeeded] = useState(false);

  useEffect(() => {
    if (answersSeeded || !isQuiz || !mySubmission) return;
    setAnswers(answersById(mySubmission.answers));
    setAnswersSeeded(true);
  }, [answersSeeded, isQuiz, mySubmission]);

  const handleEditAssignment = useCallback(() => {
    if (groupId && assignmentId) router.push(`/group/${groupId}/assignment/${assignmentId}/edit`);
  }, [router, groupId, assignmentId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: assignment?.title ?? '',
      headerRight: isGroupAdmin
        ? () => (
            <Pressable
              onPress={handleEditAssignment}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
              accessibilityLabel={t('assignments.editAssignment')}
              accessibilityHint={t('assignments.editAssignmentHint')}
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [assignment?.title, isGroupAdmin, handleEditAssignment, navigation]);

  const isPastDue = useMemo(
    () => !!assignment?.dueDate && isGroupEventPast(assignment.dueDate),
    [assignment?.dueDate]
  );

  // Two independent reasons a submission can no longer be changed: the deadline passed,
  // or the instructor turned resubmission off and one attempt is already in. The server
  // enforces both in RLS; this only decides what the screen offers.
  const submissionLocked = isPastDue || (!!mySubmission && !allowResubmission);
  const quizLocked = submissionLocked;

  const handlePickFile = async () => {
    setError(null);
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await enqueueDocumentPick(() =>
        DocumentPicker.getDocumentAsync({
          type: SUBMISSION_PICKER_MIME_WHITELIST,
          multiple: true,
          copyToCacheDirectory: true,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      return;
    }
    if (result.canceled || !result.assets?.length) return;

    const next: PendingFile[] = [...pendingFiles];
    for (const doc of result.assets) {
      const mime = normalizeMimeTypeForAllowlist(doc.mimeType ?? 'application/octet-stream');
      if (!isAllowedSubmissionMimeType(mime)) {
        setError(t('attachments.unsupportedFileType'));
        continue;
      }
      if (doc.size != null && doc.size > MAX_SUBMISSION_FILE_BYTES) {
        setError(t('attachments.fileTooLarge'));
        continue;
      }
      if (next.length >= MAX_SUBMISSION_FILES) {
        setError(t('attachments.tooManyFiles'));
        break;
      }
      next.push({
        uri: doc.uri,
        name: doc.name || 'file',
        size: doc.size ?? undefined,
        mimeType: mime,
      });
    }
    setPendingFiles(next);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!userId || !assignmentId || pendingFiles.length === 0 || submissionLocked) return;
    setError(null);
    setUploadProgress(0);
    upsertMutation.mutate(
      {
        assignmentId,
        userId,
        input: {
          files: pendingFiles.map((f) => ({
            fileUri: f.uri,
            fileName: f.name,
            fileSize: f.size,
            mimeType: f.mimeType,
          })),
        },
        onProgress: setUploadProgress,
      },
      {
        onSuccess: () => {
          setPendingFiles([]);
          setUploadProgress(0);
          refetchMySubmission();
        },
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleSubmitQuiz = () => {
    if (!userId || !assignmentId || quizLocked) return;
    const missing = findUnansweredRequired(questions, answers);
    if (missing.length > 0) {
      setError(t('submissions.answerRequiredQuestions', { count: missing.length }));
      return;
    }
    setError(null);
    upsertMutation.mutate(
      {
        assignmentId,
        userId,
        input: { answers: toSubmittableAnswers(questions, answers) },
      },
      {
        onSuccess: () => refetchMySubmission(),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleRetrySubmit = () => {
    if (!upsertMutation.variables) return;
    setError(null);
    setUploadProgress(0);
    upsertMutation.mutate(upsertMutation.variables);
  };

  const handleViewFile = (file: { path: string; name: string }) => {
    setError(null);
    downloadUrlMutation.mutate(
      { filePath: file.path },
      {
        onSuccess: (url) => setViewingFile({ url, fileName: file.name }),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!assignmentId) {
    return null;
  }

  if (
    (assignmentLoading && !assignment) ||
    (submissionLoading && userId && !mySubmission) ||
    (isQuiz && questionsLoading && questions.length === 0)
  ) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isReviewed = !!mySubmission?.reviewedAt;
  const isSubmitting = upsertMutation.isPending;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {assignment?.title ? <Text style={styles.title}>{assignment.title}</Text> : null}
      {assignment?.description ? (
        <Text style={styles.description}>{assignment.description}</Text>
      ) : null}

      <View style={styles.dueRow}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={isPastDue ? colors.error : colors.onSurfaceVariant}
        />
        <Text style={[styles.dueText, isPastDue && styles.dueTextOverdue]}>
          {assignment?.dueDate
            ? `${t('submissions.dueDateLabel')}: ${formatGroupEventDateTime(assignment.dueDate)}`
            : t('assignments.noDueDate')}
        </Text>
        {isPastDue ? (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueBadgeText}>{t('submissions.overdueBadge')}</Text>
          </View>
        ) : null}
      </View>

      {isGroupAdmin ? (
        <View style={styles.adminCard}>
          <View style={styles.adminCardTextCol}>
            <Text style={styles.adminCardTitle}>{t('submissions.adminSectionTitle')}</Text>
            <Text style={styles.adminCardSubtitle}>{t('submissions.adminSectionSubtitle')}</Text>
          </View>
          <Button
            title={t('submissions.viewSubmissions')}
            variant="secondary"
            onPress={() =>
              groupId &&
              assignmentId &&
              router.push(`/group/${groupId}/assignment/${assignmentId}/submissions`)
            }
            accessibilityLabel={t('submissions.viewSubmissions')}
            accessibilityHint={t('submissions.viewSubmissionsHint')}
          />
        </View>
      ) : null}

      {assignment && assignment.materials.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('submissions.materialsTitle')}</Text>
          <View style={styles.submissionCard}>
            {assignment.materials.map((material) => (
              <Pressable
                key={material.path}
                style={styles.fileListRow}
                onPress={() =>
                  setViewingFile({
                    url: getPublicStorageUrl('assignment-materials', material.path),
                    fileName: material.name,
                  })
                }
                accessibilityLabel={material.name}
                accessibilityHint={t('submissions.viewFileHint')}
                accessibilityRole="button"
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.fileListName} numberOfLines={1}>
                  {material.name}
                </Text>
                {material.size ? (
                  <Text style={styles.fileListSize}>{formatFileSize(material.size)}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('submissions.mySubmissionTitle')}</Text>
        {mySubmission ? (
          <View style={styles.submissionCard}>
            {mySubmission.files.map((file) => (
              <Pressable
                key={file.path}
                style={styles.fileListRow}
                onPress={() => handleViewFile(file)}
                disabled={downloadUrlMutation.isPending}
                accessibilityLabel={file.name}
                accessibilityHint={t('submissions.viewFileHint')}
                accessibilityRole="button"
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.fileListName} numberOfLines={1}>
                  {file.name}
                </Text>
                {file.size ? (
                  <Text style={styles.fileListSize}>{formatFileSize(file.size)}</Text>
                ) : null}
              </Pressable>
            ))}
            <Text style={styles.submissionMeta}>
              {t('submissions.submittedAtLabel')}: {formatRelativeTime(mySubmission.submittedAt)}
            </Text>

            {isReviewed ? (
              <View style={styles.feedbackBlock}>
                <Text style={styles.feedbackTitle}>{t('submissions.feedbackTitle')}</Text>
                {mySubmission.score !== undefined ? (
                  <Text style={styles.scoreText}>
                    {t('submissions.scoreLabel')}: {mySubmission.score}
                  </Text>
                ) : null}
                {mySubmission.feedback ? (
                  <Text style={styles.feedbackText}>{mySubmission.feedback}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.notSubmittedText}>{t('submissions.notSubmittedYet')}</Text>
        )}
      </View>

      {isQuiz ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('submissions.quizSectionTitle')}</Text>
          {questions.length === 0 ? (
            <Text style={styles.notSubmittedText}>{t('submissions.quizNoQuestions')}</Text>
          ) : (
            <View style={styles.quizBlock}>
              {mySubmission ? (
                <QuizResultCard
                  score={mySubmission.autoScore ?? 0}
                  scoreMax={mySubmission.autoScoreMax ?? 0}
                  correctCount={mySubmission.answerResults.filter((r) => r.correct).length}
                  questionCount={mySubmission.answerResults.length}
                  hasUngradedWritten={questions.some((q) => q.questionType !== 'multiple_choice')}
                />
              ) : null}

              <QuizAnswerForm
                questions={questions}
                answers={answers}
                onChange={setAnswers}
                disabled={isSubmitting}
                readOnly={quizLocked}
                results={mySubmission?.answerResults}
              />

              {quizLocked ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>
                    {isPastDue
                      ? mySubmission
                        ? t('submissions.pastDueCannotResubmit')
                        : t('submissions.pastDueCannotSubmit')
                      : t('submissions.resubmitNotAllowed')}
                  </Text>
                </View>
              ) : (
                <View style={styles.actions}>
                  {error ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  <Button
                    title={
                      isSubmitting
                        ? t('submissions.submitting')
                        : mySubmission
                          ? t('submissions.resubmit')
                          : t('submissions.submit')
                    }
                    onPress={handleSubmitQuiz}
                    disabled={isSubmitting}
                    fullWidth
                    accessibilityLabel={
                      mySubmission ? t('submissions.resubmit') : t('submissions.submit')
                    }
                    accessibilityHint={t('submissions.submitQuizHint')}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      ) : submissionLocked ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {isPastDue
              ? mySubmission
                ? t('submissions.pastDueCannotResubmit')
                : t('submissions.pastDueCannotSubmit')
              : t('submissions.resubmitNotAllowed')}
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          {pendingFiles.length > 0 ? (
            <View style={styles.pendingFilesList}>
              {pendingFiles.map((f, index) => (
                <View key={`${f.uri}-${index}`} style={styles.selectedFileRow}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                  <Text style={styles.selectedFileText} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Pressable
                    onPress={() => handleRemovePendingFile(index)}
                    disabled={isSubmitting}
                    accessibilityLabel={t('submissions.removeFile')}
                    accessibilityHint={t('submissions.removeFileHint')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {isSubmitting ? (
            <View style={styles.progressRow}>
              <UploadProgressBar progress={uploadProgress} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              {upsertMutation.isError ? (
                <Button
                  title={t('attachments.retryUpload')}
                  variant="text"
                  onPress={handleRetrySubmit}
                  accessibilityLabel={t('attachments.retryUpload')}
                  accessibilityHint={t('attachments.retryUploadHint')}
                  style={styles.retryButton}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={
                pendingFiles.length > 0
                  ? t('submissions.addAnotherFile')
                  : t('submissions.pickFile')
              }
              variant="secondary"
              onPress={handlePickFile}
              disabled={isSubmitting || pendingFiles.length >= MAX_SUBMISSION_FILES}
              fullWidth
              accessibilityLabel={t('submissions.pickFile')}
              accessibilityHint={t('submissions.pickFileHint')}
            />
            <Button
              title={
                isSubmitting
                  ? t('submissions.submitting')
                  : mySubmission
                    ? t('submissions.resubmit')
                    : t('submissions.submit')
              }
              onPress={handleSubmit}
              disabled={pendingFiles.length === 0 || isSubmitting}
              fullWidth
              accessibilityLabel={
                mySubmission ? t('submissions.resubmit') : t('submissions.submit')
              }
              accessibilityHint={
                mySubmission ? t('submissions.resubmitHint') : t('submissions.submitHint')
              }
            />
          </View>
        </View>
      )}

      <FileAttachmentModal
        visible={!!viewingFile}
        fileUrl={viewingFile?.url ?? null}
        fileName={viewingFile?.fileName ?? ''}
        onRequestClose={() => setViewingFile(null)}
      />
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
    fontSize: 24,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  dueText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  dueTextOverdue: {
    color: colors.error,
  },
  overdueBadge: {
    backgroundColor: colors.amberSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  overdueBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textPrimary,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  adminCardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  adminCardTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  adminCardSubtitle: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  notSubmittedText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  submissionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  submissionFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submissionFileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  submissionFileName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  fileListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fileListName: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  fileListSize: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  pendingFilesList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressRow: {
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  submissionMeta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  quizBlock: {
    gap: spacing.md,
  },
  feedbackBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.xxs,
  },
  feedbackTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  scoreText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  feedbackText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  selectedFileText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
  },
});
