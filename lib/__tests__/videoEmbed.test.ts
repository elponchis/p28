import { firstEmbeddableVideoUrl, parseVideoEmbedUrl } from '@/lib/videoEmbed';

describe('firstEmbeddableVideoUrl', () => {
  it('returns null when there is nothing to embed', () => {
    expect(firstEmbeddableVideoUrl('')).toBeNull();
    expect(firstEmbeddableVideoUrl(null)).toBeNull();
    expect(firstEmbeddableVideoUrl('see https://example.com/notavideo')).toBeNull();
  });

  it('finds a link surrounded by ordinary text', () => {
    const url = firstEmbeddableVideoUrl(
      '주일 설교 영상입니다 https://www.youtube.com/watch?v=dQw4w9WgXcQ 은혜받으세요'
    );
    expect(url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(parseVideoEmbedUrl(url as string)?.provider).toBe('youtube');
  });

  it('skips non-video links to reach the video one', () => {
    expect(firstEmbeddableVideoUrl('https://example.com/a https://vimeo.com/76979871')).toBe(
      'https://vimeo.com/76979871'
    );
  });

  it('takes the first of several videos', () => {
    expect(firstEmbeddableVideoUrl('https://youtu.be/aaa111 and https://youtu.be/bbb222')).toBe(
      'https://youtu.be/aaa111'
    );
  });
});

describe('parseVideoEmbedUrl — Vimeo privacy hashes', () => {
  it('keeps the hash an unlisted video is shared with', () => {
    // Without the hash the player answers "Private video", which is how this was found.
    expect(parseVideoEmbedUrl('https://vimeo.com/1153516468/e830c8eb95')?.embedUrl).toBe(
      'https://player.vimeo.com/video/1153516468?h=e830c8eb95'
    );
  });

  it('keeps a hash that arrived as a query parameter', () => {
    expect(
      parseVideoEmbedUrl('https://player.vimeo.com/video/1153516468?h=e830c8eb95')?.embedUrl
    ).toBe('https://player.vimeo.com/video/1153516468?h=e830c8eb95');
  });

  it('leaves a public video alone', () => {
    expect(parseVideoEmbedUrl('https://vimeo.com/76979871')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871'
    );
  });

  it('ignores a trailing path that is not a hash', () => {
    expect(parseVideoEmbedUrl('https://vimeo.com/76979871/')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871'
    );
  });
});
