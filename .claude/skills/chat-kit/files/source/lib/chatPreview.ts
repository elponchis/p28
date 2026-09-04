/**
 * What a conversation row says under the name when the last message has no text.
 *
 * Two kinds of message leave an empty body: one that was deleted, which clears its own contents,
 * and one that was only ever a photo or a file. Both used to render as a row with a timestamp and
 * nothing beside it, which reads as a chat that broke rather than one that was tidied. The kind
 * is decided here and turned into words by the caller, in its own language.
 */

export type LastMessageKind = 'deleted' | 'attachment';

export interface LastMessageShape {
  body?: string | null;
  deleted?: boolean;
  attachmentCount?: number;
}

export function lastMessageKind(message: LastMessageShape): LastMessageKind | undefined {
  if (message.deleted) return 'deleted';
  // Text wins when there is any: a photo sent with a caption previews as the caption.
  if (message.body?.trim()) return undefined;
  return (message.attachmentCount ?? 0) > 0 ? 'attachment' : undefined;
}
