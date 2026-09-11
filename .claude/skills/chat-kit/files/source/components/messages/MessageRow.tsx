import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { isDesktopWebPointer } from '@/lib/pointer';
import { reactionRowMetrics, splitVisibleReactions } from '@/lib/reactionLayout';
import { MessageVideoEmbed } from '@/components/patterns/MessageVideoEmbed';
import type { MessageAttachment } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, spacing, typography, fontFamily } from '@/theme/tokens';

import { REACTION_EMOJI } from './constants';
import { MessageHoverActions } from './MessageHoverActions';
import { useMessageRowState } from './useMessageRowState';
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
  /**
   * KakaoTalk-style: how many chat members have not read this message yet. Rendered beside the
   * clock time on your own messages and gone at zero, so an all-read thread stays quiet.
   */
  unreadCount?: number;
  /** Extra top margin when the previous message was from the other side (you vs someone else). */
  extraGapAfterPeerChange?: boolean;
  /** Start a reply to this message. Drives the hover toolbar's reply button on desktop. */
  onReply?: () => void;
  /** Jump to the message this one is replying to, from the quoted preview. */
  onParentPress?: () => void;
  /** Own messages: edit / delete from the hover toolbar instead of only the long-press sheet. */
  onEdit?: () => void;
  onDelete?: () => void;
  /**
   * Drop your own avatar and let your bubbles run closer to the right edge.
   *
   * On a phone the column of your own face costs width that the message needs, and says nothing
   * — you know who you are. Off by default, so the roomier desktop layout keeps both sides
   * symmetrical.
   */
  compactOwnMessages?: boolean;
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
  unreadCount = 0,
  extraGapAfterPeerChange = false,
  onReply,
  onParentPress,
  onEdit,
  onDelete,
  compactOwnMessages = false,
}: MessageRowProps) {
  const {
    isOwn: isOwnMessage,
    isDeleted,
    isEdited,
    clockTime,
    showFailedOutbound,
    showSendingOutbound,
    presentReactions,
    reactionCount,
    isUserReaction,
    hasReactions,
    userReactionTypes: userReactions,
    canReactNow,
    canOpenSheet,
    handleLongPress,
    longPressHint,
    hoverProps,
    showHoverActions,
  } = useMessageRowState({
    post,
    currentUserId,
    canReact,
    canRetry: !!onRetrySend,
    // Your own message no longer counts as reactable, so the sheet needs another reason to open
    // on it -- edit and delete live in there.
    hasNonReactionActions: !!onEdit || !!onDelete,
    onLongPress,
  });

  // A mouse can drag across text; a finger long-pressing it opens the browser's selection
  // callout instead of this row's actions sheet.
  const selectableText = isDesktopWebPointer();

  const { width: windowWidth } = useWindowDimensions();
  const reactionMetrics = reactionRowMetrics(windowWidth);
  const { visible: visibleReactions, hidden: hiddenReactionCount } = splitVisibleReactions(
    presentReactions,
    reactionMetrics
  );

  const hoverActions = showHoverActions ? (
    <MessageHoverActions
      isOwnMessage={isOwnMessage}
      userReactionTypes={userReactions}
      onAddReaction={onAddReaction}
      onRemoveReaction={onRemoveReaction}
      onMore={onLongPress}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  ) : null;

  return (
    <View
      style={[styles.messageWrapper, extraGapAfterPeerChange && styles.messageWrapperPeerChange]}
      {...hoverProps}
    >
      <View style={styles.messageSliding}>
        <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
          {showFailedOutbound ? (
            <Pressable
              onPress={onRetrySend}
              style={styles.retryButton}
              accessibilityLabel={t('message.retrySend')}
              accessibilityHint={t('message.retrySendHint')}
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
          <View
            style={[
              styles.contentColumn,
              isOwnMessage && styles.contentColumnOwn,
              isOwnMessage && compactOwnMessages && styles.contentColumnOwnCompact,
            ]}
          >
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
                {isOwnMessage ? hoverActions : null}
                {isOwnMessage && (showSentClockTime || unreadCount > 0) ? (
                  <View style={styles.ownMetaColumn}>
                    {unreadCount > 0 ? (
                      <Text
                        style={styles.unreadCount}
                        accessibilityLabel={t('messages.unreadByCount', {
                          count: String(unreadCount),
                        })}
                      >
                        {unreadCount}
                      </Text>
                    ) : null}
                    {showSentClockTime ? (
                      <Text style={styles.sentClockTime} accessibilityLabel={clockTime}>
                        {clockTime}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.bubbleStack}>
                  <Pressable
                    onLongPress={canOpenSheet ? handleLongPress : undefined}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.bubble,
                      isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
                      showFailedOutbound && styles.bubbleFailed,
                      pressed && canOpenSheet && styles.bubblePressed,
                    ]}
                    accessibilityLabel={
                      isDeleted
                        ? t('message.messageDeleted')
                        : showFailedOutbound
                          ? t('message.sendFailed')
                          : t('message.reactToReply')
                    }
                    accessibilityHint={longPressHint}
                    accessibilityRole="button"
                  >
                    {isDeleted ? (
                      <Text style={[styles.deletedLabel, isOwnMessage && styles.deletedLabelOwn]}>
                        {t('message.messageDeleted')}
                      </Text>
                    ) : (
                      <>
                        {parentPost ? (
                          // The quote is the only handle on the message being answered, and
                          // every other chat app treats it as a link back to it.
                          <Pressable
                            onPress={onParentPress}
                            disabled={!onParentPress}
                            style={({ pressed }) => [
                              styles.replyPreview,
                              isOwnMessage && styles.replyPreviewOwn,
                              pressed && onParentPress ? styles.replyPreviewPressed : null,
                            ]}
                            accessibilityRole={onParentPress ? 'button' : 'text'}
                            accessibilityLabel={t('message.jumpToOriginal')}
                          >
                            <Text
                              style={[
                                styles.replyPreviewAuthor,
                                isOwnMessage && styles.replyPreviewAuthorOwn,
                              ]}
                            >
                              {currentUserId && parentPost.userId === currentUserId
                                ? t('message.replyingToYou')
                                : t('message.replyingToPerson', {
                                    name: parentPost.authorDisplayName ?? t('common.loading'),
                                  })}
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
                          </Pressable>
                        ) : null}

                        {post.body ? (
                          <Text
                            // Desktop web only: with a mouse this is what makes a message
                            // selectable and copyable with Ctrl+C. On touch -- native or a phone
                            // browser -- the same prop hands the long press to the selection
                            // callout and swallows the actions sheet, so copying there goes
                            // through the sheet's own Copy action instead.
                            selectable={selectableText}
                            style={[
                              styles.messageBody,
                              isOwnMessage && styles.messageBodyOwn,
                              // The bubble is a Pressable, which paints a pointer cursor over
                              // the text and makes it read as a button rather than something
                              // you can drag across. An I-beam is the affordance every chat app
                              // uses to say "this is selectable".
                              selectableText && styles.messageBodySelectableWeb,
                            ]}
                          >
                            {post.body}
                          </Text>
                        ) : null}

                        <MessageVideoEmbed body={post.body} />

                        {isEdited ? (
                          <Text style={[styles.editedLabel, isOwnMessage && styles.editedLabelOwn]}>
                            {t('message.edited')}
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
                          <Text style={styles.failedOutboundLabel}>{t('message.sendFailed')}</Text>
                        ) : null}
                      </>
                    )}
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
                {isOwnMessage ? null : hoverActions}
              </View>
              {hasReactions ? (
                // Badges hang from the bubble's own side (right for your messages, where the unread
                // count and time are not). And when a time or unread count sits beside the bubble they
                // sit just below instead of tucking up under it: a row wider than a short bubble runs
                // past its edge, and tucked up it lands on that time.
                <View
                  style={[
                    styles.reactionBadges,
                    isOwnMessage && styles.reactionBadgesOwn,
                    (showSentClockTime || (isOwnMessage && unreadCount > 0)) &&
                      styles.reactionBadgesBelowMeta,
                  ]}
                >
                  {visibleReactions.map((type) => {
                    const count = reactionCount(type);
                    const isMine = isUserReaction(type);
                    const onPress =
                      canReactNow && (isMine ? onRemoveReaction : onAddReaction)
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
                          pressed && canReactNow && styles.reactionBadgePressed,
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
                        <Text
                          style={[styles.reactionEmoji, { fontSize: reactionMetrics.emojiSize }]}
                        >
                          {REACTION_EMOJI[type]}
                        </Text>
                        {count > 1 ? (
                          <Text
                            style={[
                              styles.reactionCount,
                              isOwnMessage && styles.reactionCountOwnBubble,
                            ]}
                          >
                            {count}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {/* Who left these, and the kinds that did not fit. Both answers are in the
                      sheet, so one button opens it rather than two sitting side by side. */}
                  {onLongPress ? (
                    <Pressable
                      onPress={onLongPress}
                      style={({ pressed }) => [
                        styles.reactionBadge,
                        isOwnMessage
                          ? styles.reactionBadgeOwnBubble
                          : styles.reactionBadgeOtherBubble,
                        pressed && styles.reactionBadgePressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        hiddenReactionCount > 0
                          ? t('message.reactionsMoreCount', { count: hiddenReactionCount })
                          : t('message.whoReacted')
                      }
                      accessibilityHint={t('message.whoReactedHint')}
                    >
                      <Text
                        style={[
                          styles.reactionCount,
                          isOwnMessage && styles.reactionCountOwnBubble,
                          { fontSize: Math.round(reactionMetrics.emojiSize * 0.7) },
                        ]}
                      >
                        {hiddenReactionCount > 0 ? `+${hiddenReactionCount}` : '···'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          {/* Own message avatar on the right — only on last in group, and not when compact */}
          {isOwnMessage && !compactOwnMessages ? (
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
  messageBodySelectableWeb: {
    // Not in React Native's style types; react-native-web passes it through to CSS.
    cursor: 'text',
  } as object,
  replyPreviewPressed: {
    opacity: 0.6,
  },
  ownMetaColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    // No gap: the two lines are one block, and the tight line heights below already leave
    // enough air between them. Anything more reads as a stray number floating over the time,
    // which is most obvious beside a single-line message.
    gap: 0,
    // On the column so the count clears the bubble too. It used to sit on the timestamp alone,
    // leaving the number touching the message.
    marginEnd: spacing.xs,
  },
  unreadCount: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    // caption ships lineHeight 18 against a 13px face, so the glyphs carry 2.5px of dead space
    // above and below. Digits need none of it, and here it was all gap.
    lineHeight: 14,
    color: colors.secondary,
  },
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
    // Top, not bottom. Anchored to the bottom it rode whatever the row's height happened to
    // be, so adding a reaction -- which appends a badge row under the bubble -- visibly
    // dropped the author's avatar. From the top nothing below it can move it.
    alignSelf: 'flex-start',
    marginTop: 1,
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
  contentColumnOwnCompact: {
    // The width the avatar column gave back, spent on the message instead.
    maxWidth: '88%',
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
    // Bottom, not center: KakaoTalk hangs the timestamp off the bubble's bottom edge and
    // stacks the unread count above it. Centering put the time halfway up a tall message,
    // which is what read wrong.
    alignItems: 'flex-end',
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
    // Same reason as unreadCount: caption's 18px leading is 7px of slack at this size. The
    // bottom padding stays -- it is what keeps the time off the bubble's rounded corner --
    // but the top padding only widened the gap under the unread count.
    lineHeight: 14,
    color: colors.onSurfaceVariant,
    paddingBottom: 2,
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

  deletedLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: colors.onSurfaceVariant,
  },
  deletedLabelOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  reactionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: -8,
    alignSelf: 'flex-start',
    paddingLeft: spacing.xs,
  },
  reactionBadgesOwn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    paddingLeft: 0,
    paddingRight: spacing.xs,
  },
  reactionBadgesBelowMeta: {
    marginTop: spacing.xxs,
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
  /** On the dark own-bubble badge the default grey all but vanished — the "···" read as an empty pill. */
  reactionCountOwnBubble: {
    color: colors.onPrimaryContainer,
  },
});
