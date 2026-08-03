import { useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { FileAttachmentModal } from '@/components/messages';
import { useAuth } from '@/hooks/useAuth';
import {
  useAssignmentQuery,
  useMySubmissionQuery,
  useSubmissionDownloadUrlMutation,
  useUpsertSubmissionMutation,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import {
  isAllowedSubmissionMimeType,
  MAX_SUBMISSION_FILE_BYTES,
  SUBMISSION_PICKER_MIME_WHITELIST,
} from '@/lib/api/assignmentSubmissions';
import { normalizeMimeTypeForAllowlist } from '@/lib/api/messageAttachments';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import { formatGroupEventDateTime, formatRelativeTime, isGroupEventPast } from '@/lib/dates';
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
  const upsertMutation = useUpsertSubmissionMutation();
  const downloadUrlMutation = useSubmissionDownloadUrlMutation();

  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{ url: string; fileName: string } | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: assignment?.title ?? '' });
  }, [assignment?.title, navigation]);

  const isPastDue = useMemo(
    () => !!assignment?.dueDate && isGroupEventPast(assignment.dueDate),
    [assignment?.dueDate]
  );

  const handlePickFile = async () => {
    setError(null);
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await enqueueDocumentPick(() =>
        DocumentPicker.getDocumentAsync({
          type: SUBMISSION_PICKER_MIME_WHITELIST,
          multiple: false,
          copyToCacheDirectory: true,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const doc = result.assets[0];
    const mime = normalizeMimeTypeForAllowlist(doc.mimeType ?? 'application/octet-stream');
    if (!isAllowedSubmissionMimeType(mime)) {
      setError(t('attachments.unsupportedFileType'));
      return;
    }
    if (doc.size != null && doc.size > MAX_SUBMISSION_FILE_BYTES) {
      setError(t('attachments.fileTooLarge'));
      return;
    }
    setPendingFile({ uri: doc.uri, name: doc.name || 'file', size: doc.size ?? undefined, mimeType: mime });
  };

  const handleSubmit = () => {
    if (!userId || !assignmentId || !pendingFile || isPastDue) return;
    setError(null);
    upsertMutation.mutate(
      {
        assignmentId,
        userId,
        input: {
          fileUri: pendingFile.uri,
          fileName: pendingFile.name,
          fileSize: pendingFile.size,
          mimeType: pendingFile.mimeType,
        },
      },
      {
        onSuccess: () => {
          setPendingFile(null);
          refetchMySubmission();
        },
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleViewMyFile = () => {
    if (!mySubmission) return;
    setError(null);
    downloadUrlMutation.mutate(
      { filePath: mySubmission.filePath },
      {
        onSuccess: (url) => setViewingFile({ url, fileName: mySubmission.fileName }),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!assignmentId) {
    return null;
  }

  if ((assignmentLoading && !assignment) || (submissionLoading && userId && !mySubmission)) {
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('submissions.mySubmissionTitle')}</Text>
        {mySubmission ? (
          <View style={styles.submissionCard}>
            <View style={styles.submissionFileRow}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              <View style={styles.submissionFileTextCol}>
                <Text style={styles.submissionFileName} numberOfLines={2}>
                  {mySubmission.fileName}
                </Text>
                <Text style={styles.submissionMeta}>
                  {t('submissions.submittedAtLabel')}: {formatRelativeTime(mySubmission.submittedAt)}
                </Text>
              </View>
            </View>
            <Button
              title={t('submissions.viewFile')}
              variant="secondary"
              onPress={handleViewMyFile}
              disabled={downloadUrlMutation.isPending}
              accessibilityLabel={t('submissions.viewFile')}
              accessibilityHint={t('submissions.viewFileHint')}
            />

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

      {isPastDue ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {mySubmission
              ? t('submissions.pastDueCannotResubmit')
              : t('submissions.pastDueCannotSubmit')}
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          {pendingFile ? (
            <View style={styles.selectedFileRow}>
              <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
              <Text style={styles.selectedFileText} numberOfLines={2}>
                {t('submissions.selectedFileLabel')}: {pendingFile.name}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={pendingFile ? t('submissions.changeFile') : t('submissions.pickFile')}
              variant="secondary"
              onPress={handlePickFile}
              disabled={isSubmitting}
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
              disabled={!pendingFile || isSubmitting}
              fullWidth
              accessibilityLabel={mySubmission ? t('submissions.resubmit') : t('submissions.submit')}
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
  submissionMeta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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
