import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/lib/i18n';
import { colors, spacing } from '@/theme/tokens';

/** Shared header-right bell for all (tabs) screens — notifications has no nav icon of its own. */
export function NotificationsBellButton({ badge }: { badge?: number }) {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/notifications')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.notifications')}
      accessibilityHint={t('notifications.openNotificationsHint')}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
