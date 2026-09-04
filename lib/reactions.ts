/**
 * The reaction catalogue: the one place an emoji is added or removed.
 *
 * This used to take three coordinated edits — a union in the API contract, a list in the UI
 * constants, and a CHECK constraint in a migration — which meant adding a smiley required a
 * database deploy. The column now validates shape rather than membership (see 00086), so the
 * set of reactions is a client concern and lives here alone.
 *
 * Deliberately not under components/: the Supabase adapter also needs to know which keys it
 * recognises, and adapters must not import UI. Keys and emoji together are small enough, and
 * stable enough, to sit in lib.
 */
export interface ReactionDefinition {
  /** Stored verbatim in reaction_type. Keep it short, ASCII and stable — renaming orphans rows. */
  key: string;
  emoji: string;
  label: string;
  /** 'quick' shows inline and on the hover toolbar; 'more' lives behind the picker's + button. */
  placement: 'quick' | 'more';
}

export const REACTION_CATALOGUE: readonly ReactionDefinition[] = [
  { key: 'heart', emoji: '❤️', label: 'Heart', placement: 'quick' },
  { key: 'thumbs_up', emoji: '👍', label: 'Thumbs up', placement: 'quick' },
  { key: 'laugh', emoji: '😂', label: 'Laugh', placement: 'quick' },
  { key: 'sad', emoji: '😢', label: 'Sad', placement: 'quick' },
  // Prayer leads the overflow: this app started with it, so existing rows keep rendering.
  { key: 'prayer', emoji: '🙏', label: 'Prayer', placement: 'more' },
  { key: 'wow', emoji: '😮', label: 'Wow', placement: 'more' },
  { key: 'clap', emoji: '👏', label: 'Clap', placement: 'more' },
  { key: 'fire', emoji: '🔥', label: 'Fire', placement: 'more' },
  { key: 'celebrate', emoji: '🎉', label: 'Celebrate', placement: 'more' },
  { key: 'thinking', emoji: '🤔', label: 'Thinking', placement: 'more' },
  { key: 'eyes', emoji: '👀', label: 'Eyes', placement: 'more' },
  { key: 'check', emoji: '✅', label: 'Done', placement: 'more' },
] as const;

/** Longest key the column accepts; mirrors the CHECK added in 00086. */
export const MAX_REACTION_KEY_LENGTH = 32;

export const QUICK_REACTIONS = REACTION_CATALOGUE.filter((r) => r.placement === 'quick');
export const MORE_REACTIONS = REACTION_CATALOGUE.filter((r) => r.placement === 'more');

/** Render order for badges, so a message's reactions never reshuffle between renders. */
export const REACTION_ORDER: string[] = REACTION_CATALOGUE.map((r) => r.key);

const BY_KEY = new Map(REACTION_CATALOGUE.map((r) => [r.key, r]));

/**
 * True for a key this build can draw. A row written by a newer client — or by a build with a
 * larger catalogue — is dropped rather than rendered as a blank badge.
 */
export function isKnownReaction(key: string): boolean {
  return BY_KEY.has(key);
}

export function reactionEmoji(key: string): string | undefined {
  return BY_KEY.get(key)?.emoji;
}

export function reactionLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}
