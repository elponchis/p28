import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button } from '@/components/primitives';
import {
  useCreateDevotionShareMutation,
  useCurrentGroupDevotionQuery,
  useDeleteDevotionShareMutation,
  useDeleteGroupDevotionMutation,
  useDevotionSharesQuery,
  useSetDevotionShareHeartMutation,
  useUpdateDevotionShareMutation,
} from '@/hooks/useApiQueries';
import type { DevotionQuestion, DevotionShare } from '@/lib/api';
import { getUserFacingError, isApiError } from '@/lib/api';
import {
  DEVOTION_BODY_MAX,
  DEVOTION_QUESTION_KEYS,
  DEVOTION_QUESTIONS,
  devotionTotals,
  groupThreadsByQuestion,
  localDateKey,
  threadDevotionShares,
  validateShareBody,
} from '@/lib/devotion';
import { confirm, notify } from '@/lib/dialogs';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface DailyDevotionCardProps {
  groupId: string;
  groupName: string;
  userId: string;
  /** Group leaders set, edit and delete the passage. */
  canManage: boolean;
}

const errorText = (error: unknown) =>
  error && isApiError(error) ? getUserFacingError(error) : t('common.error');

const bodyErrorText = (problem: 'empty' | 'tooLong') =>
  problem === 'empty' ? t('devotion.emptyError') : t('devotion.tooLongError');

/**
 * 오늘의 묵상: the day's passage, folded to one line with the group's hearts and comments, and
 * opened into four prompts, an answer box and what the group has shared — one list per prompt.
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
  const deleteDevotion = useDeleteGroupDevotionMutation();

  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState<DevotionQuestion>('who_is_god');
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  // Each prompt's shares open on their own; the one being answered starts open.
  const [openQuestions, setOpenQuestions] = useState<Set<DevotionQuestion>>(
    () => new Set<DevotionQuestion>(['who_is_god'])
  );

  const totals = useMemo(() => devotionTotals(shares), [shares]);
  const sections = useMemo(() => groupThreadsByQuestion(threadDevotionShares(shares)), [shares]);

  const openSettings = () => router.push(`/group/devotion-settings?groupId=${groupId}`);

  const handleDeleteDevotion = async () => {
    if (!devotion) return;
    const ok = await confirm({
      title: t('devotion.deleteDevotion'),
      message: t('devotion.deleteDevotionConfirm'),
      confirmLabel: t('devotion.delete'),
      cancelLabel: t('devotion.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteDevotion.mutate(
      { devotionId: devotion.id, groupId },
      { onError: (e) => void notify({ title: t('common.error'), message: errorText(e) }) }
    );
  };

  const header = (
    <View style={styles.headerRow}>
      <Ionicons name="book-outline" size={18} color={colors.secondary} />
      <Text style={styles.headerText} numberOfLines={1}>
        {t('devotion.title', { group: groupName })}
      </Text>
      {canManage && devotion ? (
        <View style={styles.leaderActions}>
          <Pressable
            onPress={openSettings}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('devotion.editDevotion')}
            accessibilityHint={t('devotion.settingsHint')}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable
            onPress={handleDeleteDevotion}
            disabled={deleteDevotion.isPending}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('devotion.deleteDevotion')}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      ) : null}
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
            onPress={openSettings}
            accessibilityLabel={t('devotion.setPassage')}
            accessibilityHint={t('devotion.settingsHint')}
          />
        ) : null}
      </View>
    );
  }

  const toggleSection = (q: DevotionQuestion) =>
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });

  const handleSubmit = () => {
    const problem = validateShareBody(draft);
    if (problem) {
      setDraftError(bodyErrorText(problem));
      return;
    }
    setDraftError(null);
    createShare.mutate(
      { devotionId: devotion.id, userId, input: { question, body: draft } },
      {
        onSuccess: () => {
          setDraft('');
          // Show the answer where it landed.
          setOpenQuestions((prev) => new Set(prev).add(question));
        },
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
          {sections.map(({ question: q, threads, count }) => {
            const open = openQuestions.has(q);
            return (
              <View key={q} style={styles.section}>
                <Pressable
                  onPress={() => toggleSection(q)}
                  style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${t(DEVOTION_QUESTION_KEYS[q].tab)}, ${count}`}
                  accessibilityHint={t('devotion.questionSectionHint')}
                >
                  <View style={styles.questionTag}>
                    <Text style={styles.questionTagText}>{t(DEVOTION_QUESTION_KEYS[q].tab)}</Text>
                  </View>
                  <Text style={styles.sectionCount}>{count}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
                {open ? (
                  threads.length === 0 ? (
                    <Text style={[styles.emptyText, styles.sectionEmpty]}>
                      {t('devotion.noShares')}
                    </Text>
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
                  )
                ) : null}
              </View>
            );
          })}
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
      setReplyError(bodyErrorText(problem));
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
  const updateShare = useUpdateDevotionShareMutation();
  const deleteShare = useDeleteDevotionShareMutation();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(share.body);
  const [editError, setEditError] = useState<string | null>(null);

  const name = share.authorDisplayName ?? t('common.loading');
  const hearted = share.heartedByMe;
  const isMine = share.userId === userId;

  const startEdit = () => {
    setEditText(share.body);
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = () => {
    const problem = validateShareBody(editText);
    if (problem) {
      setEditError(bodyErrorText(problem));
      return;
    }
    updateShare.mutate(
      { shareId: share.id, userId, body: editText },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => setEditError(errorText(e)),
      }
    );
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('devotion.delete'),
      message: t('devotion.deleteShareConfirm'),
      confirmLabel: t('devotion.delete'),
      cancelLabel: t('devotion.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteShare.mutate(
      { devotionId, shareId: share.id, userId },
      { onError: (e) => void notify({ title: t('common.error'), message: errorText(e) }) }
    );
  };

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
          {share.editedAt ? <Text style={styles.editedMark}>{t('devotion.edited')}</Text> : null}
        </View>

        {editing ? (
          <View style={styles.editBox}>
            <TextInput
              value={editText}
              onChangeText={(v) => {
                setEditText(v);
                if (editError) setEditError(null);
              }}
              multiline
              maxLength={DEVOTION_BODY_MAX}
              style={styles.input}
              accessibilityLabel={t('devotion.edit')}
              autoFocus
            />
            {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
            <View style={styles.editActions}>
              <Pressable
                onPress={() => setEditing(false)}
                style={styles.action}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.cancel')}
                hitSlop={6}
              >
                <Text style={styles.actionText}>{t('devotion.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                disabled={updateShare.isPending}
                style={styles.action}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.saveEdit')}
                hitSlop={6}
              >
                <Text style={[styles.actionText, styles.actionTextStrong]}>
                  {t('devotion.saveEdit')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.shareText}>{share.body}</Text>
        )}

        {editing ? null : (
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
            {isMine ? (
              <>
                <Pressable
                  onPress={startEdit}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.edit')}
                  hitSlop={6}
                >
                  <Text style={styles.actionText}>{t('devotion.edit')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleteShare.isPending}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.delete')}
                  hitSlop={6}
                >
                  <Text style={[styles.actionText, styles.actionTextDanger]}>
                    {t('devotion.delete')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
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
    flex: 1,
    minWidth: 0,
  },
  leaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xxs,
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
  // One collapsible list per prompt.
  section: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
  },
  sectionCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  sectionEmpty: {
    paddingBottom: spacing.xs,
  },
  thread: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
  editedMark: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
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
  editBox: {
    gap: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  actionTextStrong: {
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold,
  },
  actionTextDanger: {
    color: colors.error,
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
    backgroundColor: colors.surfaceContainerLowest,
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
