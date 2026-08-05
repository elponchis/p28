import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import type { Discussion } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

const editorialShadow = {
  shadowColor: '#151c27',
  shadowOpacity: 0.06,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 15 },
  ...Platform.select({ android: { elevation: 3 } }),
};

interface DiscussionListSectionProps {
  title: string;
  discussions: Discussion[];
  isLoading: boolean;
  emptyIconName: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptySubtitle: string;
  canAdd: boolean;
  addLabel: string;
  addHint: string;
  onAddPress: () => void;
  onItemPress: (discussion: Discussion) => void;
}

/** Reusable "topics + replies" list section, shared by the group discussion feed, course boards, and lesson Q&A. */
export function DiscussionListSection({
  title,
  discussions,
  isLoading,
  emptyIconName,
  emptyTitle,
  emptySubtitle,
  canAdd,
  addLabel,
  addHint,
  onAddPress,
  onItemPress,
}: DiscussionListSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {canAdd ? (
          <Pressable
            onPress={onAddPress}
            style={styles.addTopicButton}
            accessibilityLabel={addLabel}
            accessibilityHint={addHint}
          >
            <Ionicons name="add-circle" size={16} color={colors.secondary} />
            <Text style={styles.addTopicText}>{addLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : discussions.length === 0 ? (
        <EmptyState iconName={emptyIconName} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <View style={styles.discussionList}>
          {discussions.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => onItemPress(d)}
              style={({ pressed }) => [styles.discussionCard, pressed && { opacity: 0.92 }]}
              accessibilityLabel={`${d.title}, ${d.postCount ?? 0}`}
              accessibilityHint={t('groups.opensDiscussion')}
            >
              <View style={styles.discussionAuthorRow}>
                <Avatar
                  source={d.authorAvatarUrl ? { uri: d.authorAvatarUrl } : null}
                  fallbackText={d.authorDisplayName}
                  size="sm"
                  accessibilityLabel={
                    d.authorDisplayName
                      ? `${d.authorDisplayName} ${t('groups.profilePicture')}`
                      : t('groups.originalPoster')
                  }
                />
                <Text style={styles.discussionMeta} numberOfLines={1}>
                  {d.authorDisplayName ?? t('common.loading')}{' '}
                  <Text style={styles.discussionMetaDot}>{'·'}</Text>{' '}
                  {formatRelativeTime(d.createdAt)}
                </Text>
              </View>
              <Text style={styles.discussionTitle} numberOfLines={2}>
                {d.title}
              </Text>
              <View style={styles.discussionFooter}>
                <View style={styles.discussionStat}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={styles.discussionStatText}>{d.postCount ?? 0}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  addTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  addTopicText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  discussionList: {
    gap: spacing.md,
  },
  discussionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...editorialShadow,
  },
  discussionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  discussionMeta: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  discussionMetaDot: {
    color: colors.outlineVariant,
  },
  discussionTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  discussionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discussionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  discussionStatText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
