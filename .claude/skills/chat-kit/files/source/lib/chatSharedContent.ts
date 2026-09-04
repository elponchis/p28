import type { ChatMessage, ChatSharedContentMessage } from '@/lib/api';

import { extractUrlsFromText } from '@/lib/extractUrlsFromText';

export function chatMessageQualifiesForSharedIndex(m: ChatMessage): boolean {
  const atts = m.attachments?.length ?? 0;
  const imgs = m.imageUrls?.length ?? 0;
  if (atts > 0 || imgs > 0) return true;
  return extractUrlsFromText(m.body ?? '').length > 0;
}

/** Derive shared-content rows from cached full thread (placeholderData for React Query). */
export function chatMessagesToSharedContentPlaceholder(
  msgs: ChatMessage[]
): ChatSharedContentMessage[] {
  return msgs
    .filter(chatMessageQualifiesForSharedIndex)
    .map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      body: m.body ?? '',
      imageUrls: m.imageUrls,
      attachments: m.attachments,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
