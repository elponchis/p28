/**
 * The bookkeeping a message row does before it can render anything.
 *
 * The chat bubble and the discussion reply card look nothing alike, but they answer the same
 * questions to get there: which reactions are on this, did I leave any, is it mine, is it still
 * sending, was it edited, may I react at all, is the pointer over it. Both had their own copy of
 * that, line for line — which is how the reaction rework earlier today had to be applied twice
 * and was briefly wrong in one of them.
 *
 * Only the answers are shared. Layout stays with each row, because a bubble and a card differ
 * for real reasons and folding them into one component with a mode switch trades duplication for
 * a component nobody can change safely.
 */
import { useCallback, useMemo, useState } from 'react';

import type { PostReactionType } from '@/lib/api';
import { formatMessageSentClockTime } from '@/lib/dates';
import { t } from '@/lib/i18n';

import { REACTION_ORDER } from './constants';
import { HOVER_ACTIONS_SUPPORTED } from './MessageHoverActions';
import type { MessageLike } from './types';

export interface UseMessageRowStateInput {
  post: MessageLike;
  currentUserId?: string;
  canReact?: boolean;
  /** Whether the caller can actually retry a failed send; drives the retry affordance. */
  canRetry?: boolean;
  onLongPress?: () => void;
}

export interface MessageRowState {
  isOwn: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  clockTime: string;
  outboundStatus: MessageLike['outboundStatus'];
  showFailedOutbound: boolean;
  showSendingOutbound: boolean;
  /** Reaction types present on this message, in catalogue order so badges never reshuffle. */
  presentReactions: PostReactionType[];
  reactionCount: (type: PostReactionType) => number;
  isUserReaction: (type: PostReactionType) => boolean;
  hasReactions: boolean;
  userReactionTypes: PostReactionType[];
  /** Reacting is off for a deleted message even when the screen allows it generally. */
  canReactNow: boolean;
  handleLongPress: () => void;
  longPressHint: string | undefined;
  /** Spread onto the row container. Empty off web; react-native-web forwards these to the DOM. */
  hoverProps: object;
  /** True while the pointer is over the row and the row has actions worth offering. */
  showHoverActions: boolean;
}

export function useMessageRowState({
  post,
  currentUserId,
  canReact = false,
  canRetry = false,
  onLongPress,
}: UseMessageRowStateInput): MessageRowState {
  const counts = post.reactionCounts ?? {};
  const userReactionTypes = post.userReactionTypes ?? [];
  const outboundStatus = post.outboundStatus;

  const isOwn = !!currentUserId && post.userId === currentUserId;
  const isDeleted = !!post.deletedAt;
  const isEdited = !isDeleted && !!post.updatedAt && post.updatedAt !== post.createdAt;
  const showFailedOutbound = isOwn && outboundStatus === 'failed' && canRetry;
  const showSendingOutbound = isOwn && outboundStatus === 'sending';
  const canReactNow = canReact && !isDeleted;

  const presentReactions = useMemo(
    () => REACTION_ORDER.filter((type) => (counts[type] ?? 0) > 0),
    // counts is a fresh object each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(counts)]
  );

  const [hovered, setHovered] = useState(false);
  const hoverProps = useMemo(
    () =>
      HOVER_ACTIONS_SUPPORTED
        ? ({
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          } as object)
        : {},
    []
  );

  const handleLongPress = useCallback(() => {
    if (!canReact || !onLongPress || outboundStatus) return;
    onLongPress();
  }, [canReact, onLongPress, outboundStatus]);

  return {
    isOwn,
    isDeleted,
    isEdited,
    clockTime: formatMessageSentClockTime(post.createdAt),
    outboundStatus,
    showFailedOutbound,
    showSendingOutbound,
    presentReactions,
    reactionCount: (type) => counts[type] ?? 0,
    isUserReaction: (type) => !!currentUserId && userReactionTypes.includes(type),
    hasReactions: !isDeleted && presentReactions.length > 0,
    userReactionTypes,
    canReactNow,
    handleLongPress,
    longPressHint: showFailedOutbound
      ? undefined
      : canReactNow
        ? isOwn
          ? t('discussions.messageRowLongPressHintOwn')
          : t('discussions.messageRowLongPressHintOther')
        : undefined,
    hoverProps,
    showHoverActions: HOVER_ACTIONS_SUPPORTED && hovered && canReactNow && !outboundStatus,
  };
}
