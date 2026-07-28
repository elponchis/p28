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
import { GroupCard } from '@/components/patterns/GroupCard';
import { ReflectionPlate } from '@/components/patterns/ReflectionPlate';

import { useAuth } from '@/hooks/useAuth';
import { useGroupsQuery, useGroupsForUserQuery, useIsAdminQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import type { GroupType } from '@/lib/api';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

type FilterType = 'all' | 'joined' | GroupType;

export default function GroupsScreen() {
  const { session } = useAuth();
  const { push } = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const p = params?.filter as FilterType | undefined;
    if (p && ['all', 'joined', 'forum', 'ministry'].includes(p)) {
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
  const { data: isAdminFromApi } = useIsAdminQuery(userId);
  const email = session?.user?.email?.toLowerCase();
  const isAdmin = isAdminFromApi === true || email === 'billyhdev@gmail.com';

  const memberGroupIds = new Set(memberGroups.map((g) => g.id));

  useFocusEffect(
    useCallback(() => {
      const p = params?.filter as FilterType | undefined;
      if (p && ['all', 'joined', 'forum', 'ministry'].includes(p)) {
        setFilter(p);
      } else {
        setFilter('all');
      }
      refetchGroups();
      refetchMemberGroups();
    }, [params?.filter, refetchGroups, refetchMemberGroups])
  );

  const displayed = filter === 'joined' ? groups.filter((g) => memberGroupIds.has(g.id)) : groups;

  const filterOptions = ['all', 'joined', 'forum', 'ministry'] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        {/* Hero Header */}
        <View style={styles.header}>
          <Text style={styles.heroTitle}>
            {t('groups.heroTitle')}
            {'\n'}
            <Text style={styles.heroTitleAccent}>{t('groups.heroTitleAccent')}</Text>
          </Text>
          <Text style={styles.heroSubtitle}>{t('groups.heroSubtitle')}</Text>

          {isAdmin ? (
            <View style={styles.adminActions}>
              <Pressable
                onPress={() => push('/group/manage')}
                style={({ pressed }) => [styles.manageButton, pressed && { opacity: 0.8 }]}
                accessibilityLabel={t('groups.manageMyGroups')}
                accessibilityHint={t('groups.manageMyGroupsHint')}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
                <Text style={styles.manageButtonText}>{t('groups.manageMyGroups')}</Text>
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
            </View>
          ) : null}
        </View>

        {/* Search */}
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

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {filterOptions.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityLabel={
                  f === 'all'
                    ? t('groups.filterAll')
                    : f === 'joined'
                      ? t('groups.filterJoined')
                      : f === 'forum'
                        ? t('groups.filterForums')
                        : t('groups.filterMinistries')
                }
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f === 'all'
                    ? t('groups.filterAll')
                    : f === 'joined'
                      ? t('groups.filterJoined')
                      : f === 'forum'
                        ? t('groups.filterForums')
                        : t('groups.filterMinistries')}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
          <View style={styles.list}>
            {displayed.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                isMember={memberGroupIds.has(group.id)}
                variant={index === 0 ? 'featured' : 'standard'}
              />
            ))}
          </View>
        )}

        {/* Reflection Plate */}
        {!isLoading && displayed.length > 0 ? (
          <View style={styles.reflectionSection}>
            <ReflectionPlate
              quote={t('groups.reflectionQuote')}
              attribution={t('groups.reflectionAttribution')}
              variant="dark"
            />
          </View>
        ) : null}
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
  heroTitleAccent: {
    fontFamily: fontFamily.serifItalic,
    color: colors.primary,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  adminActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  createButtonText: {
    ...typography.buttonLabel,
    color: colors.onPrimary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  manageButtonText: {
    ...typography.buttonLabel,
    color: colors.primary,
  },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
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

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
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

  reflectionSection: {
    marginTop: spacing.sectionGap,
  },
});
