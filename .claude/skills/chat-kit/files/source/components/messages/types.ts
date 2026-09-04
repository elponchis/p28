/**
 * Shared types for message/post display. DiscussionPost and ChatMessage both satisfy this.
 */
import type { MessageAttachment, PostReactionCounts, PostReactionType } from '@/lib/api';

/** Client-only lifecycle for optimistic outbound messages (cache-only rows). */
export type OutboundMessageStatus = 'sending' | 'failed';

/** Stored on failed optimistic rows so the user can retry with the same payload. */
export interface OutboundRetryPayload {
  body: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
  parentPostId?: string;
  parentMessageId?: string;
}

export interface MessageLike {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  /** When set, the message was soft-deleted; render a tombstone instead of body/attachments. */
  deletedAt?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
  reactionCounts?: PostReactionCounts;
  userReactionTypes?: PostReactionType[];
  outboundStatus?: OutboundMessageStatus;
  outboundRetryPayload?: OutboundRetryPayload;
}

export interface ParentMessageLike {
  body?: string;
  authorDisplayName?: string;
  /** Lets the quote say "replying to you" when the message being answered is the viewer's. */
  userId?: string;
}

export { type PostReactionType } from '@/lib/api';
