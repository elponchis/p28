/**
 * How a row of reactions is drawn, which is a question about how much room there is.
 *
 * Measured on the window, not on the pointer: a mouse in a narrow window has the same shortage
 * of space a phone does, and space is what these answer — how large an emoji can be read and
 * clicked, and how many kinds fit before the row runs into what sits beside it.
 *
 * Shared by the chat bubble and the discussion reply so the two cannot drift apart, which is how
 * they came to disagree about reactions in the first place. They do differ in one thing, and only
 * one: how large the emoji may be.
 */
import { breakpoints } from '@/theme/tokens';

/**
 * Where the row is being drawn.
 *
 * A discussion reply is a block of its own with room under it, so a wide window gets a larger
 * emoji — that is what the bigger icons were asked for. A chat bubble has the timestamp sitting
 * against its bottom edge, and a badge grown to the same size covers it. So chat keeps the size
 * it always had, on every screen.
 */
export type ReactionSurface = 'chat' | 'discussion';

export interface ReactionRowMetrics {
  /** Font size for the emoji in a badge. */
  emojiSize: number;
  /** Roughly what a badge measures once its padding and border are counted. */
  badgeHeight: number;
  /** How far a badge row may hang below the thing it belongs to. */
  overhang: number;
  /** How many kinds of reaction to show before the rest go behind a button. */
  maxVisible: number;
}

/** The size a chat badge has always been, and the small end of the discussion range. */
const BASE_EMOJI_SIZE = 14;

export function reactionRowMetrics(
  windowWidth: number,
  surface: ReactionSurface = 'discussion'
): ReactionRowMetrics {
  const isWide = windowWidth >= breakpoints.desktop;
  const emojiSize = isWide && surface === 'discussion' ? 21 : BASE_EMOJI_SIZE;
  const badgeHeight = emojiSize + 12;
  return {
    emojiSize,
    badgeHeight,
    overhang: Math.round(badgeHeight * 0.55),
    maxVisible: isWide ? 10 : 4,
  };
}

/**
 * The kinds to draw and how many are left over.
 *
 * Returned together because the two must agree: a row that shows nine and says "+2" is worse
 * than either mistake on its own.
 */
export function splitVisibleReactions<T>(
  reactions: T[],
  metrics: ReactionRowMetrics
): { visible: T[]; hidden: number } {
  const visible = reactions.slice(0, metrics.maxVisible);
  return { visible, hidden: reactions.length - visible.length };
}
