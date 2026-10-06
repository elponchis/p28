import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import type { Discussion } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { editorialShadow } from '@/components/patterns/editorialShadow';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GroupDiscussionCardProps {
  discussion: Discussion;
  onPress: () => void;
}

/**
 * One discussion, shared by the group screen's preview and the full list. Styles moved from the
 * group screen rather than rewritten, so the two stay identical.
 */
export function GroupDiscussionCard({ discussion: d, onPress }: GroupDiscussionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      accessibilityLabel={`${d.title}, ${d.postCount ?? 0}`}
      accessibilityHint={t('groups.opensDiscussion')}
    >
      <View style={styles.authorRow}>
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
        <Text style={styles.meta} numberOfLines={1}>
          {d.authorDisplayName ?? t('common.loading')} <Text style={styles.metaDot}>{'·'}</Text>{' '}
          {formatRelativeTime(d.createdAt)}
        </Text>
      </View>
      <Text style={styles.body} numberOfLines={2}>
        {d.body}
      </Text>
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
          <Text style={styles.statText}>{d.postCount ?? 0}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...editorialShadow,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  meta: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  metaDot: {
    color: colors.outlineVariant,
  },
  body: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
