import type { PendingComposeAttachment } from '@/components/patterns/ComposeBar';
import type { ChatMessage, DiscussionPost, MessageAttachment } from '@/lib/api';

export function newComposeAttachmentId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `pa-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** MIME list for expo-document-picker (whitelist). */
export const DOCUMENT_PICKER_MIME_WHITELIST: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
];

export function storedMessageToPendingAttachments(
  msg: ChatMessage | DiscussionPost
): PendingComposeAttachment[] {
  const list = msg.attachments;
  if (list?.length) {
    return list.map((a) => ({
      id: newComposeAttachmentId(),
      kind: a.kind,
      fileName: a.fileName,
      mimeType: a.mimeType,
      displayUri: a.kind === 'video' ? (a.thumbnailUrl ?? '') : a.url,
      uploadedUrl: a.url,
      uploadedThumbnailUrl: a.thumbnailUrl,
      uploading: false,
    }));
  }
  const urls = msg.imageUrls ?? [];
  return urls.map((url) => ({
    id: newComposeAttachmentId(),
    kind: 'image' as const,
    displayUri: url,
    uploadedUrl: url,
    uploading: false,
  }));
}

export function pendingToMessageAttachments(
  pending: PendingComposeAttachment[]
): MessageAttachment[] {
  return pending.map((p) => {
    if (p.kind === 'image') {
      return { kind: 'image', url: p.uploadedUrl! };
    }
    if (p.kind === 'video') {
      const v: MessageAttachment = {
        kind: 'video',
        url: p.uploadedUrl!,
        fileName: p.fileName,
        mimeType: p.mimeType,
      };
      if (p.uploadedThumbnailUrl) {
        v.thumbnailUrl = p.uploadedThumbnailUrl;
      }
      return v;
    }
    return {
      kind: 'file',
      url: p.uploadedUrl!,
      fileName: p.fileName ?? 'file',
      mimeType: p.mimeType,
    };
  });
}
