import { postDeletionRight, wasRemovedByModerator } from '@/lib/moderation';

const author = 'u-author';
const admin = 'u-admin';

describe('postDeletionRight', () => {
  it('lets an author remove their own reply', () => {
    expect(postDeletionRight({ viewerId: author, authorId: author })).toBe('author');
  });

  it('does not let an ordinary member touch someone else’s reply', () => {
    expect(postDeletionRight({ viewerId: 'u-member', authorId: author })).toBeNull();
  });

  it('lets a group admin remove a member’s reply, as a moderator', () => {
    expect(postDeletionRight({ viewerId: admin, authorId: author, isGroupAdmin: true })).toBe(
      'moderator'
    );
  });

  it('lets a platform admin do the same', () => {
    expect(postDeletionRight({ viewerId: admin, authorId: author, isAppAdmin: true })).toBe(
      'moderator'
    );
  });

  it('stops an author once the thread is locked', () => {
    // Event threads close when the event is over; the author has missed their moment.
    expect(
      postDeletionRight({ viewerId: author, authorId: author, threadLocked: true })
    ).toBeNull();
  });

  it('does not stop a moderator at a locked thread', () => {
    // A reply worth removing is worth removing after the conversation closes.
    expect(
      postDeletionRight({
        viewerId: admin,
        authorId: author,
        isGroupAdmin: true,
        threadLocked: true,
      })
    ).toBe('moderator');
  });

  it('calls an admin removing their own reply an author removal', () => {
    // Same act, no moderation to explain — the tombstone should not accuse them of policing
    // themselves.
    expect(postDeletionRight({ viewerId: admin, authorId: admin, isGroupAdmin: true })).toBe(
      'author'
    );
  });

  it('gives a signed-out reader nothing', () => {
    expect(postDeletionRight({ authorId: author, isAppAdmin: true })).toBeNull();
  });
});

describe('wasRemovedByModerator', () => {
  it('is true when someone other than the author removed it', () => {
    expect(
      wasRemovedByModerator({ userId: author, deletedAt: '2026-09-07', deletedByUserId: admin })
    ).toBe(true);
  });

  it('is false when the author removed their own', () => {
    expect(
      wasRemovedByModerator({ userId: author, deletedAt: '2026-09-07', deletedByUserId: author })
    ).toBe(false);
  });

  it('is false for a reply that is not removed at all', () => {
    expect(wasRemovedByModerator({ userId: author })).toBe(false);
  });

  it('is false when the remover was not recorded, rather than guessing', () => {
    // Rows removed before this column existed. Saying "a moderator did it" without knowing is
    // worse than saying nothing.
    expect(wasRemovedByModerator({ userId: author, deletedAt: '2026-09-07' })).toBe(false);
  });
});
