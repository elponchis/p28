/**
 * The toolbar that appears beside a message on hover: quick reactions, more, reply.
 *
 * Desktop only. Reacting and replying are reachable by long press everywhere, but with a mouse
 * a long press means click-and-hold, which nobody discovers. Shared by the chat bubble row and
 * the discussion reply card so the two do not drift apart.
 *
 * Whoever renders this owns the hover state, because the listeners have to sit on the whole row:
 * put them on the bubble and moving the pointer onto this toolbar counts as leaving the message,
 * dismissing the very thing being reached for.
 */
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import type { PostReactionType } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/tokens';

import { REACTION_OPTIONS } from './constants';

export interface MessageHoverActionsProps {
  /** Own messages get reply only — reacting to yourself is not a thing people do. */
  isOwnMessage: boolean;
  /** Reaction types the viewer already has on this message, so a second press removes. */
  userReactionTypes: PostReactionType[];
  onAddReaction?: (type: PostReactionType) => void;
  onRemoveReaction?: (type: PostReactionType) => void;
  /** Opens the full picker (the long-press sheet), reached by the + button. */
  onMore?: () => void;
  onReply?: () => void;
}

/** True where a hover toolbar makes sense at all. */
export const HOVER_ACTIONS_SUPPORTED = Platform.OS === 'web';

export function MessageHoverActions({
  isOwnMessage,
  userReactionTypes,
  onAddReaction,
  onRemoveReaction,
  onMore,
  onReply,
}: MessageHoverActionsProps) {
  return (
    <View style={styles.container}>
      {(isOwnMessage ? [] : REACTION_OPTIONS).map((option) => {
        const mine = userReactionTypes.includes(option.type);
        return (
          <Pressable
            key={option.type}
            onPress={() => (mine ? onRemoveReaction?.(option.type) : onAddReaction?.(option.type))}
            style={({ pressed }) => [
              styles.button,
              mine && styles.buttonActive,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
          </Pressable>
        );
      })}
      {/* Four quick picks cover most of it; the rest are one tap further, in the sheet. */}
      {!isOwnMessage && onMore ? (
        <Pressable
          onPress={onMore}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('discussions.moreReactions')}
        >
          <Ionicons name="add" size={15} color={colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
      {onReply ? (
        <Pressable
          onPress={onReply}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('discussions.sheetReply')}
          accessibilityHint={t('discussions.sheetReplyHint')}
        >
          <Ionicons name="arrow-undo-outline" size={15} color={colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-end',
    marginBottom: 2,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerHigh,
  },
  button: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: 14,
  },
});
