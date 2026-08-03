import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button, Input } from '@/components/primitives';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { FileAttachmentModal } from '@/components/messages';
import { useAuth } from '@/hooks/useAuth';
import {
  useSubmissionDownloadUrlMutation,
  useSubmissionsByAssignmentQuery,
  useUpdateSubmissionFeedbackMutation,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SubmissionReviewScreen() {
  const {
    id: groupId,
    assignmentId,
    submissionId,
  } = useLocalSearchParams<{ id: string; assignmentId: string; submissionId: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const navigation = useNavigation();

  const {
    data: isGroupAdmin,
    isLoading: isRoleLoading,
    isError: isRoleError,
  } = useUserIsGroupAdminQuery(groupId, userId, { enabled: !!groupId && !!userId });
  const { data: submissions = [], isLoading: submissionsLoading } =
    useSubmissionsByAssignmentQuery(assignmentId, {
      enabled: !!assignmentId && isGroupAdmin === true,
    });
  const submission = useMemo(
    () => submissions.find((s) => s.id === submissionId),
    [submissions, submissionId]
  );

  const updateFeedbackMutation = useUpdateSubmissionFeedbackMutation();
  const downloadUrlMutation = useSubmissionDownloadUrlMutation();

  const [feedback, setFeedback] = useState('');
  const [scoreInput, setScoreInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{ url: string; fileName: string } | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: submission?.authorDisplayName ?? '' });
  }, [submission?.authorDisplayName, navigation]);

  useEffect(() => {
    if (!userId || isRoleLoading) return;
    if (isRoleError || isGroupAdmin !== true) {
      router.back();
    }
  }, [userId, isRoleLoading, isRoleError, isGroupAdmin, router]);

  useEffect(() => {
    if (!submission) return;
    setFeedback(submission.feedback ?? '');
    setScoreInput(submission.score !== undefined ? String(submission.score) : '');
  }, [submission]);

  const handleViewFile = () => {
    if (!submission) return;
    setError(null);
    downloadUrlMutation.mutate(
      { filePath: submission.filePath },
      {
        onSuccess: (url) => setViewingFile({ url, fileName: submission.fileName }),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleSave = () => {
    if (!userId || !submission) return;
    const trimmedScore = scoreInput.trim();
    const parsedScore = trimmedScore ? parseInt(trimmedScore, 10) : undefined;
    if (trimmedScore && Number.isNaN(parsedScore)) {
      setError(t('common.error'));
      return;
    }
    setError(null);
    updateFeedbackMutation.mutate(
      {
        submissionId: submission.id,
        reviewerUserId: userId,
        input: {
          feedback: feedback.trim() || undefined,
          score: parsedScore,
        },
      },
      {
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!groupId || !assignmentId || !submissionId) {
    return null;
  }

  if (isRoleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isGroupAdmin !== true) {
    return null;
  }

  if (submissionsLoading && !submission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!submission) {
    return null;
  }

  const isSaving = updateFeedbackMutation.isPending;

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
          <View style={styles.studentRow}>
            <Avatar
              source={submission.authorAvatarUrl ? { uri: submission.authorAvatarUrl } : null}
              fallbackText={submission.authorDisplayName}
              size="lg"
            />
            <View style={styles.studentTextCol}>
              <Text style={styles.studentName}>
                {submission.authorDisplayName ?? t('common.loading')}
              </Text>
              <Text style={styles.submittedAt}>
                {t('submissions.submittedAtLabel')}: {formatRelativeTime(submission.submittedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.fileCard}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={styles.fileName} numberOfLines={2}>
              {submission.fileName}
            </Text>
          </View>
          <Button
            title={t('submissions.viewFile')}
            variant="secondary"
            onPress={handleViewFile}
            disabled={downloadUrlMutation.isPending}
            accessibilityLabel={t('submissions.viewFile')}
            accessibilityHint={t('submissions.viewFileHint')}
            style={styles.viewFileButton}
          />

          <Text style={styles.sectionTitle}>{t('submissions.reviewSectionTitle')}</Text>

          <Input
            label={t('submissions.feedbackLabel')}
            value={feedback}
            onChangeText={setFeedback}
            placeholder={t('submissions.feedbackPlaceholder')}
            multiline
            numberOfLines={4}
            inputStyle={{ minHeight: 100 }}
            editable={!isSaving}
            accessibilityLabel={t('submissions.feedbackLabel')}
          />

          <Input
            label={t('submissions.scoreLabel')}
            value={scoreInput}
            onChangeText={setScoreInput}
            placeholder={t('submissions.scorePlaceholder')}
            keyboardType="number-pad"
            editable={!isSaving}
            accessibilityLabel={t('submissions.scoreLabel')}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={isSaving ? t('common.loading') : t('common.save')}
            onPress={handleSave}
            disabled={isSaving}
            fullWidth
            accessibilityLabel={t('common.save')}
            accessibilityHint={t('submissions.saveFeedbackHint')}
            style={styles.saveButton}
          />
        </DesktopContentContainer>
      </ScrollView>

      <FileAttachmentModal
        visible={!!viewingFile}
        fileUrl={viewingFile?.url ?? null}
        fileName={viewingFile?.fileName ?? ''}
        onRequestClose={() => setViewingFile(null)}
      />
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
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  studentTextCol: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  submittedAt: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fileName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
  },
  viewFileButton: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
  saveButton: {
    marginTop: spacing.sm,
  },
});
