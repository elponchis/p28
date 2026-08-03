import { useEffect, useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { Avatar } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  useAssignmentQuery,
  useSubmissionsByAssignmentQuery,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function AssignmentSubmissionsListScreen() {
  const { id: groupId, assignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
  }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const navigation = useNavigation();

  const { data: assignment } = useAssignmentQuery(assignmentId, { enabled: !!assignmentId });
  const {
    data: isGroupAdmin,
    isLoading: isRoleLoading,
    isError: isRoleError,
  } = useUserIsGroupAdminQuery(groupId, userId, { enabled: !!groupId && !!userId });
  const { data: submissions = [], isLoading: submissionsLoading } =
    useSubmissionsByAssignmentQuery(assignmentId, {
      enabled: !!assignmentId && isGroupAdmin === true,
    });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('submissions.listTitle') });
  }, [navigation]);

  useEffect(() => {
    if (!userId || isRoleLoading) return;
    if (isRoleError || isGroupAdmin !== true) {
      router.back();
    }
  }, [userId, isRoleLoading, isRoleError, isGroupAdmin, router]);

  // Unreviewed submissions first (so admins tackle the backlog); within each group, newest first.
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const aReviewed = !!a.reviewedAt;
      const bReviewed = !!b.reviewedAt;
      if (aReviewed !== bReviewed) return aReviewed ? 1 : -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [submissions]);

  if (!groupId || !assignmentId) {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {assignment?.title ? <Text style={styles.title}>{assignment.title}</Text> : null}

      {submissionsLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : sortedSubmissions.length === 0 ? (
        <EmptyState
          iconName="document-text-outline"
          title={t('submissions.noSubmissions')}
          subtitle={t('submissions.noSubmissionsHint')}
        />
      ) : (
        <View style={styles.list}>
          {sortedSubmissions.map((submission) => {
            const isReviewed = !!submission.reviewedAt;
            return (
              <Pressable
                key={submission.id}
                onPress={() =>
                  router.push(
                    `/group/${groupId}/assignment/${assignmentId}/submissions/${submission.id}`
                  )
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
                accessibilityLabel={submission.authorDisplayName ?? t('common.loading')}
                accessibilityHint={t('submissions.openSubmissionHint')}
                accessibilityRole="button"
              >
                <Avatar
                  source={submission.authorAvatarUrl ? { uri: submission.authorAvatarUrl } : null}
                  fallbackText={submission.authorDisplayName}
                  size="md"
                />
                <View style={styles.cardBody}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {submission.authorDisplayName ?? t('common.loading')}
                  </Text>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {submission.fileName}
                  </Text>
                  <Text style={styles.meta}>{formatRelativeTime(submission.submittedAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isReviewed ? styles.statusBadgeReviewed : styles.statusBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isReviewed ? styles.statusBadgeTextReviewed : styles.statusBadgeTextPending,
                    ]}
                  >
                    {isReviewed
                      ? `${t('submissions.reviewedBadge')}${
                          submission.score !== undefined ? ` · ${submission.score}` : ''
                        }`
                      : t('submissions.pendingBadge')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
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
    fontSize: 22,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  fileName: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  meta: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  statusBadgeReviewed: {
    backgroundColor: colors.secondaryContainer,
  },
  statusBadgePending: {
    backgroundColor: colors.amberSoft,
  },
  statusBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
  },
  statusBadgeTextReviewed: {
    color: colors.onSecondaryContainer,
  },
  statusBadgeTextPending: {
    color: colors.textPrimary,
  },
});
