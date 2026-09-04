import { olderMessagesScrollTarget } from '@/lib/chatScrollAnchor';

const anchor = { height: 2981, offset: 0, firstMessageId: 'm50' };

describe('olderMessagesScrollTarget', () => {
  it('closes the gap the prepended page opened', () => {
    // Measured against production: 50 messages were 2981px, 78 were 4881px.
    expect(olderMessagesScrollTarget(anchor, { height: 4881, firstMessageId: 'm22' })).toBe(1900);
  });

  it('keeps a reader who was partway down exactly where they were', () => {
    const partway = { height: 2981, offset: 640, firstMessageId: 'm50' };
    expect(olderMessagesScrollTarget(partway, { height: 4881, firstMessageId: 'm22' })).toBe(2540);
  });

  it('waits through the resize caused by the button becoming a spinner', () => {
    // The bug this exists for: this resize used to consume the anchor, and the page that
    // arrived a moment later had nothing left to correct it.
    expect(olderMessagesScrollTarget(anchor, { height: 2985, firstMessageId: 'm50' })).toBeNull();
    expect(olderMessagesScrollTarget(anchor, { height: 2977, firstMessageId: 'm50' })).toBeNull();
  });

  it('ignores a message arriving at the end, which moves nothing above the reader', () => {
    expect(olderMessagesScrollTarget(anchor, { height: 3060, firstMessageId: 'm50' })).toBeNull();
  });

  it('does not scroll when the content did not actually grow', () => {
    expect(olderMessagesScrollTarget(anchor, { height: 2981, firstMessageId: 'm22' })).toBeNull();
    expect(olderMessagesScrollTarget(anchor, { height: 2400, firstMessageId: 'm22' })).toBeNull();
  });

  it('handles an anchor captured on an empty thread', () => {
    const empty = { height: 0, offset: 0, firstMessageId: undefined };
    expect(olderMessagesScrollTarget(empty, { height: 900, firstMessageId: 'm1' })).toBe(900);
    expect(olderMessagesScrollTarget(empty, { height: 900, firstMessageId: undefined })).toBeNull();
  });
});
