import { bytesToMb, describeUploadError, tooLargeMessage } from '@/lib/uploadErrors';

describe('bytesToMb', () => {
  it('reports one decimal so a just-over file does not read as exactly the limit', () => {
    expect(bytesToMb(52428800)).toBe('50.0');
    expect(bytesToMb(53800000)).toBe('51.3');
  });
});

describe('tooLargeMessage', () => {
  it('names both the file size and the limit', () => {
    const msg = tooLargeMessage(104857600);
    expect(msg).toContain('100.0');
    expect(msg).toContain('50');
  });
});

describe('describeUploadError', () => {
  it('translates the adapter size rejection instead of showing its raw English', () => {
    expect(describeUploadError(new Error('File is too large'))).toBe(
      'This file is too large (max 50 MB).'
    );
  });

  it('translates the adapter MIME rejection', () => {
    expect(describeUploadError(new Error('File type not allowed'))).toBe(
      'This file type is not allowed.'
    );
  });

  it('reads the message off a thrown ApiError object, not just an Error', () => {
    expect(describeUploadError({ message: 'File is too large', code: 'VALIDATION_ERROR' })).toBe(
      'This file is too large (max 50 MB).'
    );
  });

  it('falls back to a user-facing message for anything else', () => {
    const msg = describeUploadError(new Error('socket hang up'));
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('never returns an empty string, even for an unrecognizable throw', () => {
    expect(describeUploadError(undefined).length).toBeGreaterThan(0);
    expect(describeUploadError(null).length).toBeGreaterThan(0);
  });
});
