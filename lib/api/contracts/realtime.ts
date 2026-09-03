import type { ApiError } from './errors';

/**
 * Realtime channel IDs: kebab-case with scope (e.g. messages:group:{groupId}, presence:org:{orgId}).
 * Adapters map these to backend-specific channel names.
 */
export type RealtimeChannelId = string;

export interface RealtimeHandlers {
  onMessage?: (payload: Record<string, unknown>) => void;
  /**
   * A member's read position moved (chat channels only). Kept separate from onMessage
   * because the two want different work: a new message refetches the thread, a read receipt
   * only refreshes the members and must not itself count as "the reader is looking".
   */
  onReadReceipt?: (payload: Record<string, unknown>) => void;
  /**
   * Someone else is typing in this chat. Carries the typist's user id so a group chat can name
   * them, and fires repeatedly while they type -- the receiver decides when to stop showing it.
   */
  onTyping?: (payload: { userId: string }) => void;
  onPresence?: (payload: unknown) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Realtime contract. Adapters implement subscribe/unsubscribe.
 * App code uses only this interface via the facade.
 */
export interface RealtimeContract {
  subscribe(
    channelId: RealtimeChannelId,
    handlers: RealtimeHandlers
  ): Promise<{ error?: ApiError }>;
  unsubscribe(channelId: RealtimeChannelId): Promise<void>;
  /**
   * Announce that this user is typing. Fire-and-forget and deliberately not persisted: a typing
   * indicator is worthless a second later, so it travels as a broadcast rather than a row.
   * No-ops when the channel is not subscribed.
   */
  sendTyping(channelId: RealtimeChannelId, userId: string): void;
}
