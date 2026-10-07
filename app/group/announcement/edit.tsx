import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/primitives';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import {
  useAnnouncementQuery,
  useGroupQuery,
  useUpdateAnnouncementMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { MEETING_LINK_MAX_LENGTH, parseMeetingLinkInput } from '@/lib/meetingLink';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

/**
 * Rewriting an announcement that is already out.
 *
 * The same three fields the composer has, filled from the row. Saving changes the text in place
 * and nothing else — whether the announcement is up or taken down is the detail screen's pair of
 * buttons, not this form's business.
 */
export default function EditAnnouncementScreen() {
  const { announcementId } = useLocalSearchParams<{ announcementId: string }>();
  const router = useRouter();

  const { data: announcement, isLoading } = useAnnouncementQuery(announcementId, {
    enabled: !!announcementId,
  });
  const { data: group } = useGroupQuery(announcement?.groupId);
  const updateMutation = useUpdateAnnouncementMutation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkError, setMeetingLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fill once, so a refetch cannot overwrite what is being typed.
  useEffect(() => {
    if (!announcement || loaded) return;
    setTitle(announcement.title);
    setBody(announcement.body);
    setMeetingLink(announcement.meetingLink ?? '');
    setLoaded(true);
  }, [announcement, loaded]);

  const handleSave = useCallback(() => {
    if (!announcementId) return;
    setError(null);
    setMeetingLinkError(null);
    if (!title.trim() || !body.trim()) {
      setError(t('announcements.fieldsRequired'));
      return;
    }
    const parsed = parseMeetingLinkInput(meetingLink);
    if (!parsed.ok) {
      setMeetingLinkError(
        parsed.reason === 'too_long'
          ? t('groupEvents.meetingLinkTooLong')
          : t('groupEvents.meetingLinkInvalid')
      );
      return;
    }
    updateMutation.mutate(
      { announcementId, input: { title, body, meetingLink } },
      {
        onSuccess: () => router.back(),
        onError: (e) => setError(getUserFacingError(e)),
      }
    );
  }, [announcementId, title, body, meetingLink, updateMutation, router]);

  if (!announcementId) {
    router.back();
    return null;
  }

  if (isLoading || !announcement) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <DesktopContentContainer maxWidth={600}>
          {group ? <Text style={styles.groupName}>{group.name}</Text> : null}

          {announcement.status === 'cancelled' ? (
            <View style={styles.reminderCard}>
              <Ionicons name="eye-off-outline" size={22} color={colors.primary} />
              <Text style={styles.reminderText}>{t('announcements.editingWhileDown')}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t('announcements.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('announcements.titlePlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            maxLength={200}
            accessibilityLabel={t('announcements.titleLabel')}
            accessibilityHint={t('announcements.titlePlaceholder')}
          />

          <Text style={styles.label}>{t('announcements.bodyLabel')}</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder={t('announcements.bodyPlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('announcements.bodyLabel')}
            accessibilityHint={t('announcements.bodyPlaceholder')}
          />

          <Text style={styles.label}>{t('groupEvents.meetingLink')}</Text>
          <TextInput
            style={styles.input}
            value={meetingLink}
            onChangeText={(v) => {
              setMeetingLink(v);
              setMeetingLinkError(null);
            }}
            placeholder={t('groupEvents.meetingLinkPlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            maxLength={MEETING_LINK_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t('groupEvents.meetingLink')}
            accessibilityHint={t('groupEvents.meetingLinkPlaceholder')}
          />
          {meetingLinkError ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {meetingLinkError}
            </Text>
          ) : null}

          {error ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Button
            title={updateMutation.isPending ? t('profile.saving') : t('common.save')}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={styles.publish}
            accessibilityLabel={t('common.save')}
            accessibilityHint={t('announcements.editAnnouncementHint')}
          />
        </DesktopContentContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  groupName: {
    fontFamily: fontFamily.serif,
    fontSize: 21,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  reminderCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerHigh,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  reminderText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 22,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  /**
   * The fields are separated by their labels' top margin, and the button has no label — so it
   * sat flush against the last input. `scrollContent`'s gap does not help here: every field is
   * inside one DesktopContentContainer, so the gap only ever applies to that single child.
   */
  publish: {
    marginTop: spacing.lg,
  },
  input: {
    ...typography.bodyMd,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    minHeight: 48,
  },
  bodyInput: {
    minHeight: 160,
    paddingTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
