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
