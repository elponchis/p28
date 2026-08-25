/** Matches the assignment-submissions storage bucket policy (50 MB). */
export const MAX_SUBMISSION_FILE_BYTES = 52428800;

/** Max number of files a student may attach to a single submission. */
export const MAX_SUBMISSION_FILES = 5;

/** Max number of reference material files an instructor may attach to an assignment. */
export const MAX_ASSIGNMENT_MATERIALS = 10;

/** MIME types allowed for assignment submission uploads (matches the storage bucket whitelist). */
export const ALLOWED_SUBMISSION_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
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

export function isAllowedSubmissionMimeType(mime: string): boolean {
  return ALLOWED_SUBMISSION_MIME_TYPES.has(mime.split(';')[0].trim().toLowerCase());
}

/** MIME list for expo-document-picker's `type` filter when picking a submission file. */
export const SUBMISSION_PICKER_MIME_WHITELIST: string[] = [...ALLOWED_SUBMISSION_MIME_TYPES];
