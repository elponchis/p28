/**
 * Turning an upload failure into something a person can act on.
 *
 * The adapter rejects an oversized or disallowed file with a fixed English sentence
 * (see readBinaryFile in the Supabase adapter, which surfaces
 * `{ message: 'File is too large', code: 'VALIDATION_ERROR' }`). Screens used to catch those
 * and drop them on the floor -- the attachment just went grey with no explanation -- so this
 * maps the two known validation failures onto localized copy and leaves everything else to
 * getUserFacingError.
 */
import { getUserFacingError, type ApiError } from '@/lib/api';
import { MAX_MESSAGE_ATTACHMENT_BYTES } from '@/lib/api/messageAttachments';
import { t } from '@/lib/i18n';

/** Whole megabytes, rounded to one decimal so a 51.3 MB video does not read as "51 MB (max 50 MB)". */
export function bytesToMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export const MAX_ATTACHMENT_MB = Math.floor(MAX_MESSAGE_ATTACHMENT_BYTES / (1024 * 1024));

/** Message for a file rejected before the upload starts, naming both sizes. */
export function tooLargeMessage(bytes: number): string {
  return t('attachments.fileTooLargeWithSize', {
    size: bytesToMb(bytes),
    max: String(MAX_ATTACHMENT_MB),
  });
}

/** Message for an upload that failed after it started. */
export function describeUploadError(e: unknown): string {
  const raw = e instanceof Error ? e.message : ((e as ApiError | undefined)?.message ?? '');
  if (raw === 'File is too large') return t('attachments.fileTooLarge');
  if (raw === 'File type not allowed') return t('attachments.unsupportedFileType');
  const fallback = getUserFacingError(e as ApiError);
  return fallback || t('attachments.uploadFailed');
}
