import {
  cloudinaryPlaybackUrl,
  cloudinaryPosterUrl,
  isCloudinaryConfigured,
  waitUntilPlayable,
} from '@/lib/cloudinaryVideo';

// The module reads env at import time, so the values here are whatever
// jest's environment provides — assert on shape, not on a specific cloud name.
describe('cloudinaryVideo URLs', () => {
  it('pins H.264 so one derivative serves every browser', () => {
    const url = cloudinaryPlaybackUrl('groups/abc123');
    expect(url).toContain('/video/upload/');
    expect(url).toContain('vc_h264');
    expect(url).toContain('ac_aac');
    // f_auto would derive a separate file per browser, and each browser's first
    // viewer would hit the 423 that waitUntilPlayable exists to absorb.
    expect(url).not.toContain('f_auto');
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

describe('waitUntilPlayable', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('resolves true once the derivative stops returning 423', async () => {
    const responses = [
      { status: 423, ok: false },
      { status: 200, ok: true },
    ];
    const spy = jest.fn().mockImplementation(() => Promise.resolve(responses.shift()));
    globalThis.fetch = spy as unknown as typeof fetch;

    await expect(waitUntilPlayable('https://example.com/v.mp4', 30_000)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('gives up rather than throwing when the encode never finishes', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ status: 423, ok: false }) as unknown as typeof fetch;

    await expect(waitUntilPlayable('https://example.com/v.mp4', 0)).resolves.toBe(false);
  });
});
