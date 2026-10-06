import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Assignment } from '@/lib/api';
import { formatGroupEventDateTime, isGroupEventPast } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { editorialShadow } from '@/components/patterns/editorialShadow';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GroupAssignmentCardProps {
  assignment: Assignment;
  onPress: () => void;
}

/**
 * One assignment, shared by the group screen's preview and the full list. Styles moved from the
 * group screen rather than rewritten, so the two stay identical.
 */
export function GroupAssignmentCard({ assignment, onPress }: GroupAssignmentCardProps) {
  const isOverdue = !!assignment.dueDate && isGroupEventPast(assignment.dueDate);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      accessibilityLabel={assignment.title}
      accessibilityHint={t('assignments.openAssignmentHint')}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {assignment.title}
        </Text>
        {isOverdue ? (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueBadgeText}>{t('assignments.overdueBadge')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.due}>
        {assignment.dueDate
          ? `${t('assignments.dueLabel')} ${formatGroupEventDateTime(assignment.dueDate)}`
          : t('assignments.noDueDate')}
      </Text>
      {assignment.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {assignment.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
    ...editorialShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
  },
  overdueBadge: {
    backgroundColor: colors.amberSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  overdueBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textPrimary,
  },
  due: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xxs,
  },
  description: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
