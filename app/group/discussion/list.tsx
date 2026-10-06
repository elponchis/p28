import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { GroupDiscussionCard } from '@/components/patterns/GroupDiscussionCard';
import { useDiscussionsQuery, useGroupQuery } from '@/hooks/useApiQueries';
import type { Discussion } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

/** Every discussion in the group. The group screen shows the first few; this is the rest. */
export default function DiscussionListScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();

  const { data: group } = useGroupQuery(groupId);
  const { data: discussions = [], isLoading } = useDiscussionsQuery({
    groupId,
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!groupId) router.back();
  }, [groupId, router]);

  const renderItem = useCallback(
    ({ item }: { item: Discussion }) => (
      <GroupDiscussionCard
        discussion={item}
        onPress={() => router.push(`/group/discussion/${item.id}`)}
      />
    ),
    [router]
  );

  const renderSeparator = useCallback(() => <View style={styles.gap} accessible={false} />, []);

  if (!groupId) return null;

  return (
    <View style={styles.container}>
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <Text style={styles.sectionTitle}>{t('groups.discussions')}</Text>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={discussions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('discussions.noDiscussions')}</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.1,
    marginBottom: spacing.xl,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  gap: {
    height: spacing.md,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
