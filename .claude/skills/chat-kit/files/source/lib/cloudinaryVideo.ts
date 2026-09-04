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

/** Cloudinary's free plan rejects videos over 100 MB; paid plans raise this. */
export const CLOUDINARY_MAX_VIDEO_BYTES = Number(
  process.env.EXPO_PUBLIC_CLOUDINARY_MAX_VIDEO_BYTES ?? 100 * 1024 * 1024
);

/** True for URLs we serve through Cloudinary, which are the ones that can 423. */
export function isCloudinaryUrl(url: string): boolean {
  return url.startsWith('https://res.cloudinary.com/');
}

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

/**
 * H.264/AAC MP4, which every browser and both native players decode.
 *
 * Deliberately pinned rather than `f_auto`: `f_auto` derives a *different* file
 * per requesting browser, so each new viewer's browser would be the first to ask
 * for its variant and would get the 423 described on `waitUntilPlayable`. One
 * pinned variant is derived once, at upload, and then served to everyone.
 */
export function cloudinaryPlaybackUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/vc_h264,ac_aac,q_auto/${publicId}.mp4`;
}

/**
 * Blocks until a derived asset actually exists.
 *
 * Cloudinary builds derived videos lazily, on first request, and answers
 * `423 Locked` with `X-Cld-Error: Processing continued in the background` until
 * the encode finishes. A `<video>` handed that URL too early just fails to play,
 * so the upload is not finished until the file is really there. The first
 * request is also what starts the encode.
 *
 * Best effort: returns false on timeout rather than throwing, since the asset
 * does become playable eventually.
 */
export async function waitUntilPlayable(url: string, timeoutMs = 120_000): Promise<boolean> {
  const startedAt = Date.now();
  let delayMs = 1_000;
  for (;;) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status !== 423 && res.ok) return true;
    } catch {
      // Network hiccup — treat as not ready and retry until the deadline.
    }
    if (Date.now() - startedAt >= timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 1.5, 8_000);
  }
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

/** How long an upload waits for the encode before posting anyway. */
const UPLOAD_GRACE_MS = 20_000;

export interface UploadOptions {
  /** Folder inside the Cloudinary account, e.g. the uploader's user id. */
  folder?: string;
  /** 0..1, reported as bytes are sent. */
  onProgress?: (fraction: number) => void;
}

interface CloudinaryUploadResponse {
  public_id?: string;
  duration?: number;
  /** Present when the upload preset defines eager transformations. */
  eager?: { secure_url?: string }[];
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

  // An eager transformation in the preset means the encode already ran during
  // upload; otherwise trigger it now and wait, so the URL we hand back plays.
  const eagerUrl = parsed.eager?.[0]?.secure_url;
  const url = eagerUrl ?? cloudinaryPlaybackUrl(publicId);
  if (!eagerUrl) {
    // Encoding runs at roughly the video's own duration, so a long clip would
    // hold the composer for minutes. Kick the encode off and give it a short
    // grace period — enough that short clips are ready on arrival — then post
    // regardless. The player waits out whatever is left (see waitUntilPlayable).
    await waitUntilPlayable(url, UPLOAD_GRACE_MS);
  }

  return {
    url,
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
