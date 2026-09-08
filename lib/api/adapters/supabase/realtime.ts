import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { RealtimeContract, RealtimeChannelId, RealtimeHandlers } from '../../contracts';

/** Map contract channel ID messages:group:{groupId} to groupId. */
function parseGroupIdFromChannelId(channelId: RealtimeChannelId): string | null {
  const prefix = 'messages:group:';
  if (!channelId.startsWith(prefix)) return null;
  return channelId.slice(prefix.length) || null;
}

/** Map contract channel ID messages:discussion:{discussionId} to discussionId. */
function parseDiscussionIdFromChannelId(channelId: RealtimeChannelId): string | null {
  const prefix = 'messages:discussion:';
  if (!channelId.startsWith(prefix)) return null;
  return channelId.slice(prefix.length) || null;
}

/** Map contract channel ID messages:chat:{chatId} to chatId. */
function parseChatIdFromChannelId(channelId: RealtimeChannelId): string | null {
  const prefix = 'messages:chat:';
  if (!channelId.startsWith(prefix)) return null;
  return channelId.slice(prefix.length) || null;
}

/** Map contract channel ID notifications:user:{userId} to userId. */
function parseUserIdFromChannelId(channelId: RealtimeChannelId): string | null {
  const prefix = 'notifications:user:';
  if (!channelId.startsWith(prefix)) return null;
  return channelId.slice(prefix.length) || null;
}

/**
 * Supabase Realtime adapter. Subscribes to postgres_changes for:
 * - messages:group:{groupId} → group_discussions INSERT
 * - messages:discussion:{discussionId} → discussion_posts INSERT
 * - messages:chat:{chatId} → chat_messages INSERT
 * - notifications:user:{userId} → in_app_notifications INSERT and UPDATE
 */
export function createSupabaseRealtimeAdapter(getClient: () => SupabaseClient): RealtimeContract {
  const channels = new Map<RealtimeChannelId, RealtimeChannel>();

  return {
    async subscribe(
      channelId: RealtimeChannelId,
      handlers: RealtimeHandlers
    ): Promise<{ error?: import('../../contracts/errors').ApiError }> {
      const groupId = parseGroupIdFromChannelId(channelId);
      const discussionId = parseDiscussionIdFromChannelId(channelId);
      const chatId = parseChatIdFromChannelId(channelId);
      const notificationsUserId = parseUserIdFromChannelId(channelId);

      if (notificationsUserId) {
        if (channels.has(channelId)) return {};
        const channel = getClient()
          .channel(channelId)
          // Both events matter: an INSERT is a new notification, and an UPDATE is one being
          // marked read — often from another tab or by opening the chat, and the badge has to
          // come down as well as go up.
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'in_app_notifications',
              filter: `user_id=eq.${notificationsUserId}`,
            },
            (payload) => {
              handlers.onMessage?.(payload as Record<string, unknown>);
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' && err && handlers.onError) {
              handlers.onError({
                message: err.message ?? 'Realtime subscription error',
                code: err.name,
              });
            }
          });
        channels.set(channelId, channel);
        return {};
      }

      if (groupId) {
        if (channels.has(channelId)) return {};
        const channel = getClient()
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'group_discussions',
              filter: `group_id=eq.${groupId}`,
            },
            (payload) => {
              handlers.onMessage?.(payload as Record<string, unknown>);
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' && err && handlers.onError) {
              handlers.onError({
                message: err.message ?? 'Realtime subscription error',
                code: err.name,
              });
            }
          });
        channels.set(channelId, channel);
        return {};
      }

      if (discussionId) {
        if (channels.has(channelId)) return {};
        const channel = getClient()
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'discussion_posts',
              filter: `discussion_id=eq.${discussionId}`,
            },
            (payload) => {
              handlers.onMessage?.(payload as Record<string, unknown>);
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' && err && handlers.onError) {
              handlers.onError({
                message: err.message ?? 'Realtime subscription error',
                code: err.name,
              });
            }
          });
        channels.set(channelId, channel);
        return {};
      }

      if (chatId) {
        if (channels.has(channelId)) return {};
        const channel = getClient()
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              handlers.onMessage?.(payload as Record<string, unknown>);
            }
          )
          // Read receipts. chat_members.last_read_at is the only column that moves on its own
          // here, and nothing else UPDATEs a membership row often enough for the extra traffic
          // to matter.
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_members',
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              handlers.onReadReceipt?.(payload as Record<string, unknown>);
            }
          )
          // Typing travels as a broadcast: it is only true for the next second or two, so
          // there is nothing worth writing to a table and nothing to clean up afterwards.
          .on('broadcast', { event: 'typing' }, (message) => {
            const userId = (message?.payload as { userId?: unknown } | undefined)?.userId;
            if (typeof userId === 'string' && userId.length > 0) {
              handlers.onTyping?.({ userId });
            }
          })
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' && err && handlers.onError) {
              handlers.onError({
                message: err.message ?? 'Realtime subscription error',
                code: err.name,
              });
            }
          });
        channels.set(channelId, channel);
        return {};
      }

      return {
        error: {
          message:
            'Invalid channel ID. Expected messages:group:{groupId}, messages:discussion:{discussionId}, messages:chat:{chatId}, or notifications:user:{userId}',
          code: 'VALIDATION_ERROR',
        },
      };
    },

    sendTyping(channelId: RealtimeChannelId, userId: string): void {
      const channel = channels.get(channelId);
      if (!channel) return;
      // Dropped rather than queued when the socket is not ready: a typing ping that arrives
      // late is worse than one that never arrives.
      void channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
    },

    async unsubscribe(channelId: RealtimeChannelId): Promise<void> {
      const channel = channels.get(channelId);
      if (channel) {
        await getClient().removeChannel(channel);
        channels.delete(channelId);
      }
    },
  };
}
