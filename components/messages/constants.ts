/**
 * Reaction options for the message UI.
 *
 * The catalogue itself lives in lib/reactions, because the Supabase adapter needs the same key
 * list and must not import from components. These are the view-shaped projections of it.
 */
import {
  MORE_REACTIONS,
  QUICK_REACTIONS,
  REACTION_CATALOGUE,
  REACTION_ORDER,
  reactionEmoji,
  type ReactionDefinition,
} from '@/lib/reactions';

export interface ReactionOption {
  type: string;
  emoji: string;
  label: string;
}

function toOption(definition: ReactionDefinition): ReactionOption {
  return { type: definition.key, emoji: definition.emoji, label: definition.label };
}

/** Shown inline, on the hover toolbar and in the picker's first row. */
export const REACTION_OPTIONS: ReactionOption[] = QUICK_REACTIONS.map(toOption);

/** Behind the + button. */
export const REACTION_EXTRA_OPTIONS: ReactionOption[] = MORE_REACTIONS.map(toOption);

export const ALL_REACTION_OPTIONS: ReactionOption[] = REACTION_CATALOGUE.map(toOption);

/** Emoji for a stored key. Unknown keys render as nothing rather than an empty badge. */
export const REACTION_EMOJI: Record<string, string> = Object.fromEntries(
  REACTION_CATALOGUE.map((r) => [r.key, r.emoji])
);

export { REACTION_ORDER, reactionEmoji };
