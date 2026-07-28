import type { ApiError } from './errors';

/**
 * Realtime channel IDs: kebab-case with scope (e.g. messages:group:{groupId}, presence:org:{orgId}).
 * Adapters map these to backend-specific channel names.
 */
export type RealtimeChannelId = string;

export interface RealtimeHandlers {
  onMessage?: (payload: Record<string, unknown>) => void;
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
}
