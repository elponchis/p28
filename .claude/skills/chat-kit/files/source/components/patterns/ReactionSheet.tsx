import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives';
import {
  ALL_REACTION_OPTIONS,
  REACTION_EMOJI,
  REACTION_OPTIONS,
  REACTION_ORDER,
} from '@/components/messages';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { PostReactionType } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface ReactionSheetPrimaryAction {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Red icon/label styling (e.g. Delete). */
  destructive?: boolean;
}

export interface ReactionSheetProps {
  visible: boolean;
  onClose: () => void;
  reactionsLoading: boolean;
  reactionDetails: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    reactionType: PostReactionType;
  }[];
  selectedReactionTypes: PostReactionType[];
  currentUserId?: string;
  canReact?: boolean;
  isMutating?: boolean;
  onAddReaction: (type: PostReactionType) => void;
  onRemoveReaction: (type: PostReactionType) => void;
  /** Shown above the Reactions title (e.g. Reply, Edit). Caller should dismiss the sheet inside onPress if needed. */
  primaryActions?: ReactionSheetPrimaryAction[];
}

export function ReactionSheet({
  visible,
  onClose,
  reactionsLoading,
  reactionDetails,
  selectedReactionTypes,
  currentUserId,
  canReact = true,
  isMutating = false,
  onAddReaction,
  onRemoveReaction,
  primaryActions = [],
}: ReactionSheetProps) {
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);

  /** One entry per emoji, in catalogue order, so the rows never reshuffle between openings. */
  const groupedReactions = React.useMemo(() => {
    const byType = new Map<PostReactionType, typeof reactionDetails>();
    for (const detail of reactionDetails) {
      const list = byType.get(detail.reactionType);
      if (list) list.push(detail);
      else byType.set(detail.reactionType, [detail]);
    }
    return REACTION_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      people: byType.get(type)!,
    }));
  }, [reactionDetails]);
  const insets = useSafeAreaInsets();
  const [showAllReactions, setShowAllReactions] = React.useState(false);
  // Each opening starts folded, so the sheet does not remember an expansion from another message.
  React.useEffect(() => {
    if (!visible) setShowAllReactions(false);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel={t('common.cancel')}
        accessibilityRole="button"
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.sheetAnimated, { transform: [{ translateY: sheetSlideAnim }] }]}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityLabel={t('message.reactions')}
            accessibilityRole="none"
          >
            {primaryActions.length > 0 ? (
              <View style={[styles.primaryActions, styles.primaryActionsAboveTitle]}>
                {primaryActions.map((action) => (
                  <Pressable
                    key={action.key}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.primaryRow,
                      pressed && styles.primaryRowPressed,
                    ]}
                    accessibilityLabel={action.accessibilityLabel ?? action.label}
                    accessibilityHint={action.accessibilityHint}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={action.icon}
                      size={22}
                      color={action.destructive ? colors.error : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.primaryLabel,
                        action.destructive && styles.primaryLabelDestructive,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.header}>
              <Text style={styles.title}>{t('message.reactions')}</Text>
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel={t('common.back')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.listWrapper}>
              {reactionsLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : reactionDetails.length === 0 ? (
                <View style={styles.empty}>
                  {/* Inviting a first reaction only makes sense where one can be left. On your
                      own message the emoji row is absent, so the sentence stops at the fact. */}
                  <Text style={styles.emptyText}>
                    {canReact ? t('message.noReactionsYetInvite') : t('message.noReactionsYet')}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Grouped by emoji, not by person: the question this list answers is "who
                      reacted with that one", and a row per person made the same heart appear
                      five times down the page while nobody could see who was under it. */}
                  {groupedReactions.map((group) => (
                    // The emoji and the people who left it travel together: the chunk takes what
                    // width it needs and moves to the next line whole, rather than each emoji
                    // claiming a line of its own or a name being orphaned from its emoji.
                    <View key={group.type} style={styles.group}>
                      <Text style={styles.groupEmoji}>{REACTION_EMOJI[group.type]}</Text>
                      <Text style={styles.groupCount}>{group.people.length}</Text>
                      {group.people.map((person, idx) => (
                        <View key={`${person.userId}-${idx}`} style={styles.person}>
                          <Avatar
                            source={person.avatarUrl ? { uri: person.avatarUrl } : null}
                            fallbackText={person.displayName}
                            size="sm"
                            accessibilityLabel={
                              person.displayName ? `${person.displayName} profile` : ''
                            }
                          />
                          <Text style={styles.personName} numberOfLines={1}>
                            {person.displayName ?? t('common.loading')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Hidden rather than disabled: a greyed-out emoji row says nothing about why. */}
            {visible && canReact && (
              <View style={styles.footer}>
                <View style={styles.addRow}>
                  {(showAllReactions ? ALL_REACTION_OPTIONS : REACTION_OPTIONS).map(
                    ({ type, emoji, label }) => {
                      const isSelected = selectedReactionTypes.includes(type);
                      const onPress = () =>
                        isSelected ? onRemoveReaction(type) : onAddReaction(type);
                      return (
                        <Pressable
                          key={type}
                          onPress={onPress}
                          style={({ pressed }) => [
                            styles.addOption,
                            isSelected && styles.addOptionSelected,
                            pressed && styles.addOptionPressed,
                          ]}
                          disabled={isMutating || !canReact}
                          accessibilityLabel={isSelected ? `Remove ${label}` : `Add ${label}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.addEmoji}>{emoji}</Text>
                        </Pressable>
                      );
                    }
                  )}
                  {/* The long tail stays folded away until asked for: four covers most of it,
                      and twelve emoji up front is a menu rather than a reaction. */}
                  {showAllReactions ? null : (
                    <Pressable
                      onPress={() => setShowAllReactions(true)}
                      style={({ pressed }) => [
                        styles.addOption,
                        pressed && styles.addOptionPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('message.moreReactions')}
                    >
                      <Ionicons name="add" size={20} color={colors.onSurfaceVariant} />
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(28, 28, 28, 0.3)' },
  sheetAnimated: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  sheet: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    height: Math.min(400, Dimensions.get('window').height * 0.7),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  closeButton: { padding: spacing.xs },
  primaryActions: {
    paddingVertical: spacing.xs,
  },
  primaryActionsAboveTitle: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryRowPressed: {
    backgroundColor: colors.borderSubtle,
  },
  primaryLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  primaryLabelDestructive: {
    color: colors.error,
  },
  loading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  listWrapper: { flex: 1, minHeight: 120 },
  list: { flex: 1, maxHeight: 280 },
  listContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.borderSubtle,
    // Sized to its contents, so several chunks share a line and a long one wraps internally
    // rather than stretching to the full width and pushing the next chunk down.
    maxWidth: '100%',
  },
  groupEmoji: { fontSize: 20 },
  groupCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.xxs,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  personName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  addRow: { flexDirection: 'row', gap: spacing.md },
  addOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionSelected: {
    backgroundColor: colors.primary,
  },
  addOptionPressed: { opacity: 0.8 },
  addEmoji: { fontSize: 24 },
});
