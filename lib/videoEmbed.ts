import { extractUrlsFromText } from '@/lib/extractUrlsFromText';

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

/**
 * A Vimeo id, and the privacy hash that comes with an unlisted video.
 *
 * An unlisted video is shared as vimeo.com/<id>/<hash>, and the player refuses to play it
 * without that hash — dropping it, which this used to do, turns every unlisted video into
 * "Private video". The hash may also arrive as ?h= on a player.vimeo.com link.
 */
function extractVimeo(url: URL): { id: string; hash?: string } | null {
  const match = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/);
  if (!match) return null;
  const queryHash = url.searchParams.get('h');
  const hash = match[2] || queryHash || undefined;
  return { id: match[1], hash: hash ?? undefined };
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
    const vimeo = extractVimeo(url);
    if (!vimeo) return null;
    const embedUrl = vimeo.hash
      ? `https://player.vimeo.com/video/${vimeo.id}?h=${vimeo.hash}`
      : `https://player.vimeo.com/video/${vimeo.id}`;
    return { provider: 'vimeo', embedUrl };
  }

  return null;
}

/**
 * First YouTube/Vimeo link in a block of text, or null.
 *
 * Message bodies are plain text, so a pasted video link is otherwise inert —
 * this is what lets a post render a player for it.
 */
export function firstEmbeddableVideoUrl(text: string | null | undefined): string | null {
  for (const url of extractUrlsFromText(text)) {
    if (parseVideoEmbedUrl(url)) return url;
  }
  return null;
}
