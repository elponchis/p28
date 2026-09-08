import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useClearInAppNotificationsMutation,
  useInAppNotificationsQuery,
} from '@/hooks/useApiQueries';
import { confirm, notify } from '@/lib/dialogs';
import { describeError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

/**
 * Empties the notification list, from the header of the screen that shows it.
 *
 * Dismissing rows one at a time is right for a list of three and tedious for a list of thirty,
 * which is what a week of a busy group looks like. Renders nothing when there is nothing to
 * clear: a button that would do nothing is worse than no button.
 */
export function ClearNotificationsButton({ userId }: { userId: string | undefined }) {
  const { data: items = [] } = useInAppNotificationsQuery(userId);
  const clear = useClearInAppNotificationsMutation();

  const handlePress = useCallback(async () => {
    if (!userId) return;
    // Deleting everything at once deserves a question first; nothing brings them back.
    const confirmed = await confirm({
      title: t('notifications.clearAll'),
      message: t('notifications.clearAllConfirm', { count: items.length }),
      confirmLabel: t('notifications.clearAll'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    clear.mutate(
      { userId },
      {
        onError: (e) => void notify({ title: t('common.error'), message: describeError(e) }),
      }
    );
  }, [clear, items.length, userId]);

  if (!userId || items.length === 0) return null;

  return (
    <Pressable
      onPress={() => void handlePress()}
      disabled={clear.isPending}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.clearAll')}
      accessibilityHint={t('notifications.clearAllHint')}
      hitSlop={8}
    >
      <Ionicons name="trash-outline" size={16} color={colors.onSurfaceVariant} />
      <Text style={styles.label}>{t('notifications.clearAll')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.sansSemiBold,
  },
});
