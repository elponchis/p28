import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { Button, Input } from '@/components/primitives';
import {
  useCurrentGroupDevotionQuery,
  useGroupQuery,
  useGroupsForUserQuery,
  useIsSuperAdminQuery,
  useSaveGroupDevotionMutation,
  useUserIsGroupAdminQuery,
} from '@/hooks/useApiQueries';
import { useAuth } from '@/hooks/useAuth';
import { getUserFacingError, isApiError } from '@/lib/api';
import { localDateKey } from '@/lib/devotion';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme/tokens';

/** 오늘의 묵상 설정: a group leader sets the passage the group reflects on today. */
export default function DevotionSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const today = localDateKey();

  const { data: group } = useGroupQuery(groupId);
  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const isMember = !!groupId && memberGroups.some((g) => g.id === groupId);
  const { data: isGroupAdmin = false, isLoading: adminLoading } = useUserIsGroupAdminQuery(
    groupId,
    userId,
    { enabled: !!groupId && !!userId }
  );
  const { data: isSuperAdmin = false } = useIsSuperAdminQuery(userId, { enabled: !!userId });
  // Same rule as the group page's other leader tools.
  const canManage = isGroupAdmin && (isMember || isSuperAdmin);

  const { data: current, isLoading } = useCurrentGroupDevotionQuery(groupId, today, {
    enabled: canManage,
  });
  const save = useSaveGroupDevotionMutation();

  const [reference, setReference] = useState('');
  const [passage, setPassage] = useState('');
  const [referenceError, setReferenceError] = useState<string | undefined>();
  const [passageError, setPassageError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  // Fill in today's passage when one is already set, so the leader edits rather than retypes it.
  useEffect(() => {
    if (current && current.devotionDate === today) {
      setReference(current.reference);
      setPassage(current.passage);
    }
  }, [current, today]);

  const handleSave = () => {
    if (!groupId || !userId) return;
    const refMissing = !reference.trim();
    const passageMissing = !passage.trim();
    setReferenceError(refMissing ? t('devotion.referenceRequired') : undefined);
    setPassageError(passageMissing ? t('devotion.passageRequired') : undefined);
    if (refMissing || passageMissing) return;
    setFormError(null);
    save.mutate(
      { groupId, userId, input: { devotionDate: today, reference, passage } },
      {
        onSuccess: () => router.back(),
        onError: (e) => setFormError(isApiError(e) ? getUserFacingError(e) : t('common.error')),
      }
    );
  };

  if (adminLoading || (canManage && isLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>{t('devotion.notAllowed')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <DesktopContentContainer>
        {group?.name ? <Text style={styles.groupName}>{group.name}</Text> : null}
        <Text style={styles.title}>{t('devotion.settingsForDate', { date: today })}</Text>
        <Text style={styles.hint}>{t('devotion.settingsHint')}</Text>

        <Input
          label={t('devotion.referenceLabel')}
          value={reference}
          onChangeText={setReference}
          placeholder={t('devotion.referencePlaceholder')}
          maxLength={120}
          error={referenceError}
          accessibilityLabel={t('devotion.referenceLabel')}
        />
        <Input
          label={t('devotion.passageLabel')}
          value={passage}
          onChangeText={setPassage}
          placeholder={t('devotion.passagePlaceholder')}
          multiline
          maxLength={2000}
          error={passageError}
          inputStyle={styles.passageInput}
          accessibilityLabel={t('devotion.passageLabel')}
        />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button
          title={t('devotion.save')}
          onPress={handleSave}
          disabled={save.isPending}
          fullWidth
          accessibilityLabel={t('devotion.save')}
          accessibilityHint={t('devotion.saveHint')}
        />
      </DesktopContentContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  groupName: {
    ...typography.labelLg,
    color: colors.secondary,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.headlineSm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  passageInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.sm,
  },
});
