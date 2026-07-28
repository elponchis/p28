import type { PostReactionType } from '@/lib/api';

export const REACTION_OPTIONS: { type: PostReactionType; emoji: string; label: string }[] = [
  { type: 'prayer', emoji: '🙏', label: 'Prayer' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
];

export const REACTION_EMOJI: Record<PostReactionType, string> = {
  prayer: '🙏',
  laugh: '😂',
  thumbs_up: '👍',
};
