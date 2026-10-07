import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import {
  useDevotionSharesQuery,
  useGroupDevotionByIdQuery,
  useGroupQuery,
} from '@/hooks/useApiQueries';
import { DEVOTION_QUESTION_KEYS, threadDevotionShares } from '@/lib/devotion';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

/**
 * One day from the archive: the passage as it was set, and what the group shared under it.
 *
 * Read-only on purpose. Answering belongs to the day's own card on the group screen; this is
 * for looking back, and a reply box here would quietly reopen days that have passed.
 */
export default function PastDevotionScreen() {
  const { id: devotionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: devotion, isLoading } = useGroupDevotionByIdQuery(devotionId, {
    enabled: !!devotionId,
  });
  const { data: group } = useGroupQuery(devotion?.groupId);
  const { data: shares = [] } = useDevotionSharesQuery(devotionId, userId, {
    enabled: !!devotionId && !!userId,
  });

  const threads = useMemo(() => threadDevotionShares(shares), [shares]);

  useEffect(() => {
    if (!devotionId) router.back();
  }, [devotionId, router]);

  if (!devotionId) return null;

  if (isLoading || !devotion) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}

      <View style={styles.plate}>
        <View style={styles.plateHead}>
          <Ionicons name="book-outline" size={15} color={colors.onPrimaryContainer} />
          <Text style={styles.plateRef}>{devotion.reference}</Text>
          <Text style={styles.plateDate}>{devotion.devotionDate}</Text>
        </View>
        <Text style={styles.passage}>{devotion.passage}</Text>
      </View>

      <Text style={styles.sharesTitle}>{t('devotion.sharesTitle')}</Text>
      {threads.length === 0 ? (
        <Text style={styles.empty}>{t('devotion.noShares')}</Text>
      ) : (
        threads.map(({ share, replies }) => (
          <View key={share.id} style={styles.share}>
            <View style={styles.shareHead}>
              <Avatar
                size="sm"
                source={share.authorAvatarUrl ? { uri: share.authorAvatarUrl } : null}
                fallbackText={share.authorDisplayName}
                accessibilityLabel={share.authorDisplayName ?? t('groups.groupMember')}
              />
              <Text style={styles.shareAuthor} numberOfLines={1}>
                {share.authorDisplayName ?? t('groups.groupMember')}
              </Text>
              <Text style={styles.shareTime}>{formatRelativeTime(share.createdAt)}</Text>
            </View>
            {share.question ? (
              <Text style={styles.shareQuestion}>
                {t(DEVOTION_QUESTION_KEYS[share.question].tab)}
              </Text>
            ) : null}
            <Text style={styles.shareBody}>{share.body}</Text>
            {replies.map((reply) => (
              <View key={reply.id} style={styles.reply}>
                <Text style={styles.shareAuthor} numberOfLines={1}>
                  {reply.authorDisplayName ?? t('groups.groupMember')}
                </Text>
                <Text style={styles.shareBody}>{reply.body}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  screenTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.primary,
  },
  plate: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  plateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  plateRef: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.onPrimaryContainer,
    flex: 1,
  },
  plateDate: {
    ...typography.caption,
    color: colors.onPrimaryContainer,
  },
  passage: {
    fontFamily: fontFamily.serifBold,
    fontSize: 19,
    lineHeight: 30,
    color: colors.onPrimary,
  },
  sharesTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 19,
    color: colors.primary,
  },
  share: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  shareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shareAuthor: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.onSurface,
    flex: 1,
  },
  shareTime: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  shareQuestion: {
    ...typography.caption,
    color: colors.secondary,
  },
  shareBody: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  reply: {
    marginTop: spacing.xs,
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.outlineVariant,
    gap: spacing.xxs,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
