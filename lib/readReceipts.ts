/**
 * Who has seen a message.
 *
 * A read position is one timestamp per member (`chat_members.last_read_at`, refreshed whenever
 * that person has the thread open), so "has X read this message" is a comparison rather than a
 * stored fact: X has read it when their last_read_at is at or after the moment it was sent.
 *
 * Kept out of the screen so the comparison — which has to survive missing and malformed
 * timestamps, and a viewer who is somehow not in their own chat — can be tested directly.
 */
import type { ChatMember } from '@/lib/api';

export interface ReadReceiptSummary {
  /** Members other than the viewer who have reached this message. */
  readerCount: number;
  /** Members other than the viewer, read or not. 1 means a direct chat. */
  otherCount: number;
}

function timestamp(value: string | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Returns null when there is nothing to show: no other members, an unreadable sent time, or
 * nobody has reached the message yet. A caller can then render nothing without further checks.
 */
export function summarizeReadReceipt(
  members: ChatMember[] | undefined,
  currentUserId: string | undefined,
  messageCreatedAt: string
): ReadReceiptSummary | null {
  if (!currentUserId) return null;
  const sentAt = timestamp(messageCreatedAt);
  if (sentAt == null) return null;

  const others = (members ?? []).filter((m) => m.userId && m.userId !== currentUserId);
  if (others.length === 0) return null;

  const readerCount = others.filter((m) => {
    const readAt = timestamp(m.lastReadAt);
    return readAt != null && readAt >= sentAt;
  }).length;

  if (readerCount === 0) return null;
  return { readerCount, otherCount: others.length };
}
