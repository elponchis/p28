/**
 * Who may remove a discussion reply, and on what grounds.
 *
 * Two different rights land on the same button, and keeping them apart is the point of this
 * file. An author deletes their own words; a moderator removes someone else's. The first needs
 * no explanation and the second always does, so the removal is recorded with the person who did
 * it and the thread says which kind of removal it was.
 *
 * A moderator is not bound by the lock an event thread gets when the event ends: a reply worth
 * removing is worth removing whether or not the conversation has closed.
 */

export type PostDeletionRight = 'author' | 'moderator';

export interface PostDeletionContext {
  /** Who is looking at the reply. */
  viewerId?: string;
  /** Who wrote it. */
  authorId?: string;
  /** Viewer administers the group this thread belongs to. */
  isGroupAdmin?: boolean;
  /** Viewer administers the platform. */
  isAppAdmin?: boolean;
  /** Event threads lock when the event is over. */
  threadLocked?: boolean;
}

/**
 * How this viewer may delete this reply, or null if they may not.
 *
 * Returning which right applies rather than a boolean is what lets the caller label the
 * tombstone: the same action means "I took my words back" or "a moderator removed this", and a
 * thread that cannot tell them apart cannot answer "why is my reply gone?".
 */
export function postDeletionRight(context: PostDeletionContext): PostDeletionRight | null {
  const { viewerId, authorId, isGroupAdmin, isAppAdmin, threadLocked } = context;
  if (!viewerId) return null;

  if (viewerId === authorId) return threadLocked ? null : 'author';
  return isGroupAdmin || isAppAdmin ? 'moderator' : null;
}

/** True when a removal was someone else's decision, and so has to say so. */
export function wasRemovedByModerator(post: {
  userId?: string;
  deletedAt?: string;
  deletedByUserId?: string;
}): boolean {
  if (!post.deletedAt || !post.deletedByUserId) return false;
  return post.deletedByUserId !== post.userId;
}
