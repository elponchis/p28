import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/patterns/EmptyState';
import { GroupMemberRowList } from '@/components/patterns/GroupMemberRowList';
import { useAuth } from '@/hooks/useAuth';
import { useFriendIdsQuery, useGroupMembersQuery, useGroupQuery } from '@/hooks/useApiQueries';
// useGroupMembersQuery → getGroupMembers (RPC group_members_for_display; lib/groupCommunityDisplay.ts)
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

export default function GroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const { isLoading: groupLoading } = useGroupQuery(groupId);
  const { data: members = [], isLoading: membersLoading } = useGroupMembersQuery(groupId);
  const { data: friendIds = [] } = useFriendIdsQuery(currentUserId || undefined);
  const friendSet = useMemo(() => new Set(friendIds), [friendIds]);

  const handleMemberPress = useCallback(
    (memberId: string) => {
      router.push(`/profile/${memberId}`);
    },
    [router]
  );

  if (!groupId) {
    router.back();
    return null;
  }

  if (groupLoading || membersLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>
        {members.length} {members.length === 1 ? t('groups.member') : t('groups.members')}
      </Text>
      {members.length === 0 ? (
        <EmptyState
          iconName="people-outline"
          title={t('groups.noMembers')}
          subtitle={t('groups.noMembersSubtitle')}
        />
      ) : (
        <GroupMemberRowList
          items={members}
          currentUserId={currentUserId}
          friendUserIds={friendSet}
          onMemberPress={handleMemberPress}
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
  header: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
});
