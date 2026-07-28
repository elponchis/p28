import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatGroupEventCalendarBlock } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

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
}: LatestAnnouncementRowProps) {
  const { month, day } = formatGroupEventCalendarBlock(createdAt);
  const link = meetingLink?.trim();
  const hasMeetingFooter = showMeetingLink && !!link;
  const openMeeting = () => {
    if (link) void WebBrowser.openBrowserAsync(link);
  };

  return (
    <View style={[styles.wrap, hasMeetingFooter && styles.wrapUnified]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          !hasMeetingFooter && styles.rowStandalone,
          hasMeetingFooter && styles.rowWithFooter,
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
          <Ionicons name="videocam-outline" size={18} color={colors.primary} />
          <Text style={styles.meetingLinkText}>{t('groupEvents.joinMeeting')}</Text>
          <Ionicons name="open-outline" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  wrapUnified: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderCurve: 'continuous',
  },
  rowStandalone: {
    borderRadius: radius.lg,
  },
  rowWithFooter: {
    borderRadius: 0,
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
  },
  month: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  day: {
    fontFamily: fontFamily.serifBold,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 28,
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
    fontFamily: fontFamily.sansBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  preview: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  meetingLinkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.recurringMeetingCardDivider,
    borderCurve: 'continuous',
  },
  meetingLinkText: {
    ...typography.bodyMd,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
    flex: 1,
  },
});
