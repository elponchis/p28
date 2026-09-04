/**
 * Everything a composer does with attachments: pick, paste, upload, retry, remove.
 *
 * The chat screen and the discussion screen carried ~405 lines of this each, differing in four
 * things — which upload mutation to call, what the stored object is called, how failures were
 * reported, and a stray inconsistency in what retry cleared. Everything else was the same code
 * twice, which is why the Cloudinary restore, the size gate and paste-to-attach all had to be
 * written twice this week.
 *
 * The caller supplies the two uploads; this owns the pending list and the rules around it.
 */
import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { PendingComposeAttachment } from '@/components/patterns/ComposeBar';
import {
  CLOUDINARY_MAX_VIDEO_BYTES,
  isCloudinaryConfigured,
  uploadVideoToCloudinary,
} from '@/lib/cloudinaryVideo';
import { DOCUMENT_PICKER_MIME_WHITELIST, newComposeAttachmentId } from '@/lib/composeAttachments';
import { notify } from '@/lib/dialogs';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import {
  isAllowedMessageAttachmentMimeType,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  normalizeMimeTypeForAllowlist,
} from '@/lib/api/messageAttachments';
import { t } from '@/lib/i18n';
import { describeUploadError, tooLargeMessage } from '@/lib/uploadErrors';
import { tryGetVideoPosterUri } from '@/lib/videoPoster';

/** Which slot a stored file occupies. 'primary' is the attachment itself. */
export type UploadSlot = 'primary' | 'thumbnail';

export interface UploadFileInput {
  localUri: string;
  contentType: string;
  fileName: string;
  slot: UploadSlot;
  onProgress?: (fraction: number) => void;
}

export interface UseComposeAttachmentsOptions {
  userId: string | undefined;
  maxAttachments: number;
  /** Prefixes upload failures in the console so two composers stay tellable apart. */
  logLabel: string;
  uploadImage: (input: { localUri: string; base64Data?: string }) => Promise<string>;
  uploadFile: (input: UploadFileInput) => Promise<string>;
}

export interface ComposeAttachments {
  pendingAttachments: PendingComposeAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingComposeAttachment[]>>;
  isUploading: boolean;
  pickPhotos: () => Promise<void>;
  pickVideo: () => Promise<void>;
  pickDocument: () => Promise<void>;
  /** Web: files carried by a paste into the composer. */
  pasteFiles: (files: File[]) => Promise<void>;
  retryAttachment: (attachmentId: string) => Promise<void>;
  removeAttachment: (attachmentId: string) => void;
  clearAttachments: () => void;
}

function reportUploadFailure(logLabel: string, error: unknown): void {
  console.error(`[${logLabel}] attachment upload failed`, error);
  void notify({ title: t('attachments.uploadFailed'), message: describeUploadError(error) });
}

export function useComposeAttachments({
  userId,
  maxAttachments,
  logLabel,
  uploadImage,
  uploadFile,
}: UseComposeAttachmentsOptions): ComposeAttachments {
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposeAttachment[]>([]);

  const patch = useCallback(
    (attachmentId: string, changes: Partial<PendingComposeAttachment>) =>
      setPendingAttachments((prev) =>
        prev.map((p) => (p.id === attachmentId ? { ...p, ...changes } : p))
      ),
    []
  );

  const markFailed = useCallback(
    (attachmentId: string) =>
      patch(attachmentId, { uploading: false, progress: undefined, failed: true }),
    [patch]
  );

  const progressReporter = useCallback(
    (attachmentId: string) => (fraction: number) => patch(attachmentId, { progress: fraction }),
    [patch]
  );

  const requireMediaPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    void notify({ title: t('common.error'), message: t('profile.photoPermissionRequired') });
    return false;
  }, []);

  const pickPhotos = useCallback(async () => {
    if (!userId) return;
    if (!(await requireMediaPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets.length) return;

    const slotsLeft = maxAttachments - pendingAttachments.length;
    let firstError: unknown = null;

    for (const asset of result.assets.slice(0, Math.max(0, slotsLeft))) {
      if (!asset.uri) continue;
      const attachmentId = newComposeAttachmentId();
      setPendingAttachments((prev) => [
        ...prev,
        {
          id: attachmentId,
          kind: 'image',
          displayUri: asset.uri,
          sourceUri: asset.uri,
          sourceBase64: asset.base64 ?? undefined,
          uploading: true,
        },
      ]);
      try {
        const url = await uploadImage({
          localUri: asset.uri,
          base64Data: asset.base64 ?? undefined,
        });
        patch(attachmentId, { uploadedUrl: url, uploading: false });
      } catch (e) {
        markFailed(attachmentId);
        firstError = firstError ?? e;
      }
    }

    // One dialog for the batch: picking five photos on a dead connection should not stack five.
    if (firstError) reportUploadFailure(logLabel, firstError);
  }, [
    userId,
    maxAttachments,
    pendingAttachments.length,
    requireMediaPermission,
    uploadImage,
    patch,
    markFailed,
    logLabel,
  ]);

  const pickVideo = useCallback(async () => {
    if (!userId) return;
    if (pendingAttachments.length >= maxAttachments) return;
    if (!(await requireMediaPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];

    // Cloudinary and Supabase Storage cap video at different sizes, so the gate has to know
    // which path this upload is about to take. Checked before the upload starts, not after: a
    // phone video is easily several hundred megabytes, and letting it climb the wire only to be
    // rejected costs the user minutes and tells them nothing. ImagePicker does not always report
    // fileSize, so this is a fast path -- readBinaryFile still enforces the storage cap.
    const viaCloudinary = isCloudinaryConfigured();
    const maxBytes = viaCloudinary ? CLOUDINARY_MAX_VIDEO_BYTES : MAX_MESSAGE_ATTACHMENT_BYTES;
    if (asset.fileSize != null && asset.fileSize > maxBytes) {
      void notify({ title: t('common.error'), message: tooLargeMessage(asset.fileSize, maxBytes) });
      return;
    }

    const attachmentId = newComposeAttachmentId();
    const posterUri = await tryGetVideoPosterUri(asset.uri);
    const fileName = asset.fileName ?? `video-${Date.now()}.mp4`;
    const mime = asset.mimeType ?? 'video/mp4';
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        kind: 'video',
        displayUri: posterUri ?? '',
        fileName,
        mimeType: mime,
        sourceUri: asset.uri,
        uploading: true,
        progress: 0,
      },
    ]);

    try {
      if (viaCloudinary) {
        // Phone cameras produce HEVC, which no browser decodes -- it plays as a black rectangle
        // and yields no poster. Cloudinary re-encodes on ingest. This path was dropped in
        // 97f6840 and restored afterwards; without it the black rectangle is back.
        const file = (asset as { file?: File }).file;
        const transcoded = await uploadVideoToCloudinary(
          file ?? { uri: asset.uri, name: fileName, type: mime },
          { folder: userId, onProgress: progressReporter(attachmentId) }
        );
        patch(attachmentId, {
          displayUri: transcoded.posterUrl,
          uploadedUrl: transcoded.url,
          uploadedThumbnailUrl: transcoded.posterUrl,
          uploading: false,
          progress: undefined,
        });
        return;
      }

      const videoUrl = await uploadFile({
        localUri: asset.uri,
        contentType: normalizeMimeTypeForAllowlist(mime),
        fileName,
        slot: 'primary',
        onProgress: progressReporter(attachmentId),
      });
      let uploadedThumbnailUrl: string | undefined;
      if (posterUri) {
        uploadedThumbnailUrl = await uploadFile({
          localUri: posterUri,
          contentType: 'image/jpeg',
          fileName: 'thumb.jpg',
          slot: 'thumbnail',
        });
      }
      patch(attachmentId, {
        uploadedUrl: videoUrl,
        uploadedThumbnailUrl,
        uploading: false,
        progress: undefined,
      });
    } catch (e) {
      markFailed(attachmentId);
      reportUploadFailure(logLabel, e);
    }
  }, [
    userId,
    maxAttachments,
    pendingAttachments.length,
    requireMediaPermission,
    uploadFile,
    patch,
    markFailed,
    progressReporter,
    logLabel,
  ]);

  const pickDocument = useCallback(async () => {
    if (!userId) return;
    if (pendingAttachments.length >= maxAttachments) return;

    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await enqueueDocumentPick(() =>
        DocumentPicker.getDocumentAsync({
          type: DOCUMENT_PICKER_MIME_WHITELIST,
          multiple: false,
          copyToCacheDirectory: true,
        })
      );
    } catch (e) {
      void notify({
        title: t('common.error'),
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;

    const doc = result.assets[0];
    const mime = normalizeMimeTypeForAllowlist(doc.mimeType ?? 'application/octet-stream');
    if (!isAllowedMessageAttachmentMimeType(mime)) {
      void notify({ title: t('common.error'), message: t('attachments.unsupportedFileType') });
      return;
    }
    if (doc.size != null && doc.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      void notify({ title: t('common.error'), message: tooLargeMessage(doc.size) });
      return;
    }

    const attachmentId = newComposeAttachmentId();
    const name = doc.name || 'file';
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        kind: 'file',
        fileName: name,
        mimeType: mime,
        displayUri: doc.uri,
        sourceUri: doc.uri,
        uploading: true,
        progress: 0,
      },
    ]);

    try {
      const url = await uploadFile({
        localUri: doc.uri,
        contentType: mime,
        fileName: name,
        slot: 'primary',
        onProgress: progressReporter(attachmentId),
      });
      patch(attachmentId, { uploadedUrl: url, uploading: false, progress: undefined });
    } catch (e) {
      markFailed(attachmentId);
      reportUploadFailure(logLabel, e);
    }
  }, [
    userId,
    maxAttachments,
    pendingAttachments.length,
    uploadFile,
    patch,
    markFailed,
    progressReporter,
    logLabel,
  ]);

  const pasteFiles = useCallback(
    async (files: File[]) => {
      if (!userId) return;
      const slotsLeft = maxAttachments - pendingAttachments.length;
      if (slotsLeft <= 0) {
        void notify({ title: t('common.error'), message: t('attachments.tooManyFiles') });
        return;
      }

      for (const file of files.slice(0, slotsLeft)) {
        const mime = normalizeMimeTypeForAllowlist(file.type || 'application/octet-stream');
        if (!isAllowedMessageAttachmentMimeType(mime)) {
          void notify({ title: t('common.error'), message: t('attachments.unsupportedFileType') });
          continue;
        }
        if (file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
          void notify({ title: t('common.error'), message: tooLargeMessage(file.size) });
          continue;
        }

        const attachmentId = newComposeAttachmentId();
        // A web File has no local URI, so it gets a blob: URL. readBinaryFile fetches it like
        // any other, and it is revoked once the upload has read the bytes -- except after a
        // failure, where it is the only thing retry can re-read.
        const objectUrl = URL.createObjectURL(file);
        const kind = mime.startsWith('image/')
          ? 'image'
          : mime.startsWith('video/')
            ? 'video'
            : 'file';
        const fileName = file.name || `pasted-${Date.now()}`;

        setPendingAttachments((prev) => [
          ...prev,
          {
            id: attachmentId,
            kind,
            displayUri: kind === 'image' ? objectUrl : '',
            fileName,
            mimeType: mime,
            sourceUri: objectUrl,
            uploading: true,
            progress: 0,
          },
        ]);

        try {
          const url = await uploadFile({
            localUri: objectUrl,
            contentType: mime,
            fileName,
            slot: 'primary',
            onProgress: progressReporter(attachmentId),
          });
          patch(attachmentId, {
            uploadedUrl: url,
            // Point the thumbnail at the uploaded copy before dropping the blob, or the preview
            // goes blank the moment the URL is revoked.
            ...(kind === 'image' ? { displayUri: url } : {}),
            uploading: false,
            progress: undefined,
          });
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          markFailed(attachmentId);
          reportUploadFailure(logLabel, e);
        }
      }
    },
    [
      userId,
      maxAttachments,
      pendingAttachments.length,
      uploadFile,
      patch,
      markFailed,
      progressReporter,
      logLabel,
    ]
  );

  const retryAttachment = useCallback(
    async (attachmentId: string) => {
      if (!userId) return;
      const attachment = pendingAttachments.find((p) => p.id === attachmentId);
      if (!attachment || !attachment.sourceUri) return;

      patch(attachmentId, { uploading: true, failed: false });
      try {
        if (attachment.kind === 'image') {
          const url = await uploadImage({
            localUri: attachment.sourceUri,
            base64Data: attachment.sourceBase64 ?? undefined,
          });
          patch(attachmentId, { uploadedUrl: url, uploading: false, progress: undefined });
          return;
        }

        if (attachment.kind === 'video' && isCloudinaryConfigured()) {
          // Retry has to take the same road as the first attempt: a retried video sent to
          // Supabase Storage "succeeds" and then plays as a black rectangle.
          const transcoded = await uploadVideoToCloudinary(
            {
              uri: attachment.sourceUri,
              name: attachment.fileName ?? 'video.mp4',
              type: attachment.mimeType ?? 'video/mp4',
            },
            { folder: userId, onProgress: progressReporter(attachmentId) }
          );
          patch(attachmentId, {
            displayUri: transcoded.posterUrl,
            uploadedUrl: transcoded.url,
            uploadedThumbnailUrl: transcoded.posterUrl,
            uploading: false,
            progress: undefined,
          });
          return;
        }

        const url = await uploadFile({
          localUri: attachment.sourceUri,
          contentType: attachment.mimeType ?? 'application/octet-stream',
          fileName: attachment.fileName ?? 'file',
          slot: 'primary',
          onProgress: progressReporter(attachmentId),
        });
        patch(attachmentId, { uploadedUrl: url, uploading: false, progress: undefined });
      } catch (e) {
        markFailed(attachmentId);
        reportUploadFailure(logLabel, e);
      }
    },
    [
      userId,
      pendingAttachments,
      uploadImage,
      uploadFile,
      patch,
      markFailed,
      progressReporter,
      logLabel,
    ]
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
  }, []);

  const clearAttachments = useCallback(() => setPendingAttachments([]), []);

  return {
    pendingAttachments,
    setPendingAttachments,
    isUploading: pendingAttachments.some((p) => p.uploading),
    pickPhotos,
    pickVideo,
    pickDocument,
    pasteFiles,
    retryAttachment,
    removeAttachment,
    clearAttachments,
  };
}
