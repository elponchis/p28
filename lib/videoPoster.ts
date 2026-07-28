import * as VideoThumbnails from 'expo-video-thumbnails';

/**
 * Extract a JPEG/PNG poster from a local video file. Never use the video URI as an image source.
 */
export async function tryGetVideoPosterUri(localVideoUri: string): Promise<string | undefined> {
  const times = [500, 0, 1500];
  for (const timeMs of times) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(localVideoUri, { time: timeMs });
      if (uri?.length) return uri;
    } catch {
      /* try next offset */
    }
  }
  return undefined;
}
