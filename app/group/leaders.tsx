import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GroupLeaderRows } from '@/components/patterns/GroupLeaderRows';
import { useAuth } from '@/hooks/useAuth';
import { useGroupAdminsQuery, useGroupQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

export default function GroupLeadersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const { data: group, isLoading: groupLoading } = useGroupQuery(groupId);
  const { data: admins = [], isLoading: adminsLoading } = useGroupAdminsQuery(groupId);

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
      <Text style={styles.pageTitle} accessibilityRole="header">
        {sectionTitle}
      </Text>
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
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '400',
    color: colors.primary,
    letterSpacing: -0.1,
    marginBottom: spacing.md,
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
