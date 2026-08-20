import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

/** Seek offsets to try, in ms. The very first frame is often blank. */
const POSTER_TIMES_MS = [500, 0, 1500];

function waitForEvent(target: HTMLVideoElement, event: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onDone);
      target.removeEventListener('error', onError);
      clearTimeout(timer);
    };
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Video failed to ${event}`));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    target.addEventListener(event, onDone, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

/**
 * Grab a frame in the browser by drawing the decoded video onto a canvas.
 *
 * expo-video-thumbnails has no web implementation — it throws
 * "ExpoVideoThumbnails not supported on Expo Web" — so without this a video
 * posted from the web build has no poster and renders as an empty placeholder.
 *
 * Returns a JPEG data URL, which the upload path reads back via `fetch`.
 */
async function webVideoPosterUri(localVideoUri: string): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;

  const video = document.createElement('video');
  video.src = localVideoUri;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  // Same-origin blob: URLs are clean, but a remote source would otherwise taint
  // the canvas and make toDataURL throw.
  video.crossOrigin = 'anonymous';

  try {
    await waitForEvent(video, 'loadeddata');
    for (const timeMs of POSTER_TIMES_MS) {
      try {
        const target = Math.min(timeMs / 1000, Math.max(0, (video.duration || 0) - 0.1));
        if (Math.abs(video.currentTime - target) > 0.01) {
          video.currentTime = target;
          await waitForEvent(video, 'seeked');
        }
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) continue;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (dataUrl && dataUrl.length > 'data:image/jpeg;base64,'.length) return dataUrl;
      } catch {
        /* try the next offset */
      }
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

/**
 * Extract a JPEG/PNG poster from a local video file. Never use the video URI as an image source.
 *
 * Returns undefined when no frame can be read; callers must treat a poster as optional.
 */
export async function tryGetVideoPosterUri(localVideoUri: string): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    return webVideoPosterUri(localVideoUri);
  }
  for (const timeMs of POSTER_TIMES_MS) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(localVideoUri, { time: timeMs });
      if (uri?.length) return uri;
    } catch {
      /* try next offset */
    }
  }
  return undefined;
}
