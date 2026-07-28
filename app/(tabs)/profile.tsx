import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { preferredLanguageDisplayLabel, t } from '@/lib/i18n';
import { Avatar } from '@/components/primitives';
import { TAB_BAR_HEIGHT } from '@/components/navigation/FloatingTabBar';
import { colors, spacing, typography, radius, fontFamily } from '@/theme/tokens';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;
  const { data: profile, isLoading: loading, isError, error, refetch } = useProfileQuery(userId);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const errorMessage = isError && error && 'message' in error ? getUserFacingError(error) : null;

  const displayName = profile?.displayName ?? session?.user?.email ?? 'Your profile';
  const fullName = useMemo(() => {
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean) as string[];
    return parts.length ? parts.join(' ') : profile?.displayName;
  }, [profile?.firstName, profile?.lastName, profile?.displayName]);

  const birthDateLabel = useMemo(() => {
    const d = profile?.birthDate;
    if (!d) return null;
    return d;
  }, [profile?.birthDate]);

  const isLegacyProfile = !!profile && (!profile.firstName || !profile.lastName);

  const handleSignOutPress = useCallback(() => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('auth.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: signOut },
    ]);
  }, [signOut]);

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(250)} style={styles.animatedContent}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Centered avatar + name + handle */}
        <View style={styles.header}>
          <Avatar
            source={profile?.avatarUrl ? { uri: profile.avatarUrl } : null}
            fallbackText={displayName}
            size="xxl"
            accessibilityLabel={t('profile.profilePhoto')}
          />
          <Text style={styles.name}>{fullName || t('profile.title')}</Text>
          {profile?.displayName ? (
            <Text style={styles.handle}>
              @{profile.displayName.replace(/\s+/g, '_').toLowerCase()}
            </Text>
          ) : null}
        </View>

        {/* Edit profile + settings gear */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.editButton}
            onPress={() => router.push('/profile/edit')}
            accessibilityLabel={t('profile.editProfile')}
          >
            <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
          </Pressable>
          <Pressable
            style={styles.gearButton}
            onPress={() => router.push('/profile/settings')}
            accessibilityLabel={t('profile.settings')}
            accessibilityHint={t('profile.settingsHint')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {isLegacyProfile ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{t('profile.completeProfile')}</Text>
            <Text style={styles.noticeText}>{t('profile.completeProfileHint')}</Text>
            <Pressable style={styles.editButton} onPress={() => router.push('/auth/onboarding')}>
              <Text style={styles.editButtonText}>{t('profile.completeOnboarding')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Info fields with icons */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.email').toUpperCase()}</Text>
              <Text style={styles.infoValue}>{profile?.email ?? session?.user?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons name="cake" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.birthDate').toUpperCase()}</Text>
              <Text style={styles.infoValue}>{birthDateLabel ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.country').toUpperCase()}</Text>
              <Text style={styles.infoValue}>{profile?.country ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="language-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.preferredLanguage').toUpperCase()}</Text>
              <Text style={styles.infoValue}>
                {preferredLanguageDisplayLabel(profile?.preferredLanguage)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bio — Reflection Plate: white card with secondary left accent */}
        <View style={styles.bioPlate}>
          <View style={styles.bioAccent} />
          <View style={styles.bioInner}>
            <View style={styles.bioHeader}>
              <Text style={styles.quoteIcon}>{'\u201C'}</Text>
              <Text style={styles.bioTitle}>{t('profile.bio')}</Text>
            </View>
            <Text style={styles.bioText}>
              {profile?.bio ? `\u201C${profile.bio}\u201D` : t('profile.bioPlaceholder')}
            </Text>
          </View>
        </View>

        {/* Account & Community section */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>{'ACCOUNT & COMMUNITY'}</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/profile/conduct')}
            accessibilityLabel={t('conduct.title')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.menuItemText}>{t('conduct.title')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outlineVariant} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={handleSignOutPress}
            accessibilityLabel={t('profile.signOut')}
            accessibilityHint={t('profile.signOutHint')}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.menuItemText, { color: colors.error }]}>
              {t('profile.signOut')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outlineVariant} />
          </Pressable>
        </View>
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
    paddingTop: spacing.md,
  },
  animatedContent: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },

  /* Header — centered avatar, name, handle */
  header: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  handle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },

  /* Edit profile + gear row */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  editButton: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.button,
  },
  editButtonText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Info fields with icons */
  infoSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },

  /* Bio — Reflection Plate */
  bioPlate: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    marginBottom: spacing.cardGap,
    overflow: 'hidden',
  },
  bioAccent: {
    width: 4,
    backgroundColor: colors.secondary,
  },
  bioInner: {
    flex: 1,
    padding: spacing.cardPadding,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quoteIcon: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    lineHeight: 28,
    color: colors.primary,
    marginTop: -2,
  },
  bioTitle: {
    ...typography.cardTitle,
    color: colors.onSurface,
  },
  bioText: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },

  /* Account & Community section */
  accountSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  menuItemText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },

  /* Notice card */
  noticeCard: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
  },
  noticeTitle: {
    ...typography.cardTitle,
    color: colors.onSecondaryContainer,
    marginBottom: spacing.xs,
  },
  noticeText: {
    ...typography.body,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },

  /* Error banner */
  errorBanner: {
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.button,
  },
  errorText: { ...typography.body, color: colors.error },
});
