import type { MessageAttachment } from './contracts/dto';

/** Matches storage bucket policy (50 MB). */
export const MAX_MESSAGE_ATTACHMENT_BYTES = 52428800;

/** MIME types allowed for chat / discussion attachment uploads (whitelist). */
export const ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
]);

export function normalizeMimeTypeForAllowlist(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

export function isAllowedMessageAttachmentMimeType(mime: string): boolean {
  return ALLOWED_MESSAGE_ATTACHMENT_MIME_TYPES.has(normalizeMimeTypeForAllowlist(mime));
}

/** Parse JSONB from DB into validated attachments (drops invalid entries). */
export function parseStoredAttachments(raw: unknown): MessageAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: MessageAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const kind = o.kind;
    const url = o.url;
    if (kind !== 'image' && kind !== 'video' && kind !== 'file') continue;
    if (typeof url !== 'string' || !url.trim()) continue;
    out.push({
      kind,
      url: url.trim(),
      fileName: typeof o.fileName === 'string' ? o.fileName : undefined,
      mimeType: typeof o.mimeType === 'string' ? o.mimeType : undefined,
      thumbnailUrl: typeof o.thumbnailUrl === 'string' ? o.thumbnailUrl : undefined,
    });
  }
  return out;
}

/** Normalize client-provided attachment list (create / update). */
export function parseClientAttachments(
  raw: MessageAttachment[] | null | undefined
): MessageAttachment[] {
  if (!raw?.length) return [];
  return parseStoredAttachments(raw);
}

/**
 * Build the canonical attachment list for create: prefer `attachments`;
 * if empty, fall back to legacy `imageUrls` as image-only attachments.
 */
export function mergeAttachmentsForCreate(
  attachments: MessageAttachment[] | undefined | null,
  legacyImageUrls: string[] | undefined | null
): MessageAttachment[] {
  const fromNew = parseClientAttachments(attachments ?? undefined);
  if (fromNew.length > 0) return fromNew;
  const urls = (legacyImageUrls ?? []).filter((u) => typeof u === 'string' && u.trim());
  return urls.map((url) => ({ kind: 'image' as const, url: url.trim() }));
}

/** Read path: DB attachments JSON + legacy image_urls. */
export function attachmentsForApiRow(
  attachmentsJson: unknown,
  imageUrlsLegacy: string[] | null | undefined
): MessageAttachment[] | undefined {
  const fromDb = parseStoredAttachments(attachmentsJson);
  if (fromDb.length > 0) return fromDb;
  const leg = (imageUrlsLegacy ?? []).filter((u) => typeof u === 'string' && u.trim());
  if (leg.length === 0) return undefined;
  return leg.map((url) => ({ kind: 'image' as const, url: url.trim() }));
}

/** URLs to persist in image_urls (image kind only). */
export function deriveImageUrlsForDb(attachments: MessageAttachment[]): string[] | null {
  const urls = attachments.filter((a) => a.kind === 'image').map((a) => a.url);
  return urls.length > 0 ? urls : null;
}

/** Legacy field for clients that only read imageUrls. */
export function deriveLegacyImageUrls(
  attachments: MessageAttachment[] | undefined
): string[] | undefined {
  if (!attachments?.length) return undefined;
  const urls = attachments.filter((a) => a.kind === 'image').map((a) => a.url);
  return urls.length > 0 ? urls : undefined;
}
