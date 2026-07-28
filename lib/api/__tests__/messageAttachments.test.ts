import {
  attachmentsForApiRow,
  deriveImageUrlsForDb,
  mergeAttachmentsForCreate,
  parseClientAttachments,
  parseStoredAttachments,
} from '@/lib/api/messageAttachments';

describe('messageAttachments', () => {
  it('parseStoredAttachments drops invalid entries', () => {
    expect(parseStoredAttachments(null)).toEqual([]);
    expect(parseStoredAttachments([{ kind: 'image', url: 'https://x/a.jpg' }])).toEqual([
      { kind: 'image', url: 'https://x/a.jpg' },
    ]);
    expect(parseStoredAttachments([{ kind: 'bad', url: 'x' }])).toEqual([]);
    expect(parseStoredAttachments([{ kind: 'file', url: '' }])).toEqual([]);
  });

  it('mergeAttachmentsForCreate prefers attachments over legacy imageUrls', () => {
    expect(
      mergeAttachmentsForCreate(
        [{ kind: 'video', url: 'https://v', thumbnailUrl: 'https://t' }],
        ['https://legacy.jpg']
      )
    ).toEqual([{ kind: 'video', url: 'https://v', thumbnailUrl: 'https://t' }]);
    expect(mergeAttachmentsForCreate(undefined, ['https://a.jpg'])).toEqual([
      { kind: 'image', url: 'https://a.jpg' },
    ]);
  });

  it('deriveImageUrlsForDb returns only image urls', () => {
    expect(
      deriveImageUrlsForDb([
        { kind: 'image', url: 'https://i.jpg' },
        { kind: 'file', url: 'https://f.pdf', fileName: 'a.pdf' },
      ])
    ).toEqual(['https://i.jpg']);
    expect(
      deriveImageUrlsForDb([{ kind: 'file', url: 'https://f.pdf', fileName: 'a.pdf' }])
    ).toBeNull();
  });

  it('attachmentsForApiRow uses DB json when non-empty', () => {
    const fromDb = [{ kind: 'file' as const, url: 'https://f', fileName: 'x.pdf' }];
    expect(attachmentsForApiRow(fromDb, ['https://only-legacy.jpg'])).toEqual(fromDb);
  });

  it('attachmentsForApiRow falls back to legacy image_urls', () => {
    expect(attachmentsForApiRow([], ['https://a.jpg'])).toEqual([
      { kind: 'image', url: 'https://a.jpg' },
    ]);
    expect(attachmentsForApiRow([], [])).toBeUndefined();
  });

  it('parseClientAttachments matches parseStoredAttachments', () => {
    expect(parseClientAttachments([{ kind: 'image', url: 'u' }])).toEqual([
      { kind: 'image', url: 'u' },
    ]);
  });
});
