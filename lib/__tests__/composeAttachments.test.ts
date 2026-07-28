import { pendingToMessageAttachments } from '../composeAttachments';
import type { PendingComposeAttachment } from '@/components/patterns/ComposeBar';

describe('composeAttachments', () => {
  it('pendingToMessageAttachments omits thumbnailUrl when not uploaded', () => {
    const pending: PendingComposeAttachment[] = [
      {
        id: '1',
        kind: 'video',
        displayUri: '',
        uploadedUrl: 'https://example.com/v.mp4',
        uploading: false,
        fileName: 'clip.mov',
        mimeType: 'video/quicktime',
      },
    ];
    expect(pendingToMessageAttachments(pending)).toEqual([
      {
        kind: 'video',
        url: 'https://example.com/v.mp4',
        fileName: 'clip.mov',
        mimeType: 'video/quicktime',
      },
    ]);
  });

  it('pendingToMessageAttachments includes thumbnailUrl when present', () => {
    const pending: PendingComposeAttachment[] = [
      {
        id: '1',
        kind: 'video',
        displayUri: 'file:///thumb.jpg',
        uploadedUrl: 'https://example.com/v.mp4',
        uploadedThumbnailUrl: 'https://example.com/t.jpg',
        uploading: false,
      },
    ];
    const [row] = pendingToMessageAttachments(pending);
    expect(row).toMatchObject({
      kind: 'video',
      url: 'https://example.com/v.mp4',
      thumbnailUrl: 'https://example.com/t.jpg',
    });
  });
});
