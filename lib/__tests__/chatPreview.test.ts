import { lastMessageKind } from '@/lib/chatPreview';

describe('lastMessageKind', () => {
  it('says nothing for a message that has text', () => {
    expect(lastMessageKind({ body: 'hello' })).toBeUndefined();
  });

  it('marks a deleted message, whose body was emptied on delete', () => {
    expect(lastMessageKind({ body: '', deleted: true })).toBe('deleted');
  });

  it('marks a deleted message even if a body somehow survived', () => {
    expect(lastMessageKind({ body: 'secret', deleted: true })).toBe('deleted');
  });

  it('marks a photo or file sent on its own', () => {
    expect(lastMessageKind({ body: '', attachmentCount: 1 })).toBe('attachment');
    expect(lastMessageKind({ body: null, attachmentCount: 3 })).toBe('attachment');
  });

  it('prefers the caption when a photo was sent with one', () => {
    expect(lastMessageKind({ body: 'look at this', attachmentCount: 1 })).toBeUndefined();
  });

  it('treats whitespace as no text', () => {
    expect(lastMessageKind({ body: '   ', attachmentCount: 1 })).toBe('attachment');
    expect(lastMessageKind({ body: '   ' })).toBeUndefined();
  });
});
