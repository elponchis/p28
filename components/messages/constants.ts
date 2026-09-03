import type { PostReactionType } from '@/lib/api';

export interface ReactionOption {
  type: PostReactionType;
  emoji: string;
  label: string;
}

/** Shown inline, on the hover toolbar and in the picker's first row. */
export const REACTION_OPTIONS: ReactionOption[] = [
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
];

/**
 * Behind the + button. Prayer leads it: this is a church app and 🙏 was one of the original
 * three reactions, so every reaction already in the database still has somewhere to live.
 */
export const REACTION_EXTRA_OPTIONS: ReactionOption[] = [
  { type: 'prayer', emoji: '🙏', label: 'Prayer' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'thinking', emoji: '🤔', label: 'Thinking' },
  { type: 'eyes', emoji: '👀', label: 'Eyes' },
  { type: 'check', emoji: '✅', label: 'Done' },
];

export const ALL_REACTION_OPTIONS: ReactionOption[] = [
  ...REACTION_OPTIONS,
  ...REACTION_EXTRA_OPTIONS,
];

export const REACTION_EMOJI: Record<PostReactionType, string> = ALL_REACTION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.type] = option.emoji;
    return acc;
  },
  {} as Record<PostReactionType, string>
);

/** Order badges render in, so a message's reactions do not reshuffle between renders. */
export const REACTION_ORDER: PostReactionType[] = ALL_REACTION_OPTIONS.map((o) => o.type);
