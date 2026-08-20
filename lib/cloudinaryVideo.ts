/**
 * Video delivery through Cloudinary.
 *
 * Phone cameras hand us HEVC (`hvc1`) MP4s. Browsers cannot decode HEVC, so such
 * a video plays its audio track and paints a black rectangle — and because the
 * frames never decode, no poster can be extracted from it either. Cloudinary
 * re-encodes on ingest and serves a codec the requesting browser understands,
 * plus a poster frame, which fixes both.
 *
 * Uploads go straight from the client using an *unsigned* upload preset, so no
 * API secret is involved: the cloud name and preset name are both public values.
 * When either is unset the helpers report "not configured" and callers fall back
 * to uploading the original to Supabase Storage.
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export interface CloudinaryVideo {
  /** Playback URL, transcoded per requesting browser. */
  url: string;
  /** JPEG poster taken from the video. */
  posterUrl: string;
  /** Cloudinary's identifier, kept so the asset can be deleted later. */
  publicId: string;
  durationSec?: number;
}

export function isCloudinaryConfigured(): boolean {
  return CLOUD_NAME.length > 0 && UPLOAD_PRESET.length > 0;
}

/** `f_auto` picks the codec per browser; `q_auto` picks the bitrate. */
export function cloudinaryPlaybackUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto/${publicId}.mp4`;
}

/** Poster frame one second in — the very first frame is often black. */
export function cloudinaryPosterUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,f_jpg,q_auto/${publicId}.jpg`;
}

/**
 * What to send as the file part. On web this is the picked `File`/`Blob`; on
 * native, React Native's FormData accepts this `{ uri, name, type }` shape.
 */
export type CloudinaryUploadBody = Blob | { uri: string; name: string; type: string };

export interface UploadOptions {
  /** Folder inside the Cloudinary account, e.g. the uploader's user id. */
  folder?: string;
  /** 0..1, reported as bytes are sent. */
  onProgress?: (fraction: number) => void;
}

interface CloudinaryUploadResponse {
  public_id?: string;
  duration?: number;
  error?: { message?: string };
}

/**
 * Uploads a video and returns playback + poster URLs.
 *
 * @throws if Cloudinary is not configured, or the upload is rejected.
 */
export async function uploadVideoToCloudinary(
  body: CloudinaryUploadBody,
  options: UploadOptions = {}
): Promise<CloudinaryVideo> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const form = new FormData();
  // RN's FormData takes the {uri,name,type} object; the DOM's takes a Blob.
  form.append('file', body as unknown as Blob);
  form.append('upload_preset', UPLOAD_PRESET);
  if (options.folder) form.append('folder', options.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const raw = await postForm(endpoint, form, options.onProgress);

  let parsed: CloudinaryUploadResponse;
  try {
    parsed = JSON.parse(raw) as CloudinaryUploadResponse;
  } catch {
    throw new Error('Cloudinary returned a response we could not read');
  }
  if (parsed.error?.message) throw new Error(parsed.error.message);
  const publicId = parsed.public_id;
  if (!publicId) throw new Error('Cloudinary did not return a public_id');

  return {
    url: cloudinaryPlaybackUrl(publicId),
    posterUrl: cloudinaryPosterUrl(publicId),
    publicId,
    durationSec: typeof parsed.duration === 'number' ? parsed.duration : undefined,
  };
}

/** XHR rather than fetch, because only XHR reports upload progress. */
function postForm(
  url: string,
  form: FormData,
  onProgress?: (fraction: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve(xhr.responseText ?? '');
        return;
      }
      // Cloudinary explains rejections in the body; keep it.
      const detail = (xhr.responseText ?? '').trim().slice(0, 500);
      reject(
        new Error(
          detail ? `Upload failed (${xhr.status}): ${detail}` : `Upload failed (${xhr.status})`
        )
      );
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}
