/**
 * Centre-cropping an image to a fixed aspect ratio, in the browser.
 *
 * Native pickers do this themselves — `allowsEditing` with an `aspect` opens the
 * OS crop UI, so what arrives is already the right shape. expo-image-picker's web
 * implementation supports neither option, so the full original arrives instead and
 * whatever does not fit gets cut off at display time, differently in each place the
 * image appears and with no say from the person who uploaded it. Cropping here at
 * least settles the framing once, when the file is chosen.
 */
import { Platform } from 'react-native';

export interface CroppedImage {
  /** JPEG data URL, usable directly as an <Image> source. */
  uri: string;
  /** Bare base64 payload (no data: prefix), for the upload path. */
  base64: string;
}

/** Quality for the re-encoded JPEG. Banners are decorative; 0.9 is plenty. */
const CROP_JPEG_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the selected image'));
    // blob:/data: sources are same-origin; this keeps a remote one from tainting
    // the canvas and making toDataURL throw.
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Centre-crops to `aspect` (width / height) and returns a JPEG.
 *
 * Returns null off web, when the browser cannot do it, or when the image already
 * matches closely enough to be worth leaving alone — callers should fall back to
 * the original in every one of those cases rather than blocking the upload.
 */
export async function centerCropToAspect(
  sourceUri: string,
  aspect: number
): Promise<CroppedImage | null> {
  if (Platform.OS !== 'web') return null;
  if (typeof document === 'undefined') return null;

  try {
    const img = await loadImage(sourceUri);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return null;

    const current = w / h;
    // Within half a percent of target: re-encoding would cost quality for nothing.
    if (Math.abs(current - aspect) / aspect < 0.005) return null;

    let cropW = w;
    let cropH = h;
    if (current > aspect) {
      cropW = Math.round(h * aspect); // too wide — trim the sides
    } else {
      cropH = Math.round(w / aspect); // too tall — trim top and bottom
    }
    const sx = Math.round((w - cropW) / 2);
    const sy = Math.round((h - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    const uri = canvas.toDataURL('image/jpeg', CROP_JPEG_QUALITY);
    const comma = uri.indexOf(',');
    if (comma < 0) return null;
    return { uri, base64: uri.slice(comma + 1) };
  } catch {
    return null;
  }
}

/** Banners render in 16:9 frames throughout the app. */
export const BANNER_ASPECT = 16 / 9;
