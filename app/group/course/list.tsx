import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { GroupCourseCard } from '@/components/patterns/GroupCourseCard';
import { useCoursesByGroupQuery, useGroupQuery } from '@/hooks/useApiQueries';
import type { Course } from '@/lib/api';
import { useGridColumns } from '@/hooks/useGridColumns';
import { t } from '@/lib/i18n';
import { colors, fontFamily, spacing, typography } from '@/theme/tokens';

/**
 * Every course in the group. The group screen shows the first few; this is the rest of them.
 *
 * Read-only: editing and deleting stay on the group screen, where the person who may do it is
 * already working. Offering the same destructive pair in two places is two places to get wrong.
 */
export default function CourseListScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  // Wide windows fit more than one card on a row (KAN-50).
  const columns = useGridColumns(360);

  const { data: group } = useGroupQuery(groupId);
  const { data: courses = [], isLoading } = useCoursesByGroupQuery(groupId, {
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!groupId) router.back();
  }, [groupId, router]);

  const renderItem = useCallback(
    ({ item }: { item: Course }) => (
      <View style={columns > 1 ? styles.cell : undefined}>
        <GroupCourseCard
          course={item}
          onPress={() => router.push(`/group/${groupId}/course/${item.id}`)}
        />
      </View>
    ),
    [columns, groupId, router]
  );

  const renderSeparator = useCallback(() => <View style={styles.gap} accessible={false} />, []);

  if (!groupId) return null;

  return (
    <View style={styles.container}>
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <Text style={styles.sectionTitle}>{t('courses.sectionTitle')}</Text>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('courses.noCourses')}</Text>}
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
  row: {
    gap: spacing.md,
  },
  /** Each cell shares the row evenly; without it the cards keep their natural width. */
  cell: {
    flex: 1,
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
