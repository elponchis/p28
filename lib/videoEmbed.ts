export type VideoEmbedProvider = 'youtube' | 'vimeo';

export interface VideoEmbed {
  provider: VideoEmbedProvider;
  /** Iframe-embeddable URL for the video (autoplay off). */
  embedUrl: string;
}

function extractYouTubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    return url.pathname.slice(1).split('/')[0] || null;
  }
  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }
  const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
  if (shortsMatch) return shortsMatch[1];
  const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

function extractVimeoId(url: URL): string | null {
  const match = url.pathname.match(/\/(\d+)(?:\/|$)/);
  return match ? match[1] : null;
}

/**
 * Parses a YouTube or Vimeo watch/share URL (youtube.com, youtu.be, m.youtube.com,
 * vimeo.com, player.vimeo.com) into an iframe-embeddable URL. Returns null for anything
 * else — lesson video_url is stored/entered as a plain watch URL, not an embed URL.
 */
export function parseVideoEmbedUrl(rawUrl: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = extractVimeoId(url);
    if (!id) return null;
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
  }

  return null;
}
