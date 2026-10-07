import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useGridColumns } from '@/hooks/useGridColumns';
import { useGroupDevotionsQuery, useGroupQuery } from '@/hooks/useApiQueries';
import type { GroupDevotionSummary } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, minTouchTarget, radius, spacing, typography } from '@/theme/tokens';

/**
 * Every passage this group has read, newest first.
 *
 * The card on the group screen shows one day, so when a leader sets the next day's passage the
 * one before it goes out of reach — though nothing was deleted, and the answers shared that day
 * are still attached to it. This is the way back to them.
 */
export default function DevotionHistoryScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const columns = useGridColumns(360);

  const { data: group } = useGroupQuery(groupId);
  const { data: devotions = [], isLoading } = useGroupDevotionsQuery(groupId, {
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!groupId) router.back();
  }, [groupId, router]);

  const renderItem = useCallback(
    ({ item }: { item: GroupDevotionSummary }) => (
      <View style={columns > 1 ? styles.cell : undefined}>
        <Pressable
          onPress={() => router.push(`/group/devotion/${item.id}`)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={`${item.devotionDate} ${item.reference}`}
          accessibilityHint={t('devotion.openPastDevotionHint')}
        >
          <Text style={styles.date}>{item.devotionDate}</Text>
          <Text style={styles.reference} numberOfLines={2}>
            {item.reference}
          </Text>
          <View style={styles.footer}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
            <Text style={styles.count}>{item.shareCount}</Text>
          </View>
        </Pressable>
      </View>
    ),
    [columns, router]
  );

  const renderSeparator = useCallback(() => <View style={styles.gap} accessible={false} />, []);

  if (!groupId) return null;

  return (
    <View style={styles.container}>
      {group ? <Text style={styles.screenTitle}>{group.name}</Text> : null}
      <Text style={styles.sectionTitle}>{t('devotion.pastDevotions')}</Text>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          data={devotions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('devotion.noPastDevotions')}</Text>}
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
  cell: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  gap: {
    height: spacing.md,
  },
  card: {
    flexGrow: 1,
    minHeight: minTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  date: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  reference: {
    fontFamily: fontFamily.serifBold,
    fontSize: 19,
    color: colors.onSurface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  count: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
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
