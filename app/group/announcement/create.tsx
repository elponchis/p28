import { useCallback, useState } from 'react';
import {
  Alert,
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
import { useAuth } from '@/hooks/useAuth';
import { useCreateAnnouncementMutation, useGroupQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { MEETING_LINK_MAX_LENGTH, parseMeetingLinkInput } from '@/lib/meetingLink';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function CreateAnnouncementScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkError, setMeetingLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: group } = useGroupQuery(groupId);
  const createMutation = useCreateAnnouncementMutation();

  const submitCreate = useCallback(() => {
    if (!userId || !groupId) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError(t('announcements.fieldsRequired'));
      return;
    }
    const parsedLink = parseMeetingLinkInput(meetingLink);
    if (!parsedLink.ok) {
      setMeetingLinkError(
        t(
          parsedLink.reason === 'too_long'
            ? 'groupEvents.meetingLinkTooLong'
            : 'groupEvents.meetingLinkInvalid'
        )
      );
      return;
    }
    setMeetingLinkError(null);
    setError(null);
    createMutation.mutate(
      {
        groupId,
        userId,
        input: { title: trimmedTitle, body: trimmedBody, meetingLink: parsedLink.value },
      },
      {
        onSuccess: () => {
          router.replace(`/group/${groupId}`);
        },
        onError: (err) => {
          setError(getUserFacingError(err));
        },
      }
    );
  }, [userId, groupId, title, body, meetingLink, createMutation, router]);

  const handlePublishPress = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError(t('announcements.fieldsRequired'));
      return;
    }
    setError(null);
    Alert.alert(
      t('announcements.confirmPublishTitle'),
      `${t('announcements.publishWarning')}\n\n${t('announcements.confirmPublishMessage')}`,
      [
        { text: t('announcements.goBack'), style: 'cancel' },
        { text: t('announcements.confirmPublishCta'), onPress: submitCreate },
      ]
    );
  }, [title, body, submitCreate]);

  if (!groupId) {
    router.back();
    return null;
  }

  if (!userId) {
    router.replace('/(tabs)/groups');
    return null;
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
        {group ? <Text style={styles.groupName}>{group.name}</Text> : null}

        <View style={styles.reminderCard}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.reminderText}>{t('announcements.eligibilityReminder')}</Text>
        </View>

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
          title={
            createMutation.isPending ? t('announcements.publishing') : t('announcements.publish')
          }
          onPress={handlePublishPress}
          disabled={createMutation.isPending}
          accessibilityLabel={t('announcements.publish')}
          accessibilityHint={t('announcements.confirmPublishMessage')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 22,
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
