import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EmptyState } from '@/components/patterns/EmptyState';
import { GridFillerTile } from '@/components/patterns/GridFillerTile';
import { GroupCard } from '@/components/patterns/GroupCard';

import { useAuth } from '@/hooks/useAuth';
import { useGridColumns } from '@/hooks/useGridColumns';
import { useGroupsQuery, useGroupsForUserQuery, useIsAdminQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/errors';
import { GROUP_TYPES, groupTypeLabel } from '@/lib/groupTypes';
import { t } from '@/lib/i18n';
import type { GroupType } from '@/lib/api';
import {
  colors,
  fontFamily,
  minTouchTarget,
  radius,
  spacing,
  typography,
  tabScreenContent,
} from '@/theme/tokens';

type FilterType = 'all' | 'joined' | GroupType;

/**
 * The narrowest a group card may be before the grid drops a column. Picked from the standard
 * card: its 160px cover and two lines of name want about this much to stay legible.
 */
const GROUP_CARD_MIN_WIDTH = 320;

/** The chips, in order. Every kind of group is offered, so a new kind is never unfilterable. */
const FILTER_OPTIONS: readonly FilterType[] = ['all', 'joined', ...GROUP_TYPES] as const;

function filterLabel(filter: FilterType): string {
  if (filter === 'all') return t('groups.filterAll');
  if (filter === 'joined') return t('groups.filterJoined');
  return groupTypeLabel(filter);
}

export default function GroupsScreen() {
  const { session } = useAuth();
  const { push } = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const p = params?.filter as FilterType | undefined;
    if (p && FILTER_OPTIONS.includes(p)) {
      setFilter(p);
    }
  }, [params?.filter]);

  const userId = session?.user?.id;
  const typeFilter = filter === 'all' || filter === 'joined' ? undefined : filter;
  const {
    data: groups = [],
    isLoading,
    isError,
    error,
    refetch: refetchGroups,
  } = useGroupsQuery({
    type: typeFilter,
    search,
    enabled: !!userId,
  });
  const { data: memberGroups = [], refetch: refetchMemberGroups } = useGroupsForUserQuery(userId);
  const columns = useGridColumns(GROUP_CARD_MIN_WIDTH);
  // Admin comes from app_roles and nowhere else. An address was hardcoded here beside it, which
  // the database never honoured -- it only showed that account a Create group button whose insert
  // RLS then refused. A role the server disagrees with is a button that fails.
  const { data: isAdminFromApi } = useIsAdminQuery(userId);
  const isAdmin = isAdminFromApi === true;

  const memberGroupIds = new Set(memberGroups.map((g) => g.id));

  useFocusEffect(
    useCallback(() => {
      const p = params?.filter as FilterType | undefined;
      if (p && FILTER_OPTIONS.includes(p)) {
        setFilter(p);
      } else {
        setFilter('all');
      }
      refetchGroups();
      refetchMemberGroups();
    }, [params?.filter, refetchGroups, refetchMemberGroups])
  );

  const displayed = filter === 'joined' ? groups.filter((g) => memberGroupIds.has(g.id)) : groups;
  // How many cells are left over on the last row. Zero when the row comes out even.
  const fillerCount =
    columns > 1 && displayed.length > 0 ? (columns - (displayed.length % columns)) % columns : 0;

  const filterOptions = FILTER_OPTIONS;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeIn.duration(300)} style={[styles.content, tabScreenContent]}>
        {/* Hero Header — one line, no strapline. The page's job is finding a group, so the
            search field and the admin actions come next rather than a paragraph. */}
        <View style={styles.header}>
          <Text style={styles.heroTitle}>{t('groups.heroTitle')}</Text>
        </View>

        {/* Search, with manage and create sharing its line instead of sitting above it. */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('groups.searchGroupsPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              accessibilityLabel={t('groups.searchGroupsPlaceholder')}
              accessibilityHint={t('groups.searchGroupsHint')}
            />
          </View>
          {isAdmin ? (
            <>
              <Pressable
                onPress={() => push('/group/manage')}
                style={({ pressed }) => [styles.manageButton, pressed && { opacity: 0.8 }]}
                accessibilityLabel={t('groups.manageMyGroups')}
                accessibilityHint={t('groups.manageMyGroupsHint')}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => push('/group/create')}
                style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.8 }]}
                accessibilityLabel={t('groups.createGroup')}
                accessibilityHint={t('groups.createGroupHint')}
              >
                <Ionicons name="add" size={18} color={colors.onPrimary} />
                <Text style={styles.createButtonText}>{t('groups.createGroup')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* Filter Chips — one line that scrolls. Wrapping pushed the group list down by a whole
            row on a phone (KAN-43). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {filterOptions.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityLabel={filterLabel(f)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filterLabel(f)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Error */}
        {isError && error && 'message' in error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{getUserFacingError(error)}</Text>
          </View>
        ) : null}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : displayed.length === 0 ? (
          <EmptyState
            iconName="people-outline"
            title={
              filter === 'joined'
                ? t('groups.noJoinedGroups')
                : search || filter !== 'all'
                  ? t('groups.noGroupsFound')
                  : t('groups.noGroups')
            }
            subtitle={
              filter === 'joined'
                ? t('groups.noJoinedGroupsSubtitle')
                : search || filter !== 'all'
                  ? t('groups.tryDifferentSearch')
                  : t('groups.groupsWillAppear')
            }
          />
        ) : (
          <View style={columns > 1 ? styles.grid : styles.list}>
            {displayed.map((group, index) => (
              <View key={group.id} style={columns > 1 ? styles.gridItem : undefined}>
                <GroupCard
                  group={group}
                  isMember={memberGroupIds.has(group.id)}
                  /* The tall hero belongs to a single column. Once the page can hold two cards
                     side by side, one group taking the whole width is the thing the grid is
                     meant to fix (KAN-50). */
                  variant={columns === 1 && index === 0 ? 'featured' : 'standard'}
                />
              </View>
            ))}
            {/* The last row's empty cells. They keep a lone card card-sized instead of letting
                it stretch, and for whoever may add a group they are the invitation to. */}
            {fillerCount > 0
              ? Array.from({ length: fillerCount }, (_, i) => (
                  <View key={`filler-${i}`} style={styles.gridItem}>
                    <GridFillerTile
                      label={isAdmin && i === 0 ? t('groups.createGroup') : undefined}
                      hint={isAdmin && i === 0 ? t('groups.createGroupHint') : undefined}
                      onPress={isAdmin && i === 0 ? () => push('/group/create') : undefined}
                    />
                  </View>
                ))
              : null}
          </View>
        )}
      </Animated.View>
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
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
  },

  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
    letterSpacing: -0.3,
    color: colors.onSurface,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    height: minTouchTarget,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  createButtonText: {
    ...typography.buttonLabel,
    color: colors.onPrimary,
  },
  /** Icon only — secondary to "create", and its label was what made this row heavy. */
  manageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: minTouchTarget,
    height: minTouchTarget,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  /** Search takes the room; the two admin buttons sit at its right. */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  searchWrapper: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.bodyMd.fontSize,
    fontFamily: fontFamily.sans,
    color: colors.onSurface,
    paddingVertical: spacing.md,
    minHeight: 48,
  },

  filterScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: colors.onPrimary,
  },

  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },

  loading: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },

  list: {
    gap: spacing.md,
  },
  /** Cards flow and wrap; each one grows to share the row evenly. */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: GROUP_CARD_MIN_WIDTH,
    minWidth: GROUP_CARD_MIN_WIDTH,
    maxWidth: '100%',
  },
});
