import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LabeledSwitchRow } from '@/components/patterns';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function NotificationPreferencesScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const {
    data: prefs,
    isLoading: loading,
    isError,
    error,
    refetch: fetchPrefs,
  } = useNotificationPreferencesQuery(userId);
  const updateMutation = useUpdateNotificationPreferencesMutation();
  const isSubmitting = updateMutation.isPending;
  const mutationError = updateMutation.error;
  const errorMessage =
    (isError && error && 'message' in error ? getUserFacingError(error) : null) ??
    (mutationError && 'message' in mutationError ? getUserFacingError(mutationError) : null);

  const handleToggle = (
    key: 'eventsEnabled' | 'announcementsEnabled' | 'recurringMeetingsEnabled' | 'messagesEnabled',
    value: boolean
  ) => {
    if (!userId || !prefs) return;
    const next = {
      eventsEnabled: prefs.eventsEnabled,
      announcementsEnabled: prefs.announcementsEnabled,
      recurringMeetingsEnabled: prefs.recurringMeetingsEnabled,
      messagesEnabled: prefs.messagesEnabled,
      [key]: value,
    };
    updateMutation.mutate({ userId, updates: next }, { onError: () => {} });
  };

  if (!userId) return null;

  if (loading && !prefs) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel={t('notifications.loadingLabel')}
        />
      </View>
    );
  }

  const showToggles = prefs != null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchPrefs} tintColor={colors.primary} />
      }
    >
      <Text style={styles.intro}>{t('notifications.intro')}</Text>
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            onPress={() => fetchPrefs()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            accessibilityLabel={t('notifications.retry')}
            accessibilityHint={t('notifications.retryHint')}
          >
            <Text style={styles.retryButtonText}>{t('notifications.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {showToggles ? (
        <View style={styles.card}>
          <LabeledSwitchRow
            label={t('notifications.events')}
            value={prefs?.eventsEnabled ?? true}
            onValueChange={(v) => handleToggle('eventsEnabled', v)}
            disabled={isSubmitting}
            accessibilityLabel={t('notifications.events')}
            accessibilityHint={t('notifications.eventsHint')}
          />
          <LabeledSwitchRow
            label={t('notifications.announcements')}
            value={prefs?.announcementsEnabled ?? true}
            onValueChange={(v) => handleToggle('announcementsEnabled', v)}
            disabled={isSubmitting}
            accessibilityLabel={t('notifications.announcements')}
            accessibilityHint={t('notifications.announcementsHint')}
          />
          <LabeledSwitchRow
            label={t('notifications.recurringMeetings')}
            value={prefs?.recurringMeetingsEnabled ?? true}
            onValueChange={(v) => handleToggle('recurringMeetingsEnabled', v)}
            disabled={isSubmitting}
            accessibilityLabel={t('notifications.recurringMeetings')}
            accessibilityHint={t('notifications.recurringMeetingsHint')}
          />
          <LabeledSwitchRow
            label={t('notifications.messages')}
            value={prefs?.messagesEnabled ?? true}
            onValueChange={(v) => handleToggle('messagesEnabled', v)}
            disabled={isSubmitting}
            accessibilityLabel={t('notifications.messages')}
            accessibilityHint={t('notifications.messagesHint')}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.card,
  padding: spacing.cardPadding,
  marginBottom: spacing.cardGap,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.button,
  },
  errorText: { ...typography.body, color: colors.error, marginBottom: spacing.xs },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  retryButtonPressed: { opacity: 0.8 },
  retryButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  card: { ...cardStyle },
});
