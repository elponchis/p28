import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { TagChip } from '@/components/patterns/TagChip';
import { useCardHover } from '@/hooks/useCardHover';
import { formatGroupEventCalendarBlock } from '@/lib/dates';
import { t } from '@/lib/i18n';
import {
  cardBase,
  cardHover,
  colors,
  fontFamily,
  minTouchTarget,
  radius,
  spacing,
} from '@/theme/tokens';

export interface LatestAnnouncementRowProps {
  title: string;
  body: string;
  createdAt: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Shown for admins when status is not published (e.g. cancelled, draft). */
  statusBadgeLabel?: string;
  meetingLink?: string;
  /** When true and `meetingLink` is set, shows join meeting as a footer on the same row/card. */
  showMeetingLink?: boolean;
  /** Group or channel the item belongs to, shown as a small chip at the right of the row. */
  tagLabel?: string;
  /**
   * One of several rows sharing a single card. The row drops its own edge and is separated from
   * the one above it by a hairline instead, so a list reads as one card rather than a stack.
   */
  grouped?: boolean;
  /** Set on every grouped row but the first — the rule that divides it from the row above. */
  showDivider?: boolean;
}

export function LatestAnnouncementRow({
  title,
  body,
  createdAt,
  onPress,
  accessibilityLabel,
  accessibilityHint = t('announcements.openDetailHint'),
  statusBadgeLabel,
  meetingLink,
  showMeetingLink = false,
  tagLabel,
  grouped = false,
  showDivider = false,
}: LatestAnnouncementRowProps) {
  const { hovered, hoverProps } = useCardHover();
  const { month, day } = formatGroupEventCalendarBlock(createdAt);
  const link = meetingLink?.trim();
  const hasMeetingFooter = showMeetingLink && !!link;
  const openMeeting = () => {
    if (link) void WebBrowser.openBrowserAsync(link);
  };

  return (
    <View
      style={[
        styles.wrap,
        grouped && styles.wrapGrouped,
        showDivider && styles.wrapDivided,
        !grouped && hovered && styles.wrapHovered,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.surfaceContainerLow },
        ]}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        {...hoverProps}
      >
        <View style={styles.body}>
          {/* Date, group and the chevron share one small line, so the heading below them gets
              the card's whole width. Side by side they squeezed the title to a few characters
              on a phone. */}
          <View style={styles.metaRow}>
            <Text style={styles.date}>
              {month} {day}
            </Text>
            {tagLabel ? <TagChip label={tagLabel} /> : null}
            {statusBadgeLabel ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusBadgeLabel}</Text>
              </View>
            ) : null}
            <View style={styles.metaSpacer} />
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {body}
          </Text>
        </View>
      </Pressable>
      {hasMeetingFooter ? (
        <Pressable
          onPress={openMeeting}
          style={({ pressed }) => [styles.meetingLinkFooter, pressed && { opacity: 0.92 }]}
          accessibilityLabel={t('groupEvents.joinMeeting')}
          accessibilityHint={t('groupEvents.joinMeetingHint')}
          accessibilityRole="link"
        >
          <Ionicons name="videocam-outline" size={18} color={colors.onSecondaryContainer} />
          <Text style={styles.meetingLinkText}>{t('groupEvents.joinMeeting')}</Text>
          <Ionicons name="open-outline" size={16} color={colors.onSecondaryContainer} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A bordered card, whether or not the meeting footer is attached below the row.
  wrap: {
    ...cardBase,
    marginBottom: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  wrapHovered: cardHover,
  /** Inside a shared card the row owns no edge of its own — the card around it does. */
  wrapGrouped: {
    borderWidth: 0,
    borderRadius: 0,
  },
  /** The hairline that divides one grouped row from the one above it. */
  wrapDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  row: {
    cursor: 'pointer',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderCurve: 'continuous',
  },
  /** Date, group chip and chevron on one line above the heading. */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaSpacer: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  preview: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
    lineHeight: 20,
  },
  statusBadge: {
    flexShrink: 0,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    marginTop: spacing.xxs,
  },
  statusBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    color: colors.onSecondaryContainer,
  },
  /**
   * A button sitting inside the card, not the card's bottom edge. Full-bleed with a divider it
   * read as another band of the card; inset, rounded and self-sized it reads as something to
   * press.
   */
  meetingLinkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: minTouchTarget,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.button,
    cursor: 'pointer',
    borderCurve: 'continuous',
  },
  meetingLinkText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSecondaryContainer,
  },
});
