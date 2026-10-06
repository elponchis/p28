import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { IconButton } from '@/components/primitives';
import type { Course } from '@/lib/api';
import { t } from '@/lib/i18n';
import { editorialShadow } from '@/components/patterns/editorialShadow';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface GroupCourseCardProps {
  course: Course;
  onPress: () => void;
  /** Both handlers together turn on the edit/delete row; a reader gets neither. */
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * One course, as the group screen and the full course list both draw it.
 *
 * Extracted so the two cannot drift: the list exists to show the rest of what the group screen
 * previews, and a card that looked different there would read as a different thing. The styles
 * are the group screen's own, moved rather than rewritten.
 */
export function GroupCourseCard({ course, onPress, onEdit, onDelete }: GroupCourseCardProps) {
  const canManage = !!onEdit && !!onDelete;
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.92 }]}
        accessibilityLabel={course.title}
        accessibilityHint={t('courses.openCourseHint')}
        accessibilityRole="button"
      >
        {course.coverImageUrl ? (
          <Image
            source={{ uri: course.coverImageUrl }}
            style={styles.cover}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Ionicons name="school-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {course.title}
          </Text>
          {course.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {course.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
      </Pressable>
      {canManage ? (
        <View style={styles.actions}>
          <IconButton
            name="pencil-outline"
            size={18}
            onPress={onEdit}
            accessibilityLabel={t('courses.editCourse')}
            accessibilityHint={t('courses.editCourseHint')}
          />
          <IconButton
            name="trash-outline"
            size={18}
            color={colors.error}
            onPress={onDelete}
            accessibilityLabel={t('courses.deleteCourse')}
            accessibilityHint={t('courses.deleteCourseConfirm')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Fills the grid cell it is placed in; on a phone the cell is the full width anyway.
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...editorialShadow,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: 0,
  },
  description: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
