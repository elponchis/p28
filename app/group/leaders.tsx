import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GroupAdminPickerSheet } from '@/components/patterns/GroupAdminPickerSheet';
import { GroupLeaderRows } from '@/components/patterns/GroupLeaderRows';
import { useAuth } from '@/hooks/useAuth';
import { useGroupAdminsQuery, useGroupQuery, useIsSuperAdminQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, fontFamily, minTouchTarget, radius, spacing, typography } from '@/theme/tokens';

export default function GroupLeadersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const { data: group, isLoading: groupLoading } = useGroupQuery(groupId);
  const { data: admins = [], isLoading: adminsLoading } = useGroupAdminsQuery(groupId);
  // Appointing is a super admin's job (00111); everyone else just sees who runs the group.
  const { data: isSuperAdmin = false } = useIsSuperAdminQuery(currentUserId, {
    enabled: !!currentUserId,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const listItems = useMemo(
    () =>
      admins.map((a) => ({
        userId: a.userId,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl ?? null,
      })),
    [admins]
  );

  const handleLeaderPress = useCallback(
    (memberId: string) => {
      router.push(`/profile/${memberId}`);
    },
    [router]
  );

  if (!groupId) {
    router.back();
    return null;
  }

  if (groupLoading || adminsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const sectionTitle =
    group?.type === 'ministry' ? t('groups.ministryLeadersTitle') : t('groups.forumLeadersTitle');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle} accessibilityRole="header">
          {sectionTitle}
        </Text>
        {isSuperAdmin && groupId ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.designate, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={t('groups.designateAdmins')}
            accessibilityHint={t('groups.designateAdminsHint')}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.accent} />
            <Text style={styles.designateText}>{t('groups.designateAdmins')}</Text>
          </Pressable>
        ) : null}
      </View>
      {admins.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyPrimary}>{t('groups.noLeadersYet')}</Text>
          <Text style={styles.emptySecondary}>{t('groups.noLeadersListSubtitle')}</Text>
        </View>
      ) : (
        <GroupLeaderRows
          items={listItems}
          currentUserId={currentUserId}
          leaderSubtitle={t('groups.leaderListSubtitle')}
          yourselfSubtitle={t('groups.yourself')}
          onLeaderPress={handleLeaderPress}
          listAccessibilityLabel={sectionTitle}
        />
      )}

      {groupId ? (
        <GroupAdminPickerSheet
          visible={pickerOpen}
          onRequestClose={() => setPickerOpen(false)}
          groupId={groupId}
        />
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
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  /** Outlined and small: appointing is occasional, and the list is what this screen is for. */
  designate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  designateText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.accent,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '400',
    color: colors.primary,
    letterSpacing: -0.1,
    flex: 1,
    minWidth: 0,
  },
  emptyBlock: {
    paddingVertical: spacing.md,
  },
  emptyPrimary: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.onSurface,
  },
  emptySecondary: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
});
