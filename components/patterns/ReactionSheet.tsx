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
import { REACTION_EMOJI, REACTION_OPTIONS } from '@/components/messages';
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
  const insets = useSafeAreaInsets();

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
            accessibilityLabel={t('discussions.reactions')}
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
                    <Ionicons name={action.icon} size={22} color={colors.textPrimary} />
                    <Text style={styles.primaryLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.header}>
              <Text style={styles.title}>{t('discussions.reactions')}</Text>
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
                  <Text style={styles.emptyText}>No reactions so far...be the first one!</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                >
                  {reactionDetails.map((r, idx) => {
                    const isCurrentUser = r.userId === currentUserId;
                    return (
                      <Pressable
                        key={`${r.userId}-${r.reactionType}-${idx}`}
                        onPress={
                          isCurrentUser && canReact
                            ? () => onRemoveReaction(r.reactionType)
                            : undefined
                        }
                        style={({ pressed }) => [
                          styles.row,
                          pressed && isCurrentUser && canReact && styles.rowPressed,
                        ]}
                        disabled={!isCurrentUser || !canReact}
                        accessibilityLabel={
                          isCurrentUser
                            ? `${r.displayName ?? 'You'}, ${REACTION_EMOJI[r.reactionType]}, ${t('discussions.tapToRemove')}`
                            : `${r.displayName ?? t('common.loading')}, ${REACTION_EMOJI[r.reactionType]}`
                        }
                        accessibilityRole={isCurrentUser && canReact ? 'button' : 'text'}
                      >
                        <Avatar
                          source={r.avatarUrl ? { uri: r.avatarUrl } : null}
                          fallbackText={r.displayName}
                          size="sm"
                          accessibilityLabel={r.displayName ? `${r.displayName} profile` : ''}
                        />
                        <View style={styles.rowContent}>
                          <Text style={styles.rowName}>{r.displayName ?? t('common.loading')}</Text>
                          {isCurrentUser && canReact ? (
                            <Text style={styles.rowHint}>{t('discussions.tapToRemove')}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.rowEmoji}>{REACTION_EMOJI[r.reactionType]}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {visible && (
              <View style={styles.footer}>
                <View style={styles.addRow}>
                  {REACTION_OPTIONS.map(({ type, emoji, label }) => {
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
                  })}
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
  loading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  listWrapper: { flex: 1, minHeight: 120 },
  list: { flex: 1, maxHeight: 280 },
  listContent: { paddingVertical: spacing.sm },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.borderSubtle,
  },
  rowContent: { flex: 1 },
  rowName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowEmoji: { fontSize: 24 },
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
