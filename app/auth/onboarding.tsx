import React, { useMemo, useState, useEffect } from 'react';
import {
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/primitives';
import { ReflectionPlate } from '@/components/patterns/ReflectionPlate';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/hooks/useAuth';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import { usePendingSignUp } from '@/contexts/PendingSignUpContext';
import { useCreateProfileMutation } from '@/hooks/useApiQueries';
import { auth } from '@/lib/api';
import { getUserFacingError } from '@/lib/errors';
import type { ApiError } from '@/lib/api/contracts/errors';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

type Option = { value: string; label: string };

/** Common countries (ISO 3166-1 alpha-2), alphabetically by label. */
const COUNTRY_OPTIONS: Option[] = [
  { value: 'AF', label: 'Afghanistan' },
  { value: 'AL', label: 'Albania' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'AR', label: 'Argentina' },
  { value: 'AM', label: 'Armenia' },
  { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' },
  { value: 'AZ', label: 'Azerbaijan' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'BY', label: 'Belarus' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BZ', label: 'Belize' },
  { value: 'BJ', label: 'Benin' },
  { value: 'BT', label: 'Bhutan' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BA', label: 'Bosnia and Herzegovina' },
  { value: 'BW', label: 'Botswana' },
  { value: 'BR', label: 'Brazil' },
  { value: 'BN', label: 'Brunei' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'KH', label: 'Cambodia' },
  { value: 'CM', label: 'Cameroon' },
  { value: 'CA', label: 'Canada' },
  { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CU', label: 'Cuba' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'DK', label: 'Denmark' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'EG', label: 'Egypt' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'EE', label: 'Estonia' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'FJ', label: 'Fiji' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'GE', label: 'Georgia' },
  { value: 'DE', label: 'Germany' },
  { value: 'GH', label: 'Ghana' },
  { value: 'GR', label: 'Greece' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IS', label: 'Iceland' },
  { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'IR', label: 'Iran' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IL', label: 'Israel' },
  { value: 'IT', label: 'Italy' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'JP', label: 'Japan' },
  { value: 'JO', label: 'Jordan' },
  { value: 'KZ', label: 'Kazakhstan' },
  { value: 'KE', label: 'Kenya' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'KG', label: 'Kyrgyzstan' },
  { value: 'LA', label: 'Laos' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'LY', label: 'Libya' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MO', label: 'Macau' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'MT', label: 'Malta' },
  { value: 'MX', label: 'Mexico' },
  { value: 'MD', label: 'Moldova' },
  { value: 'MN', label: 'Mongolia' },
  { value: 'ME', label: 'Montenegro' },
  { value: 'MA', label: 'Morocco' },
  { value: 'MM', label: 'Myanmar' },
  { value: 'NP', label: 'Nepal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KP', label: 'North Korea' },
  { value: 'MK', label: 'North Macedonia' },
  { value: 'NO', label: 'Norway' },
  { value: 'OM', label: 'Oman' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'PS', label: 'Palestine' },
  { value: 'PA', label: 'Panama' },
  { value: 'PG', label: 'Papua New Guinea' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Peru' },
  { value: 'PH', label: 'Philippines' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'QA', label: 'Qatar' },
  { value: 'RO', label: 'Romania' },
  { value: 'RU', label: 'Russia' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'RS', label: 'Serbia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'KR', label: 'South Korea' },
  { value: 'SS', label: 'South Sudan' },
  { value: 'ES', label: 'Spain' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SY', label: 'Syria' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'TJ', label: 'Tajikistan' },
  { value: 'TH', label: 'Thailand' },
  { value: 'TL', label: 'Timor-Leste' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TM', label: 'Turkmenistan' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'UZ', label: 'Uzbekistan' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'YE', label: 'Yemen' },
  { value: 'ZW', label: 'Zimbabwe' },
];

const LANGUAGE_OPTION_KEYS: {
  value: string;
  labelKey: 'language.english' | 'language.korean' | 'language.khmer';
}[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'km', labelKey: 'language.khmer' },
  { value: 'ko', labelKey: 'language.korean' },
];

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateForDisplay(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function BirthDateField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerDate =
    value && isIsoDate(value) ? new Date(value + 'T12:00:00') : new Date(2000, 0, 1);

  const handleChange = (_event: { type: string }, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(formatDateToYYYYMMDD(selectedDate));
    }
  };

  const handlePress = () => {
    if (disabled) return;
    setShowPicker(true);
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>{t('profile.birthDate')}</Text>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[styles.select, disabled ? styles.selectDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel={t('profile.birthDate')}
        accessibilityHint={t('profile.datePickerHint')}
      >
        <Text style={[styles.selectText, !value ? styles.placeholderText : null]}>
          {value ? formatDateForDisplay(value) : t('profile.selectDateOptional')}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.onSurfaceVariant} />
      </Pressable>
      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerRow}>
              <Button
                title={t('common.done')}
                variant="text"
                onPress={() => setShowPicker(false)}
                accessibilityLabel={t('common.done')}
              />
            </View>
          )}
          {Platform.OS === 'ios' ? (
            // Match GroupEventFormSheet: spinner wheels can render invisible in dark mode without shell + theme props.
            <View style={styles.iosPickerShell} collapsable={false}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={new Date()}
                themeVariant="light"
                textColor={colors.textPrimary}
              />
            </View>
          ) : (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="default"
              onChange={handleChange}
              maximumDate={new Date()}
            />
          )}
        </>
      )}
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
  accessibilityHint,
  doneLabel,
  icon,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  options: Option[];
  disabled?: boolean;
  onChange: (next: string) => void;
  accessibilityHint?: string;
  doneLabel?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const [open, setOpen] = useState(false);
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(open);
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.select, disabled ? styles.selectDisabled : null]}
      >
        <Text style={[styles.selectText, !selectedLabel ? styles.placeholderText : null]}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons
          name={icon ?? 'chevron-expand-outline'}
          size={20}
          color={colors.onSurfaceVariant}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setOpen(false)}>
          <RNAnimated.View
            style={[StyleSheet.absoluteFill, styles.sheetBackdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
          <RNAnimated.View
            style={[styles.sheetContainer, { transform: [{ translateY: sheetSlideAnim }] }]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Button
                  title={doneLabel ?? t('common.done')}
                  variant="text"
                  onPress={() => setOpen(false)}
                  accessibilityLabel={doneLabel ?? t('common.done')}
                />
              </View>
              <ScrollView contentContainerStyle={styles.sheetList} style={styles.sheetScroll}>
                {options.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      style={[styles.sheetItem, active ? styles.sheetItemActive : null]}
                    >
                      <Text
                        style={[styles.sheetItemText, active ? styles.sheetItemTextActive : null]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </RNAnimated.View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const { setLocale, locale } = useLocale();
  const { pendingSignUp, clearPendingSignUp } = usePendingSignUp();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(locale);

  const [error, setError] = useState<string | null>(null);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);
  const createProfileMutation = useCreateProfileMutation();
  const isSubmitting = isSubmittingSignUp || createProfileMutation.isPending;

  useEffect(() => {
    if (!pendingSignUp && !session?.user?.id) {
      router.replace('/auth/sign-in');
    }
  }, [pendingSignUp, session?.user?.id]);

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (birthDate.trim() && !isIsoDate(birthDate)) return false;
    return true;
  }, [firstName, lastName, birthDate]);

  async function handleSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('onboarding.firstAndLastNameRequired'));
      return;
    }
    if (birthDate.trim() && !isIsoDate(birthDate)) {
      setError(t('profile.birthDateFormatError'));
      return;
    }

    let userId: string | null = session?.user?.id ?? pendingSignUp?.userId ?? null;

    if (pendingSignUp && !userId) {
      setIsSubmittingSignUp(true);
      const signUpResult = await auth.signUp(pendingSignUp.email, pendingSignUp.password);
      if ('error' in signUpResult) {
        const err = signUpResult.error as ApiError;
        if (err.code === 'EMAIL_CONFIRMATION_REQUIRED') {
          clearPendingSignUp();
          setError(t('onboarding.emailConfirmThenSignIn'));
          setIsSubmittingSignUp(false);
          return;
        }
        setError(getUserFacingError(err));
        setIsSubmittingSignUp(false);
        return;
      }
      userId = signUpResult.session?.user?.id ?? null;
      clearPendingSignUp();
    } else if (pendingSignUp?.userId) {
      clearPendingSignUp();
    }

    if (!userId) {
      setError(t('onboarding.trySigningIn'));
      setIsSubmittingSignUp(false);
      return;
    }

    createProfileMutation.mutate(
      {
        userId,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate.trim() ? birthDate.trim() : undefined,
          country: country ?? undefined,
          preferredLanguage: preferredLanguage ?? undefined,
        },
      },
      {
        onSuccess: (result) => {
          setIsSubmittingSignUp(false);
          if (result.preferredLanguage) setLocale(result.preferredLanguage);
          router.replace('/(tabs)');
        },
        onError: (err) => {
          setIsSubmittingSignUp(false);
          setError(getUserFacingError(err));
        },
      }
    );
  }

  function handleBackToSignIn() {
    clearPendingSignUp();
    router.replace('/auth/sign-in');
  }

  const languageOptions: Option[] = useMemo(
    () =>
      LANGUAGE_OPTION_KEYS.map((o) => ({
        value: o.value,
        label: t(o.labelKey),
      })),
    [locale]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(250)} style={styles.content}>
          {/* Back button */}
          <Pressable
            onPress={handleBackToSignIn}
            style={styles.backButton}
            disabled={isSubmitting}
            accessibilityLabel={t('auth.backToSignIn')}
            accessibilityHint={t('onboarding.backToSignInHint')}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>

          {/* Editorial header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('onboarding.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            <Input
              label={t('profile.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('profile.firstName')}
              editable={!isSubmitting}
              containerStyle={styles.fieldSpacing}
            />
            <Input
              label={t('profile.lastName')}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('profile.lastName')}
              editable={!isSubmitting}
              containerStyle={styles.fieldSpacing}
            />

            <View style={styles.fieldSpacing}>
              <BirthDateField value={birthDate} onChange={setBirthDate} disabled={isSubmitting} />
            </View>

            <View style={styles.fieldSpacing}>
              <SelectField
                label={t('profile.countryOfResidence')}
                value={country}
                placeholder={t('profile.selectCountryOptional')}
                options={COUNTRY_OPTIONS}
                disabled={isSubmitting}
                onChange={setCountry}
                accessibilityHint={t('profile.optionsListHint')}
                icon="chevron-expand-outline"
              />
            </View>

            <View style={styles.fieldSpacing}>
              <SelectField
                label={t('profile.preferredLanguage')}
                value={preferredLanguage}
                placeholder={t('language.selectLanguage')}
                options={languageOptions}
                disabled={isSubmitting}
                onChange={setPreferredLanguage}
                accessibilityHint={t('profile.optionsListHint')}
                icon="language-outline"
              />
            </View>
          </View>

          {/* Scripture quote plate */}
          <View style={styles.quotePlateWrapper}>
            <ReflectionPlate
              quote={t('onboarding.scriptureQuote')}
              attribution={t('onboarding.scriptureAttribution')}
            />
          </View>

          {/* Error banner */}
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {/* CTA */}
          <View style={styles.ctaSection}>
            <Button
              title={isSubmitting ? t('profile.saving') : t('onboarding.beginJourney')}
              onPress={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              fullWidth
              style={styles.ctaButton}
              accessibilityLabel={t('onboarding.beginJourney')}
              accessibilityHint={t('onboarding.continueHint')}
            />
          </View>
        </Animated.View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.screenHorizontal,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing.xs,
    marginBottom: spacing.md,
  },

  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.5,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
    color: colors.onSurfaceVariant,
  },

  form: {
    gap: spacing.lg,
  },
  fieldSpacing: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },

  select: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectDisabled: { opacity: 0.7 },
  selectText: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400',
    color: colors.onSurface,
    flex: 1,
  },
  placeholderText: { color: 'rgba(116, 119, 127, 0.4)' },

  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iosPickerShell: {
    marginTop: spacing.xs,
    minHeight: 216,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },

  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    maxHeight: '65%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { ...typography.titleLg, color: colors.onSurface },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  sheetItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  sheetItemActive: {
    backgroundColor: colors.secondaryContainer,
  },
  sheetItemText: { ...typography.body, color: colors.onSurface },
  sheetItemTextActive: { color: colors.onSecondaryContainer, fontWeight: '600' },

  quotePlateWrapper: {
    marginTop: spacing.xxl,
  },

  errorBanner: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
  },

  ctaSection: {
    marginTop: spacing.xl,
  },
  ctaButton: {
    alignSelf: 'stretch',
    minHeight: 56,
  },
});
