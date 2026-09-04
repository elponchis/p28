/**
 * Keeping the reader in place when older messages are prepended.
 *
 * Loading a page of history makes the thread taller above the reader, which would otherwise slide
 * everything they were looking at off the bottom of the screen — press "load older" while parked
 * at the top and you land on the oldest message in the chat, which is nowhere near where you were
 * reading. The fix is to add the height that appeared above to the scroll offset.
 *
 * The subtlety is knowing which growth is the one to correct for. The content also changes size
 * while the fetch is in flight — the button swaps to a spinner — and a naive "next size change
 * wins" rule spends the correction on those few pixels and has nothing left when the messages
 * actually land. So the anchor also records the oldest message on screen, and only a change to
 * *that* counts as the page arriving.
 */

export interface OlderMessagesAnchor {
  /** Content height before the older page was asked for. */
  height: number;
  /** Where the reader was in that content. */
  offset: number;
  /** The oldest message rendered at that moment. */
  firstMessageId?: string;
}

/**
 * Where to scroll now that the content has resized, or null to keep waiting.
 *
 * Null means this resize was not the older page arriving — hold the anchor for the one that is.
 */
export function olderMessagesScrollTarget(
  anchor: OlderMessagesAnchor,
  current: { height: number; firstMessageId?: string }
): number | null {
  // Same message at the top: whatever resized, it was not a page of history. A message arriving
  // at the *end* also lands here, which is right — it belongs below the reader and moves nothing.
  if (current.firstMessageId === anchor.firstMessageId) return null;
  // Nothing was added above; there is no gap to close.
  if (current.height <= anchor.height) return null;
  return anchor.offset + (current.height - anchor.height);
}
