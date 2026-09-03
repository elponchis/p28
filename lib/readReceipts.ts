/**
 * Who has not seen a message yet.
 *
 * A read position is one timestamp per member (`chat_members.last_read_at`, refreshed whenever
 * that person has the thread open), so "has X read this message" is a comparison rather than a
 * stored fact: X has read it when their last_read_at is at or after the moment it was sent.
 *
 * Kept out of the screen so the comparison — which has to survive missing and malformed
 * timestamps, and a viewer who is somehow not in their own chat — can be tested directly.
 */
import type { ChatMember } from '@/lib/api';

function timestamp(value: string | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * How many of the other members have NOT reached this message yet — the number KakaoTalk puts
 * beside your own messages, which disappears at zero.
 *
 * Counting the unread rather than the readers is what the UI shows, and it degrades the right
 * way in a group: a member with no read position at all counts as unread, so someone newly
 * added to the chat never makes an old message look more read than it is.
 */
export function countUnreadMembers(
  members: ChatMember[] | undefined,
  currentUserId: string | undefined,
  messageCreatedAt: string
): number {
  if (!currentUserId) return 0;
  const sentAt = timestamp(messageCreatedAt);
  if (sentAt == null) return 0;

  return (members ?? []).filter((m) => {
    if (!m.userId || m.userId === currentUserId) return false;
    const readAt = timestamp(m.lastReadAt);
    return readAt == null || readAt < sentAt;
  }).length;
}
