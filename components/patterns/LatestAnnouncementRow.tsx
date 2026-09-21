import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { TagChip } from '@/components/patterns/TagChip';
import { formatGroupEventCalendarBlock } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

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
}: LatestAnnouncementRowProps) {
  const { month, day } = formatGroupEventCalendarBlock(createdAt);
  const link = meetingLink?.trim();
  const hasMeetingFooter = showMeetingLink && !!link;
  const openMeeting = () => {
    if (link) void WebBrowser.openBrowserAsync(link);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.surfaceContainerLow },
        ]}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
      >
        <View style={styles.dateCol}>
          <Text style={styles.month}>{month}</Text>
          <Text style={styles.day}>{day}</Text>
        </View>
        <View style={styles.dateRule} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {title}
            </Text>
            {statusBadgeLabel ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusBadgeLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.preview} numberOfLines={2}>
            {body}
          </Text>
        </View>
        {tagLabel ? <TagChip label={tagLabel} /> : null}
        <Ionicons
          name="chevron-forward"
          size={22}
          color={colors.onSurfaceVariant}
          style={styles.chevron}
        />
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
    marginBottom: 0,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.screenHorizontal,
    paddingVertical: spacing.screenHorizontal,
    paddingHorizontal: spacing.lg,
    borderCurve: 'continuous',
  },
  dateCol: {
    width: 58,
    alignItems: 'center',
  },
  /** Separates the date from the title; the one element the card gained. */
  dateRule: {
    width: 1,
    height: 42,
    backgroundColor: colors.outlineVariant,
  },
  month: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  day: {
    fontFamily: fontFamily.serifBold,
    fontSize: 27,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 32,
    marginTop: spacing.xxs,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
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
  chevron: {
    opacity: 0.3,
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
  meetingLinkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.amberSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.recurringMeetingCardDivider,
    borderCurve: 'continuous',
  },
  meetingLinkText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSecondaryContainer,
    flex: 1,
  },
});
