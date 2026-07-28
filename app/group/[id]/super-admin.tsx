import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddGroupAdminMutation,
  useGroupAdminsAllQuery,
  useIsSuperAdminQuery,
  useRemoveGroupAdminMutation,
  useSearchProfilesQuery,
} from '@/hooks/useApiQueries';
import type { GroupAdmin, Profile } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

const SEARCH_DEBOUNCE_MS = 350;

function displayNameFor(profile: Profile): string {
  return (
    profile.displayName ??
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ??
    t('common.loading')
  );
}

function displayNameForAdmin(admin: GroupAdmin): string {
  const n = admin.displayName?.trim();
  return n && n.length > 0 ? n : t('notifications.unknownUser');
}

export default function SuperAdminAssignGroupAdminScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const {
    data: isSuperAdmin,
    isLoading: isRoleLoading,
    isError: isSuperAdminError,
  } = useIsSuperAdminQuery(userId, {
    enabled: !!userId,
  });
  const { data: admins = [], isLoading: adminsLoading } = useGroupAdminsAllQuery(groupId, {
    enabled: !!groupId,
  });
  const adminIdSet = useMemo(() => new Set(admins.map((a) => a.userId)), [admins]);

  const { data: searchResults = [], isFetching: isSearching } = useSearchProfilesQuery(
    debouncedSearch,
    userId,
    { enabled: debouncedSearch.length >= 2 && !!userId }
  );

  const addAdminMutation = useAddGroupAdminMutation();
  const removeAdminMutation = useRemoveGroupAdminMutation();

  useEffect(() => {
    if (!userId || isRoleLoading) return;
    if (isSuperAdminError || isSuperAdmin !== true) {
      router.back();
    }
  }, [userId, isRoleLoading, isSuperAdminError, isSuperAdmin, router]);

  const handleAssign = useCallback(
    (targetUserId: string, name: string) => {
      if (!groupId) return;
      Alert.alert(
        t('groups.superAdminAssignConfirmTitle'),
        t('groups.superAdminAssignConfirmMessage', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('groups.superAdminAssignButton'),
            onPress: () => {
              addAdminMutation.mutate(
                { groupId, userId: targetUserId },
                {
                  onSuccess: () => {
                    Alert.alert(t('common.successTitle'), t('groups.superAdminAssignSuccess'));
                  },
                  onError: (err) => {
                    Alert.alert(t('common.error'), getUserFacingError(err));
                  },
                }
              );
            },
          },
        ]
      );
    },
    [groupId, addAdminMutation]
  );

  const handleRemove = useCallback(
    (targetUserId: string, name: string) => {
      if (!groupId) return;
      Alert.alert(
        t('groups.superAdminRemoveConfirmTitle'),
        t('groups.superAdminRemoveConfirmMessage', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('groups.superAdminRemoveAdminButton'),
            style: 'destructive',
            onPress: () => {
              removeAdminMutation.mutate(
                { groupId, userId: targetUserId },
                {
                  onSuccess: () => {
                    Alert.alert(t('common.successTitle'), t('groups.superAdminRemoveSuccess'));
                  },
                  onError: (err) => {
                    Alert.alert(t('common.error'), getUserFacingError(err));
                  },
                }
              );
            },
          },
        ]
      );
    },
    [groupId, removeAdminMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Profile }) => {
      const name = displayNameFor(item);
      const already = adminIdSet.has(item.userId);
      const email = item.email?.trim();
      return (
        <View style={styles.row}>
          <Avatar
            source={item.avatarUrl ? { uri: item.avatarUrl } : null}
            fallbackText={name}
            size="md"
          />
          <View style={styles.rowText}>
            <Text style={styles.rowName} numberOfLines={1}>
              {name}
            </Text>
            {email ? (
              <Text style={styles.rowEmail} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
          {already ? (
            <Text style={styles.alreadyLabel}>{t('groups.superAdminAlreadyAdmin')}</Text>
          ) : (
            <Button
              title={t('groups.superAdminAssignButton')}
              variant="secondary"
              onPress={() => handleAssign(item.userId, name)}
              disabled={addAdminMutation.isPending}
              accessibilityLabel={t('groups.superAdminAssignButton')}
              accessibilityHint={t('groups.superAdminAssignButtonHint')}
              style={styles.assignBtn}
            />
          )}
        </View>
      );
    },
    [adminIdSet, addAdminMutation.isPending, handleAssign]
  );

  if (!userId || !groupId) {
    return null;
  }

  if (isRoleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isSuperAdmin !== true) {
    return null;
  }

  const showMinChars = debouncedSearch.length > 0 && debouncedSearch.length < 2;
  const showResults = debouncedSearch.length >= 2;
  const showSearchSpinner = showResults && isSearching;
  const listData = showResults && !isSearching && searchResults.length > 0 ? searchResults : [];

  const listHeader = (
    <View>
      <Text style={styles.helper}>{t('groups.superAdminAssignHelper')}</Text>

      <Text style={styles.sectionTitle}>{t('groups.superAdminCurrentAdminsSection')}</Text>
      {adminsLoading ? (
        <View style={styles.adminsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : admins.length === 0 ? (
        <Text style={styles.noAdmins}>{t('groups.superAdminNoAdmins')}</Text>
      ) : (
        admins.map((admin) => {
          const name = displayNameForAdmin(admin);
          return (
            <View key={admin.userId} style={styles.row}>
              <Avatar
                source={admin.avatarUrl ? { uri: admin.avatarUrl } : null}
                fallbackText={name}
                size="md"
              />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              <Button
                title={t('groups.superAdminRemoveAdminButton')}
                variant="secondary"
                onPress={() => handleRemove(admin.userId, name)}
                disabled={removeAdminMutation.isPending}
                accessibilityLabel={t('groups.superAdminRemoveAdminButton')}
                accessibilityHint={t('groups.superAdminRemoveAdminHint')}
                style={styles.assignBtn}
              />
            </View>
          );
        })
      )}

      <View style={styles.searchBlock}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t('groups.superAdminAssignSearchPlaceholder')}
            placeholderTextColor={`${colors.onSurfaceVariant}99`}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('groups.superAdminAssignSearchPlaceholder')}
            accessibilityHint={t('groups.superAdminAssignSearchHint')}
          />
        </View>

        {showMinChars ? (
          <Text style={styles.minChars}>{t('groups.superAdminAssignMinChars')}</Text>
        ) : null}

        {showSearchSpinner ? (
          <View style={styles.searchSpinner}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );

  const listEmpty =
    showResults && !isSearching && searchResults.length === 0 ? (
      <View style={styles.emptyWrap}>
        <EmptyState
          iconName="search-outline"
          title={t('groups.superAdminNoResults')}
          subtitle={t('groups.superAdminNoResultsSubtitle')}
        />
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(p) => p.userId}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={listData.length > 0 ? <View style={styles.footerSpacer} /> : undefined}
      />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helper: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelSm,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  adminsLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  noAdmins: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  searchBlock: {
    marginTop: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 14,
  },
  minChars: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  searchSpinner: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  footerSpacer: {
    height: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 16,
    color: colors.onSurface,
  },
  rowEmail: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  alreadyLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  assignBtn: {
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 200,
  },
});
