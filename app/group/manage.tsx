import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { EmptyState } from '@/components/patterns/EmptyState';
import { GroupCard } from '@/components/patterns/GroupCard';

import { useAuth } from '@/hooks/useAuth';
import { useGroupsWhereUserIsAdminQuery, useGroupsForUserQuery } from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { colors, spacing } from '@/theme/tokens';

export default function ManageGroupsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: adminGroups = [], isLoading, refetch } = useGroupsWhereUserIsAdminQuery(userId);

  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const memberGroupIds = new Set(memberGroups.map((g) => g.id));

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : adminGroups.length === 0 ? (
        <EmptyState
          iconName="shield-outline"
          title={t('groups.noAdminGroups')}
          subtitle={t('groups.noAdminGroupsSubtitle')}
        />
      ) : (
        <View style={styles.list}>
          {adminGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isMember={memberGroupIds.has(group.id)}
              variant="compact"
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loading: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
});
