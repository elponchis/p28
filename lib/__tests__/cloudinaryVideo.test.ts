import {
  cloudinaryPlaybackUrl,
  cloudinaryPosterUrl,
  isCloudinaryConfigured,
} from '@/lib/cloudinaryVideo';

// The module reads env at import time, so the values here are whatever
// jest's environment provides — assert on shape, not on a specific cloud name.
describe('cloudinaryVideo URLs', () => {
  it('asks for an auto codec on playback so browsers get something they decode', () => {
    const url = cloudinaryPlaybackUrl('groups/abc123');
    expect(url).toContain('/video/upload/');
    expect(url).toContain('f_auto');
    expect(url).toContain('q_auto');
    expect(url).toMatch(/groups\/abc123\.mp4$/);
  });

  it('takes the poster a second in, past the usual black first frame', () => {
    const url = cloudinaryPosterUrl('groups/abc123');
    expect(url).toContain('so_1');
    expect(url).toMatch(/groups\/abc123\.jpg$/);
  });

  it('reports configuration from the env pair', () => {
    expect(typeof isCloudinaryConfigured()).toBe('boolean');
  });
});
