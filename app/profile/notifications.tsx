import { useCallback, useEffect, useState } from 'react';
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
import {
  disableWebPush,
  enableWebPush,
  isWebPushConfigured,
  isWebPushEnabled,
  isWebPushSupported,
} from '@/lib/webPush';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
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

  /**
   * Web push lives outside the preferences row above: the server preference is a wish, browser
   * permission is a grant, and only the browser can give the second one.
   */
  const webPushAvailable = isWebPushSupported() && isWebPushConfigured();
  const [webPushOn, setWebPushOn] = useState(false);
  const [webPushBusy, setWebPushBusy] = useState(false);

  useEffect(() => {
    if (!webPushAvailable) return;
    void isWebPushEnabled().then(setWebPushOn);
  }, [webPushAvailable]);

  const handleToggleWebPush = useCallback(
    async (next: boolean) => {
      if (!userId) return;
      setWebPushBusy(true);
      try {
        if (next) {
          const ok = await enableWebPush(userId);
          setWebPushOn(ok);
          // Declining the browser prompt is a real answer, not an error to shout about; the
          // switch springing back says it.
        } else {
          await disableWebPush();
          setWebPushOn(false);
        }
      } finally {
        setWebPushBusy(false);
      }
    },
    [userId]
  );

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
      <DesktopContentContainer maxWidth={600}>
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

        {/*
        Browser notifications are a separate switch from the preference above, because they are a
        separate thing: the preference says "I want to be told about messages", this says "this
        browser may show me a notification". Permission is per-browser and cannot be granted on
        someone's behalf, so the row only appears where the browser can actually do it.
      */}
        {webPushAvailable ? (
          <View style={styles.card}>
            <LabeledSwitchRow
              label={t('notifications.browserNotifications')}
              value={webPushOn}
              onValueChange={handleToggleWebPush}
              disabled={webPushBusy}
              accessibilityLabel={t('notifications.browserNotifications')}
              accessibilityHint={t('notifications.browserNotificationsHint')}
            />
          </View>
        ) : null}
      </DesktopContentContainer>
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
