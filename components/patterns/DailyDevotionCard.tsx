import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button } from '@/components/primitives';
import {
  useCreateDevotionShareMutation,
  useCurrentGroupDevotionQuery,
  useDevotionSharesQuery,
  useSetDevotionShareHeartMutation,
} from '@/hooks/useApiQueries';
import type { DevotionQuestion, DevotionShare } from '@/lib/api';
import { getUserFacingError, isApiError } from '@/lib/api';
import {
  DEVOTION_BODY_MAX,
  DEVOTION_QUESTION_KEYS,
  DEVOTION_QUESTIONS,
  devotionTotals,
  localDateKey,
  threadDevotionShares,
  validateShareBody,
} from '@/lib/devotion';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface DailyDevotionCardProps {
  groupId: string;
  groupName: string;
  userId: string;
  /** Group leaders get a way to set the passage when there is none yet. */
  canManage: boolean;
}

const errorText = (error: unknown) =>
  error && isApiError(error) ? getUserFacingError(error) : t('common.error');

/**
 * 오늘의 묵상: the day's passage, folded to one line with the group's hearts and comments, and
 * opened into four prompts, an answer box and what the group has shared.
 */
export function DailyDevotionCard({
  groupId,
  groupName,
  userId,
  canManage,
}: DailyDevotionCardProps) {
  const router = useRouter();
  const today = localDateKey();
  const {
    data: devotion,
    isLoading,
    isError,
    error,
  } = useCurrentGroupDevotionQuery(groupId, today);
  const { data: shares = [] } = useDevotionSharesQuery(devotion?.id, userId);
  const createShare = useCreateDevotionShareMutation();

  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState<DevotionQuestion>('who_is_god');
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const totals = useMemo(() => devotionTotals(shares), [shares]);
  const threads = useMemo(() => threadDevotionShares(shares), [shares]);

  const header = (
    <View style={styles.headerRow}>
      <Ionicons name="book-outline" size={18} color={colors.secondary} />
      <Text style={styles.headerText} numberOfLines={1}>
        {t('devotion.title', { group: groupName })}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        {header}
        <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.card}>
        {header}
        <Text style={styles.errorText}>{errorText(error)}</Text>
      </View>
    );
  }

  if (!devotion) {
    return (
      <View style={styles.card}>
        {header}
        <Text style={styles.emptyText}>
          {canManage ? t('devotion.noDevotionLeader') : t('devotion.noDevotionMember')}
        </Text>
        {canManage ? (
          <Button
            title={t('devotion.setPassage')}
            variant="secondary"
            onPress={() => router.push(`/group/devotion-settings?groupId=${groupId}`)}
            accessibilityLabel={t('devotion.setPassage')}
            accessibilityHint={t('devotion.settingsHint')}
          />
        ) : null}
      </View>
    );
  }

  const handleSubmit = () => {
    const problem = validateShareBody(draft);
    if (problem) {
      setDraftError(problem === 'empty' ? t('devotion.emptyError') : t('devotion.tooLongError'));
      return;
    }
    setDraftError(null);
    createShare.mutate(
      { devotionId: devotion.id, userId, input: { question, body: draft } },
      {
        onSuccess: () => setDraft(''),
        onError: (e) => setDraftError(errorText(e)),
      }
    );
  };

  return (
    <View style={styles.card}>
      {header}
      <Text style={styles.reference}>{devotion.reference}</Text>
      <Text style={styles.passage} numberOfLines={expanded ? undefined : 1}>
        {devotion.passage}
      </Text>

      <View style={styles.countsRow}>
        <View
          style={styles.count}
          accessibilityLabel={t('devotion.heartsCount', { count: String(totals.hearts) })}
        >
          <Ionicons name="heart-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.countText}>{totals.hearts}</Text>
        </View>
        <View
          style={styles.count}
          accessibilityLabel={t('devotion.commentsCount', { count: String(totals.comments) })}
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.onSurfaceVariant} />
          <Text style={styles.countText}>{totals.comments}</Text>
        </View>
      </View>

      <Button
        title={expanded ? t('devotion.collapse') : t('devotion.shareButton')}
        variant={expanded ? 'secondary' : 'primary'}
        fullWidth
        onPress={() => setExpanded((v) => !v)}
        accessibilityLabel={expanded ? t('devotion.collapse') : t('devotion.shareButton')}
        accessibilityHint={t('devotion.shareButtonHint')}
      />

      {expanded ? (
        <View style={styles.expanded}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {DEVOTION_QUESTIONS.map((q) => {
              const active = q === question;
              return (
                <Pressable
                  key={q}
                  onPress={() => {
                    setQuestion(q);
                    setDraftError(null);
                  }}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(DEVOTION_QUESTION_KEYS[q].tab)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {t(DEVOTION_QUESTION_KEYS[q].tab)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.question}>{t(DEVOTION_QUESTION_KEYS[question].question)}</Text>
          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (draftError) setDraftError(null);
            }}
            placeholder={t('devotion.placeholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            maxLength={DEVOTION_BODY_MAX}
            style={styles.input}
            accessibilityLabel={t(DEVOTION_QUESTION_KEYS[question].question)}
          />
          {draftError ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {draftError}
            </Text>
          ) : null}
          <Button
            title={t('devotion.submit')}
            onPress={handleSubmit}
            disabled={createShare.isPending}
            accessibilityLabel={t('devotion.submit')}
            accessibilityHint={t('devotion.submitHint')}
            style={styles.submit}
          />

          <Text style={styles.sharesTitle}>{t('devotion.sharesTitle')}</Text>
          {threads.length === 0 ? (
            <Text style={styles.emptyText}>{t('devotion.noShares')}</Text>
          ) : (
            threads.map(({ share, replies }) => (
              <ShareThread
                key={share.id}
                share={share}
                replies={replies}
                devotionId={devotion.id}
                userId={userId}
              />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function ShareThread({
  share,
  replies,
  devotionId,
  userId,
}: {
  share: DevotionShare;
  replies: DevotionShare[];
  devotionId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const createShare = useCreateDevotionShareMutation();

  const handleReply = () => {
    const problem = validateShareBody(reply);
    if (problem) {
      setReplyError(problem === 'empty' ? t('devotion.emptyError') : t('devotion.tooLongError'));
      return;
    }
    setReplyError(null);
    createShare.mutate(
      { devotionId, userId, input: { parentShareId: share.id, body: reply } },
      {
        onSuccess: () => setReply(''),
        onError: (e) => setReplyError(errorText(e)),
      }
    );
  };

  const toggleLabel = open
    ? t('devotion.hideReplies')
    : replies.length > 0
      ? t('devotion.viewReplies', { count: String(replies.length) })
      : t('devotion.replyFirst');

  return (
    <View style={styles.thread}>
      <ShareRow share={share} devotionId={devotionId} userId={userId}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={styles.action}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={toggleLabel}
          hitSlop={6}
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.onSurfaceVariant} />
          <Text style={styles.actionText}>{toggleLabel}</Text>
        </Pressable>
      </ShareRow>

      {open ? (
        <View style={styles.replies}>
          {replies.map((r) => (
            <ShareRow key={r.id} share={r} devotionId={devotionId} userId={userId} compact />
          ))}
          <View style={styles.replyComposer}>
            <TextInput
              value={reply}
              onChangeText={(v) => {
                setReply(v);
                if (replyError) setReplyError(null);
              }}
              placeholder={t('devotion.replyPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={DEVOTION_BODY_MAX}
              style={styles.replyInput}
              accessibilityLabel={t('devotion.replyPlaceholder')}
              onSubmitEditing={handleReply}
            />
            <Pressable
              onPress={handleReply}
              disabled={createShare.isPending}
              style={({ pressed }) => [styles.replySend, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('devotion.sendReply')}
              accessibilityHint={t('devotion.sendReplyHint')}
            >
              <Ionicons name="send" size={16} color={colors.onPrimary} />
            </Pressable>
          </View>
          {replyError ? <Text style={styles.errorText}>{replyError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function ShareRow({
  share,
  devotionId,
  userId,
  compact = false,
  children,
}: {
  share: DevotionShare;
  devotionId: string;
  userId: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const setHeart = useSetDevotionShareHeartMutation();
  const name = share.authorDisplayName ?? t('common.loading');
  const hearted = share.heartedByMe;

  return (
    <View style={styles.shareRow}>
      <Avatar
        source={share.authorAvatarUrl ? { uri: share.authorAvatarUrl } : null}
        fallbackText={name}
        size={compact ? 'sm' : 'md'}
      />
      <View style={styles.shareBody}>
        <View style={styles.shareMeta}>
          <Text style={styles.shareName} numberOfLines={1}>
            {name}
          </Text>
          {share.question ? (
            <View style={styles.questionTag}>
              <Text style={styles.questionTagText}>
                {t(DEVOTION_QUESTION_KEYS[share.question].tab)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.shareText}>{share.body}</Text>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() =>
              setHeart.mutate({ devotionId, shareId: share.id, userId, hearted: !hearted })
            }
            style={styles.action}
            accessibilityRole="button"
            accessibilityState={{ selected: hearted }}
            accessibilityLabel={`${hearted ? t('devotion.heartRemove') : t('devotion.heartAdd')} (${share.heartCount})`}
            hitSlop={6}
          >
            <Ionicons
              name={hearted ? 'heart' : 'heart-outline'}
              size={16}
              color={hearted ? colors.secondary : colors.onSurfaceVariant}
            />
            <Text style={[styles.actionText, hearted && styles.actionTextActive]}>
              {share.heartCount}
            </Text>
          </Pressable>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  loading: {
    alignSelf: 'flex-start',
  },
  reference: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.primary,
  },
  passage: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  countsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  countText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
  },
  expanded: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerLow,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  question: {
    ...typography.titleMd,
    color: colors.primary,
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  submit: {
    alignSelf: 'flex-end',
  },
  sharesTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  thread: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.xs,
  },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  shareMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  shareName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 14,
    color: colors.onSurface,
    flexShrink: 1,
  },
  questionTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.chip,
    backgroundColor: colors.secondaryContainer,
  },
  questionTagText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
  },
  shareText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  actionText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  actionTextActive: {
    color: colors.secondary,
  },
  // Slack-style thread: indented under the answer with a rail down its left edge.
  replies: {
    marginLeft: spacing.xl,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replyInput: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replySend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
