import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button } from '@/components/primitives';
import {
  useCreateDevotionShareMutation,
  useCurrentGroupDevotionQuery,
  useDeleteDevotionShareMutation,
  useDeleteGroupDevotionMutation,
  useDevotionSharesQuery,
  useProfileQuery,
  useSetDevotionShareHeartMutation,
  useUpdateDevotionShareMutation,
} from '@/hooks/useApiQueries';
import type { DevotionQuestion, DevotionShare } from '@/lib/api';
import { getUserFacingError, isApiError } from '@/lib/api';
import { formatMessageSentClockTime } from '@/lib/dates';
import {
  DEVOTION_BODY_MAX,
  DEVOTION_QUESTION_KEYS,
  DEVOTION_QUESTIONS,
  devotionDraftKey,
  devotionTotals,
  localDateKey,
  threadDevotionShares,
  validateShareBody,
  VISIBLE_SHARES_STEP,
} from '@/lib/devotion';
import { confirm, notify } from '@/lib/dialogs';
import { t } from '@/lib/i18n';
import { colors, fontFamily, fontSize, radius, space, spacing, typography } from '@/theme/tokens';

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
 * 오늘의 묵상: the day's passage on a navy banner, the four prompts and an answer box under it,
 * then what the group shared — one list, each answer tagged with the prompt it answers and
 * carrying its own thread.
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
  const [draftSaved, setDraftSaved] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_SHARES_STEP);

  const totals = useMemo(() => devotionTotals(shares), [shares]);
  const threads = useMemo(() => threadDevotionShares(shares), [shares]);
  const visibleThreads = threads.slice(0, visibleCount);
  const hiddenThreads = threads.length - visibleThreads.length;

  // A half-written answer survives switching prompts, folding the card and leaving the screen.
  const draftKey = devotion ? devotionDraftKey(devotion.id, question) : null;
  useEffect(() => {
    if (!draftKey) return;
    let current = true;
    AsyncStorage.getItem(draftKey)
      .then((saved) => {
        if (current) setDraft(saved ?? '');
      })
      .catch(() => {
        // A draft that cannot be read is not worth interrupting the reader for.
      });
    return () => {
      current = false;
    };
  }, [draftKey]);

  const saveDraft = useCallback(async () => {
    if (!draftKey) return;
    try {
      await AsyncStorage.setItem(draftKey, draft);
      setDraftSaved(true);
    } catch (e) {
      setDraftError(errorText(e));
    }
  }, [draftKey, draft]);

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

  // The passage is what the card is for, so it gets a navy band of its own at the top.
  const banner = (label: string, passage?: string) => (
    <View style={styles.banner}>
      <View style={styles.bannerLabelRow}>
        <Ionicons name="book-outline" size={15} color={colors.onPrimaryContainer} />
        <Text style={styles.bannerLabel} numberOfLines={1}>
          {label}
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
              <Ionicons name="create-outline" size={17} color={colors.onPrimaryContainer} />
            </Pressable>
            <Pressable
              onPress={handleDeleteDevotion}
              disabled={deleteDevotion.isPending}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t('devotion.deleteDevotion')}
              hitSlop={6}
            >
              <Ionicons name="trash-outline" size={17} color={colors.onPrimaryContainer} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {passage ? <Text style={styles.bannerPassage}>{passage}</Text> : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        {banner(t('devotion.title', { group: groupName }))}
        <View style={styles.body}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.card}>
        {banner(t('devotion.title', { group: groupName }))}
        <View style={styles.body}>
          <Text style={styles.errorText}>{errorText(error)}</Text>
        </View>
      </View>
    );
  }

  if (!devotion) {
    return (
      <View style={styles.card}>
        {banner(t('devotion.title', { group: groupName }))}
        <View style={styles.body}>
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
      </View>
    );
  }

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
          setDraftSaved(false);
          if (draftKey) void AsyncStorage.removeItem(draftKey).catch(() => {});
        },
        onError: (e) => setDraftError(errorText(e)),
      }
    );
  };

  return (
    <View style={styles.card}>
      {banner(
        `${t('devotion.title', { group: groupName })} · ${devotion.reference}`,
        devotion.passage
      )}

      {expanded ? (
        <>
          <View style={styles.composer}>
            <View style={styles.tabs} accessibilityRole="tablist">
              {DEVOTION_QUESTIONS.map((q) => {
                const active = q === question;
                return (
                  <Pressable
                    key={q}
                    onPress={() => {
                      setQuestion(q);
                      setDraftError(null);
                      setDraftSaved(false);
                    }}
                    style={({ pressed }) => [
                      styles.tab,
                      active && styles.tabActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(DEVOTION_QUESTION_KEYS[q].tab)}
                  >
                    <Text
                      style={[styles.tabText, active && styles.tabTextActive]}
                      numberOfLines={1}
                    >
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
                if (draftSaved) setDraftSaved(false);
              }}
              placeholder={t('devotion.placeholder')}
              placeholderTextColor={colors.textMuted}
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

            <View style={styles.composerFooter}>
              <Text style={styles.hint}>
                {draftSaved ? t('devotion.draftSaved') : t('devotion.oneIsEnough')}
              </Text>
              <View style={styles.composerButtons}>
                <Pressable
                  onPress={() => void saveDraft()}
                  style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.draftSave')}
                  accessibilityHint={t('devotion.draftSaveHint')}
                >
                  <Text style={styles.outlineButtonText}>{t('devotion.draftSave')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={createShare.isPending}
                  style={({ pressed }) => [styles.filledButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.submit')}
                  accessibilityHint={t('devotion.submitHint')}
                >
                  <Text style={styles.filledButtonText}>{t('devotion.submit')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.shares}>
            <View style={styles.sharesHeader}>
              <Text style={styles.sharesTitle}>{t('devotion.sharesTitle')}</Text>
              <Text style={styles.sharesCount}>{threads.length}</Text>
              <Pressable
                onPress={() => setExpanded(false)}
                style={styles.linkButton}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.collapse')}
                hitSlop={6}
              >
                <Text style={styles.linkText}>{t('devotion.collapse')}</Text>
              </Pressable>
            </View>

            {threads.length === 0 ? (
              <Text style={styles.emptyText}>{t('devotion.noShares')}</Text>
            ) : (
              visibleThreads.map(({ share, replies }) => (
                <ShareThread
                  key={share.id}
                  share={share}
                  replies={replies}
                  devotionId={devotion.id}
                  userId={userId}
                />
              ))
            )}

            {hiddenThreads > 0 ? (
              <Pressable
                onPress={() => setVisibleCount((n) => n + VISIBLE_SHARES_STEP)}
                style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.moreShares', { count: String(hiddenThreads) })}
              >
                <Text style={styles.moreButtonText}>
                  {t('devotion.moreShares', { count: String(hiddenThreads) })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.foldedRow}>
          <View
            style={styles.count}
            accessibilityLabel={t('devotion.heartsCount', { count: String(totals.hearts) })}
          >
            <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
            <Text style={styles.countText}>{totals.hearts}</Text>
          </View>
          <View
            style={styles.count}
            accessibilityLabel={t('devotion.commentsCount', { count: String(totals.comments) })}
          >
            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
            <Text style={styles.countText}>{totals.comments}</Text>
          </View>
          <View style={styles.foldedSpacer} />
          <Pressable
            onPress={() => setExpanded(true)}
            style={({ pressed }) => [styles.filledButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('devotion.shareButton')}
            accessibilityHint={t('devotion.shareButtonHint')}
          >
            <Text style={styles.filledButtonText}>{t('devotion.shareButton')}</Text>
          </Pressable>
        </View>
      )}
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
  const { data: me } = useProfileQuery(userId);

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
          style={styles.linkButton}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={toggleLabel}
          hitSlop={6}
        >
          <Text style={styles.linkText}>{toggleLabel}</Text>
        </Pressable>
      </ShareRow>

      {open ? (
        <View style={styles.replies}>
          {replies.map((r) => (
            <ShareRow key={r.id} share={r} devotionId={devotionId} userId={userId} compact />
          ))}
          <View style={styles.replyComposer}>
            <Avatar
              source={me?.avatarUrl ? { uri: me.avatarUrl } : null}
              fallbackText={me?.displayName ?? ''}
              size="sm"
            />
            <TextInput
              value={reply}
              onChangeText={(v) => {
                setReply(v);
                if (replyError) setReplyError(null);
              }}
              placeholder={t('devotion.replyPlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={DEVOTION_BODY_MAX}
              style={styles.replyInput}
              accessibilityLabel={t('devotion.replyPlaceholder')}
              onSubmitEditing={handleReply}
            />
            <Pressable
              onPress={handleReply}
              disabled={createShare.isPending}
              style={({ pressed }) => [styles.replySend, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('devotion.sendReply')}
              accessibilityHint={t('devotion.sendReplyHint')}
            >
              <Ionicons name="send" size={15} color={colors.onPrimary} />
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
    <View style={compact ? styles.replyRow : styles.shareRow}>
      <Avatar
        source={share.authorAvatarUrl ? { uri: share.authorAvatarUrl } : null}
        fallbackText={name}
        size="sm"
      />
      <View style={styles.shareBody}>
        <View style={styles.shareMeta}>
          <Text style={styles.shareName} numberOfLines={1}>
            {name}
          </Text>
          {/* The prompt an answer belongs to travels with it, so one list still reads clearly. */}
          {share.question ? (
            <View style={styles.questionTag}>
              <Text style={styles.questionTagText}>
                {t(DEVOTION_QUESTION_KEYS[share.question].tab)}
              </Text>
            </View>
          ) : null}
          <Text style={styles.shareTime}>{formatMessageSentClockTime(share.createdAt)}</Text>
          {share.editedAt ? <Text style={styles.shareTime}>{t('devotion.edited')}</Text> : null}
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
                style={styles.linkButton}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.cancel')}
                hitSlop={6}
              >
                <Text style={styles.linkText}>{t('devotion.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                disabled={updateShare.isPending}
                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('devotion.saveEdit')}
              >
                <Text style={styles.outlineButtonText}>{t('devotion.saveEdit')}</Text>
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
              style={({ pressed }) => [
                styles.heartPill,
                hearted && styles.heartPillActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: hearted }}
              accessibilityLabel={`${hearted ? t('devotion.heartRemove') : t('devotion.heartAdd')} (${share.heartCount})`}
              hitSlop={6}
            >
              <Ionicons
                name={hearted ? 'heart' : 'heart-outline'}
                size={14}
                color={hearted ? colors.onSecondaryContainer : colors.textMuted}
              />
              <Text style={[styles.heartCount, hearted && styles.heartCountActive]}>
                {share.heartCount}
              </Text>
            </Pressable>
            {children}
            {isMine ? (
              <>
                <Pressable
                  onPress={startEdit}
                  style={styles.linkButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.edit')}
                  hitSlop={6}
                >
                  <Text style={styles.linkText}>{t('devotion.edit')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleteShare.isPending}
                  style={styles.linkButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('devotion.delete')}
                  hitSlop={6}
                >
                  <Text style={[styles.linkText, styles.linkTextDanger]}>
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
    overflow: 'hidden',
  },
  banner: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  bannerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerLabel: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    flex: 1,
    minWidth: 0,
  },
  bannerPassage: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize.title,
    lineHeight: 30,
    color: colors.onPrimary,
  },
  leaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButton: {
    padding: spacing.xxs,
  },
  body: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  loading: {
    alignSelf: 'flex-start',
  },
  foldedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.cardPadding,
  },
  foldedSpacer: {
    flex: 1,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  countText: {
    ...typography.labelMd,
    color: colors.textMuted,
  },
  composer: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  tabActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  tabText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  question: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    ...typography.labelMd,
    color: colors.textMuted,
    flexShrink: 1,
  },
  composerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filledButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  filledButtonText: {
    ...typography.labelLg,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.onPrimary,
  },
  outlineButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  outlineButtonText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.85,
  },
  // The shared answers sit below the composer, divided from it the way the mockup divides them.
  shares: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    padding: spacing.cardPadding,
    gap: spacing.md,
  },
  sharesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sharesTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  sharesCount: {
    ...typography.labelMd,
    color: colors.textMuted,
    flex: 1,
  },
  thread: {
    gap: spacing.xs,
  },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  shareTime: {
    ...typography.labelMd,
    color: colors.textMuted,
  },
  questionTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: space.s0,
    borderRadius: radius.chip,
    backgroundColor: colors.primaryFixed,
  },
  questionTagText: {
    ...typography.labelMd,
    color: colors.primary,
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  heartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  heartPillActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  heartCount: {
    ...typography.labelMd,
    color: colors.textMuted,
  },
  heartCountActive: {
    color: colors.onSecondaryContainer,
  },
  linkButton: {
    paddingVertical: space.s0,
  },
  linkText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  linkTextDanger: {
    color: colors.error,
  },
  // The thread is indented under its answer with a rail down its left edge.
  replies: {
    marginLeft: spacing.xl,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
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
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replySend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  moreButtonText: {
    ...typography.labelLg,
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
});
