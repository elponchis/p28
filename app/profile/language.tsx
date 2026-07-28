import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfileMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography, minTouchTarget } from '@/theme/tokens';

type LocaleOption = 'en' | 'ko' | 'km';

const LOCALES: {
  value: LocaleOption;
  labelKey: 'language.english' | 'language.korean' | 'language.khmer';
}[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'ko', labelKey: 'language.korean' },
  { value: 'km', labelKey: 'language.khmer' },
];

export default function LanguageScreen() {
  const { session } = useAuth();
  const { locale, setLocale } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user?.id;
  const updateMutation = useUpdateProfileMutation();

  const handleSelect = useCallback(
    (next: LocaleOption) => {
      if (next === locale) return;
      if (!userId) return;
      setLocale(next);
      setError(null);
      updateMutation.mutate(
        { userId, updates: { preferredLanguage: next } },
        {
          onError: (err) => setError(getUserFacingError(err)),
        }
      );
    },
    [locale, userId, setLocale, updateMutation]
  );

  const isSubmitting = updateMutation.isPending;

  if (!userId) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
      {error || (updateMutation.error && 'message' in updateMutation.error) ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {error ??
              (updateMutation.error && 'message' in updateMutation.error
                ? getUserFacingError(updateMutation.error)
                : '')}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        {LOCALES.map(({ value, labelKey }) => (
          <Pressable
            key={value}
            onPress={() => handleSelect(value)}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.optionRow,
              pressed && styles.optionRowPressed,
              value === locale && styles.optionRowSelected,
            ]}
            accessibilityLabel={t(labelKey)}
            accessibilityHint={t('profile.appLanguageHint')}
            accessibilityRole="button"
          >
            <Text style={styles.optionLabel}>{t(labelKey)}</Text>
            {value === locale ? <Text style={styles.optionCheck}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      {isSubmitting ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
            accessibilityLabel={t('common.loading')}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.cardPadding,
    minHeight: minTouchTarget,
  },
  optionRowPressed: {
    backgroundColor: colors.surface100,
  },
  optionRowSelected: {
    backgroundColor: colors.brandSoft,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionCheck: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.button,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  loadingRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});
