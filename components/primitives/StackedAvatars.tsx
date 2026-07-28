import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { avatarSizes } from '@/theme/tokens';

export interface StackedAvatarMember {
  userId: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

export interface StackedAvatarsProps {
  /** List of members to display; will be filtered by excludeUserId and sliced by maxCount. */
  members: StackedAvatarMember[];
  /** Optional user ID to exclude (e.g. current user). */
  excludeUserId?: string | null;
  /** Max number of avatars to show. Default 3. */
  maxCount?: number;
  /** Avatar size. Default 'md'. Use 'sm' for compact contexts like headers. */
  size?: keyof typeof avatarSizes;
  /** When true, renders a ring around each avatar for stacked/grouped context. Default true. */
  ringed?: boolean;
  /** Negative margin (px) for overlap between avatars. Auto-derived from size if not set. */
  overlap?: number;
  /** Optional callback when an avatar is pressed. */
  onMemberPress?: (member: StackedAvatarMember) => void;
  /** Optional accessibility label for the group. */
  accessibilityLabel?: string;
}

const DEFAULT_OVERLAP: Record<keyof typeof avatarSizes, number> = {
  sm: -10,
  md: -12,
  lg: -16,
  xl: -20,
};

export function StackedAvatars({
  members,
  excludeUserId,
  maxCount = 3,
  size = 'md',
  ringed = true,
  overlap,
  onMemberPress,
  accessibilityLabel,
}: StackedAvatarsProps) {
  const filtered = excludeUserId ? members.filter((m) => m.userId !== excludeUserId) : members;
  const displayMembers = filtered.slice(0, maxCount);
  const overlapValue = overlap ?? DEFAULT_OVERLAP[size];

  if (displayMembers.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole={onMemberPress ? 'button' : undefined}
      accessibilityLabel={
        accessibilityLabel ??
        displayMembers.map((m) => m.displayName ?? t('common.loading')).join(', ')
      }
    >
      {displayMembers.map((m, idx) => {
        const wrapStyle = [
          styles.avatarWrap,
          { marginLeft: idx > 0 ? overlapValue : 0, zIndex: displayMembers.length - idx },
        ];
        const fallbackLabel = (m.displayName && m.displayName.trim()) || m.userId;
        const content = (
          <Avatar
            source={m.avatarUrl ? { uri: m.avatarUrl } : null}
            fallbackText={fallbackLabel}
            size={size}
            ringed={ringed}
            accessibilityLabel={
              m.displayName
                ? `${m.displayName} ${t('groups.profilePicture')}`
                : `${t('groups.groupMember')} ${idx + 1}`
            }
          />
        );

        if (onMemberPress) {
          return (
            <Pressable
              key={m.userId}
              onPress={() => onMemberPress(m)}
              style={wrapStyle}
              accessibilityLabel={m.displayName ?? t('common.loading')}
              accessibilityRole="button"
            >
              {content}
            </Pressable>
          );
        }

        return (
          <View key={m.userId} style={wrapStyle}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {},
});
