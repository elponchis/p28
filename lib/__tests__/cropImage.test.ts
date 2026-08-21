jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { Platform } from 'react-native';

import { BANNER_ASPECT, centerCropToAspect } from '@/lib/cropImage';

const platform = Platform as unknown as { OS: string };

describe('centerCropToAspect', () => {
  afterEach(() => {
    platform.OS = 'ios';
    delete (globalThis as { document?: unknown }).document;
  });

  it('is 16:9 for banners', () => {
    expect(BANNER_ASPECT).toBeCloseTo(16 / 9);
  });

  it('declines on native, where the picker already cropped', async () => {
    platform.OS = 'ios';
    await expect(centerCropToAspect('file:///photo.jpg', BANNER_ASPECT)).resolves.toBeNull();
  });

  it('declines when the browser has no document to draw into', async () => {
    platform.OS = 'web';
    await expect(centerCropToAspect('blob:x', BANNER_ASPECT)).resolves.toBeNull();
  });

  it('declines rather than throwing when the image cannot be read', async () => {
    platform.OS = 'web';
    (globalThis as { document?: unknown }).document = {
      createElement: () => {
        throw new Error('nope');
      },
    };
    await expect(centerCropToAspect('blob:broken', BANNER_ASPECT)).resolves.toBeNull();
  });
});
