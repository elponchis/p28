import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Avatar } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

/** Column width tuned for avatar + 2-line name + role (Stitch: Ministry leaders strip). */
const LEADER_COLUMN_WIDTH = 100;

export interface GroupLeaderRowsItem {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface GroupLeaderRowsProps {
  items: GroupLeaderRowsItem[];
  currentUserId: string;
  /** Secondary line under the name (e.g. role). */
  leaderSubtitle: string;
  /** Shown under the viewer’s name when they are a leader. */
  yourselfSubtitle: string;
  onLeaderPress: (userId: string) => void;
  /**
   * When true, expands to screen width and uses negative inset so the strip aligns with
   * the Sacred Gatherings / recurring carousel (same bleed as `recurringCarouselBleed`).
   */
  edgeToEdge?: boolean;
  /** Accessibility label for the horizontal leader strip. */
  listAccessibilityLabel?: string;
}

export function GroupLeaderRows({
  items,
  currentUserId,
  leaderSubtitle,
  yourselfSubtitle,
  onLeaderPress,
  edgeToEdge = false,
  listAccessibilityLabel,
}: GroupLeaderRowsProps) {
  const { width: windowWidth } = useWindowDimensions();
  const stripA11y = listAccessibilityLabel ?? t('groups.leaders');

  const content = (
    <>
      {items.map((m) => {
        const isSelf = m.userId === currentUserId;
        const displayLabel = (m.displayName && m.displayName.trim()) || m.userId;
        const nameText = m.displayName?.trim() ? m.displayName.trim() : t('groups.groupMember');
        const subtitle = isSelf ? yourselfSubtitle : leaderSubtitle;
        const column = (
          <View style={[styles.column, { width: LEADER_COLUMN_WIDTH }]}>
            <Avatar
              source={m.avatarUrl ? { uri: m.avatarUrl } : null}
              fallbackText={displayLabel}
              size="lg"
              accessibilityLabel={
                m.displayName
                  ? `${m.displayName} ${t('groups.profilePicture')}`
                  : t('groups.groupMember')
              }
            />
            <Text style={[styles.name, isSelf && styles.nameMuted]} numberOfLines={2}>
              {nameText}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        );
        if (isSelf) {
          return (
            <View
              key={m.userId}
              style={styles.columnOuter}
              accessibilityLabel={`${nameText}, ${yourselfSubtitle}`}
            >
              {column}
            </View>
          );
        }
        return (
          <Pressable
            key={m.userId}
            onPress={() => onLeaderPress(m.userId)}
            style={({ pressed }) => [styles.columnOuter, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={nameText}
            accessibilityHint={`${subtitle}. ${t('groups.opensProfile')}`}
          >
            {column}
          </Pressable>
        );
      })}
    </>
  );

  if (edgeToEdge) {
    return (
      <View style={[styles.bleedWrap, { width: windowWidth }]}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          style={{ width: windowWidth }}
          showsHorizontalScrollIndicator={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.hScrollContentBleed}
          accessibilityLabel={stripA11y}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={Platform.OS === 'android'}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.hScrollContentInset}
      accessibilityLabel={stripA11y}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleedWrap: {
    marginLeft: -spacing.lg,
  },
  hScrollContentBleed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  hScrollContentInset: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  columnOuter: {
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
  name: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    color: colors.onSurface,
    marginTop: spacing.xxs,
    width: '100%',
    textAlign: 'center',
  },
  nameMuted: {
    color: colors.onSurfaceVariant,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    width: '100%',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
