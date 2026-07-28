import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import type { MessageAttachment } from '@/lib/api';
import { formatMessageSentClockTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, spacing, typography, fontFamily } from '@/theme/tokens';

import { REACTION_EMOJI } from './constants';
import { MessageAttachmentsBlock } from './MessageAttachmentsBlock';
import type { MessageLike, ParentMessageLike, PostReactionType } from './types';

export interface MessageRowProps {
  post: MessageLike;
  parentPost?: ParentMessageLike | null;
  /** True when this is the first message in a consecutive run from the same user. */
  isFirstInGroup?: boolean;
  /** True when this is the last message in a consecutive run from the same user. */
  isLastInGroup?: boolean;
  onImagePress?: (url: string) => void;
  onVideoPress?: (att: MessageAttachment) => void;
  onFilePress?: (att: MessageAttachment) => void;
  onLongPress?: () => void;
  onAddReaction?: (reactionType: PostReactionType) => void;
  onRemoveReaction?: (reactionType: PostReactionType) => void;
  onAuthorPress?: () => void;
  canReact?: boolean;
  currentUserId?: string;
  /** Retry a failed optimistic send (own messages only). */
  onRetrySend?: () => void;
  /** When false, hide the trailing sent-time label (e.g. same-minute cluster). */
  showSentClockTime?: boolean;
  /** Extra top margin when the previous message was from the other side (you vs someone else). */
  extraGapAfterPeerChange?: boolean;
}

export function MessageRow({
  post,
  parentPost,
  isFirstInGroup = true,
  isLastInGroup = true,
  onImagePress,
  onVideoPress,
  onFilePress,
  onLongPress,
  onAddReaction,
  onRemoveReaction,
  onAuthorPress,
  canReact = false,
  currentUserId,
  onRetrySend,
  showSentClockTime = true,
  extraGapAfterPeerChange = false,
}: MessageRowProps) {
  const counts = post.reactionCounts ?? { prayer: 0, laugh: 0, thumbsUp: 0 };
  const userReactions = post.userReactionTypes ?? [];
  const hasReactions = counts.prayer > 0 || counts.laugh > 0 || counts.thumbsUp > 0;
  const isOwnMessage = !!currentUserId && post.userId === currentUserId;
  const outboundStatus = post.outboundStatus;
  const showFailedOutbound = isOwnMessage && outboundStatus === 'failed' && !!onRetrySend;
  const showSendingOutbound = isOwnMessage && outboundStatus === 'sending';

  const handleLongPress = () => {
    if (canReact && onLongPress && !outboundStatus) onLongPress();
  };

  const isUserReaction = (type: PostReactionType) =>
    !!currentUserId && userReactions.includes(type);

  const clockTime = formatMessageSentClockTime(post.createdAt);
  const isEdited = post.updatedAt && post.updatedAt !== post.createdAt;

  const longPressHint = showFailedOutbound
    ? undefined
    : canReact
      ? isOwnMessage
        ? t('discussions.messageRowLongPressHintOwn')
        : t('discussions.messageRowLongPressHintOther')
      : undefined;

  return (
    <View
      style={[styles.messageWrapper, extraGapAfterPeerChange && styles.messageWrapperPeerChange]}
    >
      <View style={styles.messageSliding}>
        <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
          {showFailedOutbound ? (
            <Pressable
              onPress={onRetrySend}
              style={styles.retryButton}
              accessibilityLabel={t('discussions.retrySend')}
              accessibilityHint={t('discussions.retrySendHint')}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={22} color={colors.error} />
            </Pressable>
          ) : null}
          {/* Avatar (others) — only on last message in a consecutive group */}
          {isOwnMessage ? null : isLastInGroup ? (
            <Pressable
              onPress={onAuthorPress}
              style={styles.avatarContainer}
              accessibilityLabel={
                post.authorDisplayName ? `View ${post.authorDisplayName}'s profile` : 'View profile'
              }
              accessibilityRole="button"
            >
              <Avatar
                source={post.authorAvatarUrl ? { uri: post.authorAvatarUrl } : null}
                fallbackText={post.authorDisplayName}
                size="md"
              />
            </Pressable>
          ) : (
            <View style={styles.avatarSpacer} />
          )}

          {/* Content column */}
          <View style={[styles.contentColumn, isOwnMessage && styles.contentColumnOwn]}>
            {/* Name row — first in group; own side only while sending */}
            {isFirstInGroup && (!isOwnMessage || showSendingOutbound) ? (
              <View style={[styles.metaRow, isOwnMessage && styles.metaRowOwn]}>
                {isOwnMessage ? (
                  <View style={styles.metaRowOwnTime}>
                    <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
                  </View>
                ) : (
                  <Pressable onPress={onAuthorPress} accessibilityRole="link">
                    <Text style={styles.authorName}>
                      {post.authorDisplayName ?? t('common.loading')}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            <View style={styles.messageBubbleColumn}>
              <View style={[styles.bubbleAndTimeRow, isOwnMessage && styles.bubbleAndTimeRowOwn]}>
                {isOwnMessage && showSentClockTime ? (
                  <Text
                    style={[styles.sentClockTime, styles.sentClockTimeOwn]}
                    accessibilityLabel={clockTime}
                  >
                    {clockTime}
                  </Text>
                ) : null}
                <View style={styles.bubbleStack}>
                  <Pressable
                    onLongPress={canReact ? handleLongPress : undefined}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.bubble,
                      isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
                      showFailedOutbound && styles.bubbleFailed,
                      pressed && canReact && !outboundStatus && styles.bubblePressed,
                    ]}
                    accessibilityLabel={
                      showFailedOutbound
                        ? t('discussions.sendFailed')
                        : t('discussions.reactToReply')
                    }
                    accessibilityHint={longPressHint}
                    accessibilityRole="button"
                  >
                    {parentPost ? (
                      <View style={[styles.replyPreview, isOwnMessage && styles.replyPreviewOwn]}>
                        <Text
                          style={[
                            styles.replyPreviewAuthor,
                            isOwnMessage && styles.replyPreviewAuthorOwn,
                          ]}
                        >
                          {t('discussions.replyingTo')}{' '}
                          {parentPost.authorDisplayName ?? t('common.loading')}
                        </Text>
                        <Text
                          style={[
                            styles.replyPreviewBody,
                            isOwnMessage && styles.replyPreviewBodyOwn,
                          ]}
                          numberOfLines={2}
                        >
                          {parentPost.body ?? ''}
                        </Text>
                      </View>
                    ) : null}

                    {post.body ? (
                      <Text style={[styles.messageBody, isOwnMessage && styles.messageBodyOwn]}>
                        {post.body}
                      </Text>
                    ) : null}

                    {isEdited ? (
                      <Text style={[styles.editedLabel, isOwnMessage && styles.editedLabelOwn]}>
                        {t('discussions.edited')}
                      </Text>
                    ) : null}

                    <MessageAttachmentsBlock
                      post={post}
                      isOwnMessage={isOwnMessage}
                      onImagePress={onImagePress}
                      onVideoPress={onVideoPress}
                      onFilePress={onFilePress}
                    />
                    {showFailedOutbound ? (
                      <Text style={styles.failedOutboundLabel}>{t('discussions.sendFailed')}</Text>
                    ) : null}
                  </Pressable>
                </View>
                {!isOwnMessage && showSentClockTime ? (
                  <Text
                    style={[styles.sentClockTime, styles.sentClockTimeOther]}
                    accessibilityLabel={clockTime}
                  >
                    {clockTime}
                  </Text>
                ) : null}
              </View>
              {hasReactions ? (
                <View style={styles.reactionBadges}>
                  {(['prayer', 'laugh', 'thumbs_up'] as PostReactionType[]).map((type) => {
                    const countKey = type === 'thumbs_up' ? 'thumbsUp' : type;
                    if ((counts as unknown as Record<string, number>)[countKey] <= 0) return null;
                    const count = (counts as unknown as Record<string, number>)[countKey];
                    const isMine = isUserReaction(type);
                    const onPress =
                      canReact && (isMine ? onRemoveReaction : onAddReaction)
                        ? () => (isMine ? onRemoveReaction?.(type) : onAddReaction?.(type))
                        : undefined;
                    return (
                      <Pressable
                        key={type}
                        onPress={onPress}
                        style={({ pressed }) => [
                          styles.reactionBadge,
                          isOwnMessage
                            ? styles.reactionBadgeOwnBubble
                            : styles.reactionBadgeOtherBubble,
                          pressed && canReact && styles.reactionBadgePressed,
                        ]}
                        disabled={!onPress}
                        accessibilityLabel={
                          isMine
                            ? `Remove ${type} reaction (${count})`
                            : onPress
                              ? `Add ${type} reaction (${count})`
                              : `${REACTION_EMOJI[type]} ${count}`
                        }
                        accessibilityRole={onPress ? 'button' : 'text'}
                      >
                        <Text style={styles.reactionEmoji}>{REACTION_EMOJI[type]}</Text>
                        {count > 1 ? <Text style={styles.reactionCount}>{count}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>

          {/* Own message avatar on the right — only on last in group */}
          {isOwnMessage ? (
            isLastInGroup ? (
              <View style={styles.avatarContainer}>
                <Avatar
                  source={post.authorAvatarUrl ? { uri: post.authorAvatarUrl } : null}
                  fallbackText={post.authorDisplayName}
                  size="md"
                />
              </View>
            ) : (
              <View style={styles.avatarSpacer} />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

const BUBBLE_RADIUS = 16;

const styles = StyleSheet.create({
  messageWrapper: {
    position: 'relative',
    marginBottom: 1,
    overflow: 'hidden',
    paddingBottom: 1,
  },
  messageWrapperPeerChange: {
    marginTop: spacing.xxs,
  },
  messageSliding: { position: 'relative' },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  messageRowOwn: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  avatarContainer: {
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
  avatarSpacer: {
    width: 36,
  },

  contentColumn: {
    flex: 1,
    maxWidth: '78%',
    alignItems: 'flex-start',
  },
  contentColumnOwn: {
    alignItems: 'flex-end',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
    paddingHorizontal: spacing.xxs,
  },
  metaRowOwn: {
    flexDirection: 'row',
  },
  metaRowOwnTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  authorName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },

  messageBubbleColumn: {
    maxWidth: '100%',
  },
  bubbleAndTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  bubbleAndTimeRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleStack: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  sentClockTime: {
    ...typography.caption,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    paddingVertical: 2,
  },
  sentClockTimeOwn: {
    marginEnd: spacing.xs,
  },
  sentClockTimeOther: {
    marginStart: spacing.xs,
  },

  bubble: {
    borderRadius: BUBBLE_RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: '100%',
  },
  bubbleOther: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryContainer,
    borderTopRightRadius: 4,
  },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  bubblePressed: {
    opacity: 0.85,
  },
  failedOutboundLabel: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  retryButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    justifyContent: 'center',
  },

  replyPreview: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    opacity: 0.85,
  },
  replyPreviewOwn: {
    borderLeftColor: colors.primaryFixed,
  },
  replyPreviewAuthor: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: 2,
  },
  replyPreviewAuthorOwn: {
    color: colors.primaryFixed,
  },
  replyPreviewBody: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  replyPreviewBodyOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  messageBody: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  messageBodyOwn: {
    color: colors.onPrimary,
  },

  editedLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 2,
  },
  editedLabelOwn: {
    color: 'rgba(255, 255, 255, 0.6)',
  },

  reactionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: -8,
    alignSelf: 'flex-end',
    paddingRight: spacing.xs,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
  },
  reactionBadgeOtherBubble: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  reactionBadgeOwnBubble: {
    backgroundColor: colors.primaryContainer,
  },
  reactionBadgePressed: {
    opacity: 0.8,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
