import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useGroupMemberSettingsQuery,
  useGroupQuery,
  useGroupsForUserQuery,
  useUpdateGroupMemberSettingsMutation,
} from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography, minTouchTarget } from '@/theme/tokens';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: group } = useGroupQuery(groupId);
  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const isMember = !!groupId && memberGroups.some((g) => g.id === groupId);

  const { data: memberSettings } = useGroupMemberSettingsQuery(groupId, userId, {
    enabled: !!groupId && !!userId && isMember,
  });
  const updateMemberSettings = useUpdateGroupMemberSettingsMutation();

  const announcementsEnabled = memberSettings?.announcementsEnabled ?? true;
  const recurringMeetingsEnabled = memberSettings?.recurringMeetingsEnabled ?? true;
  const eventsEnabled = memberSettings?.eventsEnabled ?? true;

  const handleToggleAnnouncements = (value: boolean) => {
    if (!userId || !groupId) return;
    updateMemberSettings.mutate({
      groupId,
      userId,
      updates: { announcementsEnabled: value },
    });
  };

  const handleToggleRecurringMeetings = (value: boolean) => {
    if (!userId || !groupId) return;
    updateMemberSettings.mutate({
      groupId,
      userId,
      updates: { recurringMeetingsEnabled: value },
    });
  };

  const handleToggleEvents = (value: boolean) => {
    if (!userId || !groupId) return;
    updateMemberSettings.mutate({
      groupId,
      userId,
      updates: { eventsEnabled: value },
    });
  };

  if (!groupId) {
    router.back();
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {group ? <Text style={styles.groupName}>{group.name}</Text> : null}

      {isMember ? (
        <>
          {group?.type === 'ministry' ? (
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.optionTitle}>{t('groups.recurringMeetingsToggle')}</Text>
                  <Text style={styles.optionSubtitle} numberOfLines={4}>
                    {t('groups.recurringMeetingsToggleHint')}
                  </Text>
                </View>
                <Switch
                  value={recurringMeetingsEnabled}
                  onValueChange={handleToggleRecurringMeetings}
                  disabled={updateMemberSettings.isPending}
                  trackColor={{ false: colors.outlineVariant, true: colors.primaryFixed }}
                  thumbColor={
                    recurringMeetingsEnabled ? colors.primary : colors.surfaceContainerHighest
                  }
                  style={{ transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }] }}
                  accessibilityLabel={t('groups.recurringMeetingsToggle')}
                  accessibilityHint={t('groups.recurringMeetingsToggleHint')}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.optionTitle}>{t('groups.announcementsToggle')}</Text>
                <Text style={styles.optionSubtitle} numberOfLines={3}>
                  {t('groups.announcementsToggleHint')}
                </Text>
              </View>
              <Switch
                value={announcementsEnabled}
                onValueChange={handleToggleAnnouncements}
                disabled={updateMemberSettings.isPending}
                trackColor={{ false: colors.outlineVariant, true: colors.primaryFixed }}
                thumbColor={announcementsEnabled ? colors.primary : colors.surfaceContainerHighest}
                style={{ transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }] }}
                accessibilityLabel={t('groups.announcementsToggle')}
                accessibilityHint={t('groups.announcementsToggleHint')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.optionTitle}>{t('groups.groupEventsToggle')}</Text>
                <Text style={styles.optionSubtitle} numberOfLines={4}>
                  {t('groups.groupEventsToggleHint')}
                </Text>
              </View>
              <Switch
                value={eventsEnabled}
                onValueChange={handleToggleEvents}
                disabled={updateMemberSettings.isPending}
                trackColor={{ false: colors.outlineVariant, true: colors.primaryFixed }}
                thumbColor={eventsEnabled ? colors.primary : colors.surfaceContainerHighest}
                style={{ transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }] }}
                accessibilityLabel={t('groups.groupEventsToggle')}
                accessibilityHint={t('groups.groupEventsToggleHint')}
              />
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  groupName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
    minHeight: minTouchTarget + spacing.md,
  },
  toggleTextCol: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
