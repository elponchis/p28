/**
 * Whether a message should notify someone who has not caught up yet.
 *
 * The first rule was "only the first unread message notifies", which stops ten people in a group
 * producing ten pushes. It also stops the eleventh message an hour later from producing any: once
 * you have one unread thing in a conversation, that conversation goes silent until you open it.
 * Reported as notifications that "sometimes don't come", and they were right.
 *
 * So the rule keeps a clock. A burst is still one notification, because the messages in it land
 * seconds apart. A conversation that has been quiet for longer than the window notifies again,
 * because by then it is a new burst rather than more of the same one.
 */

/** A conversation that has been quiet this long is telling you something new. */
export const RENOTIFY_AFTER_MS = 5 * 60 * 1000;

export interface UnreadRunInput {
  /** When the message being delivered was sent, in ms. */
  sentAt: number;
  /**
   * When the recipient last read the chat (or joined it, if they never have), in ms. Messages at
   * or before this are read; anything after is part of their unread run.
   */
  readAt: number;
  /** When other people's earlier messages in this chat were sent, in ms. Order does not matter. */
  priorMessageTimes: number[];
}

/**
 * True when this message should notify: nothing unread before it, or the last unread thing is old
 * enough that the conversation had gone quiet.
 */
export function shouldNotifyForMessage(input: UnreadRunInput): boolean {
  const { sentAt, readAt, priorMessageTimes } = input;
  if (!Number.isFinite(sentAt)) return false;

  let newestUnread = Number.NEGATIVE_INFINITY;
  for (const at of priorMessageTimes) {
    if (!Number.isFinite(at)) continue;
    if (at > readAt && at < sentAt && at > newestUnread) newestUnread = at;
  }

  if (newestUnread === Number.NEGATIVE_INFINITY) return true;
  return sentAt - newestUnread >= RENOTIFY_AFTER_MS;
}
