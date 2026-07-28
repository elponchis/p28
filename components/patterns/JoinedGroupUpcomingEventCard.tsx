import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { EventRsvpResponse } from '@/lib/api';
import { formatGroupEventDateTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import type { JoinedGroupUpcomingEventRow } from '@/lib/upcomingJoinedGroupEvents';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface JoinedGroupUpcomingEventCardProps {
  event: JoinedGroupUpcomingEventRow;
  /** Fixed width for horizontal carousels (compact row layout). */
  width: number;
  /** When set, shows a status icon (only for RSVP-required events with a response). */
  rsvpResponse?: EventRsvpResponse | null;
}

function RsvpStatusIcon({ response }: { response: EventRsvpResponse }) {
  switch (response) {
    case 'going':
      return (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={colors.success}
          accessibilityLabel={t('groupEvents.going')}
        />
      );
    case 'maybe':
      return (
        <Ionicons
          name="help-circle"
          size={18}
          color={colors.secondary}
          accessibilityLabel={t('groupEvents.maybe')}
        />
      );
    case 'not_going':
      return (
        <Ionicons
          name="close-circle"
          size={18}
          color={colors.onSurfaceVariant}
          accessibilityLabel={t('groupEvents.notGoing')}
        />
      );
    default:
      return null;
  }
}

/**
 * Compact row card matching {@link GroupCard} `compact` styling: thumbnail, title,
 * secondary text, meta row. Navigates to the group event detail screen.
 */
export function JoinedGroupUpcomingEventCard({
  event,
  width,
  rsvpResponse = null,
}: JoinedGroupUpcomingEventCardProps) {
  const { push } = useRouter();
  const when = formatGroupEventDateTime(event.startsAt);
  const rsvpA11y =
    rsvpResponse === 'going'
      ? t('groupEvents.going')
      : rsvpResponse === 'maybe'
        ? t('groupEvents.maybe')
        : rsvpResponse === 'not_going'
          ? t('groupEvents.notGoing')
          : '';

  return (
    <Pressable
      onPress={() => push(`/group/event/${event.id}`)}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      accessibilityLabel={`${event.title}, ${event.groupName}, ${when}${rsvpA11y ? `, ${rsvpA11y}` : ''}`}
      accessibilityHint={t('home.opensEventDetail')}
    >
      <View style={[styles.card, { width }]}>
        {event.groupBannerImageUrl ? (
          <Image
            source={{ uri: event.groupBannerImageUrl }}
            style={styles.image}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="calendar-outline" size={24} color={colors.ink300} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {when}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.groupName}
              </Text>
            </View>
          </View>
        </View>

        {rsvpResponse ? (
          <View style={styles.rsvpIconWrap} pointerEvents="none">
            <RsvpStatusIcon response={rsvpResponse} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.sm,
    minWidth: 0,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  rsvpIconWrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
