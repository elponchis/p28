import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/primitives';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import {
  defaultRecurringMeetingTimeZone,
  getRecurringMeetingTimeZones,
  isAllowedRecurringMeetingTimeZone,
} from '@/lib/ianaTimeZones';
import { t } from '@/lib/i18n';
import { MEETING_LINK_MAX_LENGTH, parseMeetingLinkInput } from '@/lib/meetingLink';
import type {
  CreateGroupRecurringMeetingInput,
  GroupRecurringMeeting,
  RecurringMeetingFrequency,
} from '@/lib/api';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GroupRecurringMeetingFormSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  mode: 'create' | 'edit';
  initialMeeting?: GroupRecurringMeeting;
  onSubmit: (payload: CreateGroupRecurringMeetingInput) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  /** Edit mode: destructive delete (parent typically confirms with `Alert` then mutates). */
  onRequestDelete?: () => void;
  isDeleting?: boolean;
}

const JS_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FREQUENCIES: RecurringMeetingFrequency[] = ['weekly', 'biweekly', 'monthly_nth'];
const ORDINALS = [1, 2, 3, 4, -1] as const;

function defaultTimeDate(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(14, 0, 0, 0);
  return d;
}

function timeDateToLocalString(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function recurringTimeZoneLabel(id: string): string {
  switch (id) {
    case 'America/Vancouver':
      return t('recurringMeetings.tzVancouver');
    case 'Asia/Seoul':
      return t('recurringMeetings.tzSeoul');
    case 'Asia/Phnom_Penh':
      return t('recurringMeetings.tzPhnomPenh');
    default:
      return id;
  }
}

export function GroupRecurringMeetingFormSheet({
  visible,
  onRequestClose,
  mode,
  initialMeeting,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
  onRequestDelete,
  isDeleting = false,
}: GroupRecurringMeetingFormSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkError, setMeetingLinkError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringMeetingFrequency>('weekly');
  const [weekday, setWeekday] = useState(0);
  const [monthOrdinal, setMonthOrdinal] = useState<number>(1);
  const [timeDate, setTimeDate] = useState(defaultTimeDate);
  const [timezone, setTimezone] = useState(() => defaultRecurringMeetingTimeZone());
  const [showIosTime, setShowIosTime] = useState(false);
  const [androidTimeOpen, setAndroidTimeOpen] = useState(false);

  const timeZones = useMemo(() => getRecurringMeetingTimeZones(), []);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initialMeeting) {
      setTitle(initialMeeting.title);
      setDescription(initialMeeting.description);
      setLocation(initialMeeting.location);
      setMeetingLink(initialMeeting.meetingLink ?? '');
      setMeetingLinkError(null);
      setFrequency(initialMeeting.recurrenceFrequency);
      setWeekday(initialMeeting.weekday);
      setMonthOrdinal(initialMeeting.monthWeekOrdinal ?? 1);
      const [hh, mm] = initialMeeting.timeLocal.split(':').map((x) => parseInt(x, 10));
      const td = new Date();
      td.setHours(Number.isFinite(hh) ? hh : 14, Number.isFinite(mm) ? mm : 0, 0, 0);
      setTimeDate(td);
      setTimezone(
        isAllowedRecurringMeetingTimeZone(initialMeeting.timezone)
          ? initialMeeting.timezone
          : defaultRecurringMeetingTimeZone()
      );
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setMeetingLink('');
      setMeetingLinkError(null);
      setFrequency('weekly');
      setWeekday(0);
      setMonthOrdinal(1);
      setTimeDate(defaultTimeDate());
      setTimezone(defaultRecurringMeetingTimeZone());
    }
  }, [visible, mode, initialMeeting]);

  const handleIosTimeChange = useCallback((_e: unknown, selected?: Date) => {
    if (selected) setTimeDate(selected);
  }, []);

  const handleAndroidTimeChange = useCallback((_event: { type?: string }, selected?: Date) => {
    setAndroidTimeOpen(false);
    if (_event.type === 'dismissed' || !selected) return;
    setTimeDate(selected);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const parsed = parseMeetingLinkInput(meetingLink);
    if (!parsed.ok) {
      setMeetingLinkError(
        t(
          parsed.reason === 'too_long'
            ? 'groupEvents.meetingLinkTooLong'
            : 'groupEvents.meetingLinkInvalid'
        )
      );
      return;
    }
    setMeetingLinkError(null);
    const payload: CreateGroupRecurringMeetingInput = {
      title: trimmedTitle,
      description: description.trim(),
      location: location.trim(),
      meetingLink: parsed.value,
      recurrenceFrequency: frequency,
      weekday,
      timeLocal: timeDateToLocalString(timeDate),
      timezone: timezone.trim(),
      monthWeekOrdinal: frequency === 'monthly_nth' ? monthOrdinal : undefined,
    };
    onSubmit(payload);
  }, [
    title,
    description,
    location,
    meetingLink,
    frequency,
    weekday,
    monthOrdinal,
    timeDate,
    timezone,
    onSubmit,
  ]);

  const sheetTitle =
    mode === 'edit' ? t('recurringMeetings.sheetEdit') : t('recurringMeetings.sheetCreate');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
        </Pressable>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlideAnim }] }]}>
          <View style={styles.sheetInner}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              <Pressable
                onPress={onRequestClose}
                hitSlop={12}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={26} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom:
                    spacing.majorSectionGap * 2 +
                    spacing.xl +
                    Math.max(insets.bottom, Platform.OS === 'ios' ? spacing.xxl : spacing.xl),
                },
              ]}
            >
              <Text style={styles.label}>{t('recurringMeetings.name')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('recurringMeetings.namePlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={200}
                accessibilityLabel={t('recurringMeetings.name')}
                accessibilityHint={t('recurringMeetings.namePlaceholder')}
              />

              <Text style={styles.label}>{t('recurringMeetings.description')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('recurringMeetings.descriptionPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('recurringMeetings.description')}
                accessibilityHint={t('recurringMeetings.descriptionPlaceholder')}
              />

              <Text style={styles.label}>{t('groupEvents.location')}</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={t('groupEvents.locationPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={300}
                accessibilityLabel={t('groupEvents.location')}
                accessibilityHint={t('groupEvents.locationPlaceholder')}
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
              {meetingLinkError ? <Text style={styles.errorText}>{meetingLinkError}</Text> : null}

              <Text style={styles.label}>{t('recurringMeetings.frequency')}</Text>
              <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[styles.chip, frequency === f && styles.chipSelected]}
                    accessibilityLabel={
                      f === 'weekly'
                        ? t('recurringMeetings.frequencyWeekly')
                        : f === 'biweekly'
                          ? t('recurringMeetings.frequencyBiweekly')
                          : t('recurringMeetings.frequencyMonthlyNth')
                    }
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.chipText, frequency === f && styles.chipTextSelected]}
                      numberOfLines={2}
                    >
                      {f === 'weekly'
                        ? t('recurringMeetings.frequencyWeekly')
                        : f === 'biweekly'
                          ? t('recurringMeetings.frequencyBiweekly')
                          : t('recurringMeetings.frequencyMonthlyNth')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t('recurringMeetings.weekday')}</Text>
              <View style={styles.chipRowWrap}>
                {JS_WEEKDAYS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setWeekday(d)}
                    style={[styles.chipSm, weekday === d && styles.chipSelected]}
                    accessibilityLabel={t(`recurringMeetings.wd${d}` as 'recurringMeetings.wd0')}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.chipTextSm, weekday === d && styles.chipTextSelected]}
                      numberOfLines={1}
                    >
                      {t(`recurringMeetings.wd${d}` as 'recurringMeetings.wd0').slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {frequency === 'monthly_nth' ? (
                <>
                  <Text style={styles.label}>{t('recurringMeetings.weekOfMonth')}</Text>
                  <View style={styles.chipRowWrap}>
                    {ORDINALS.map((o) => (
                      <Pressable
                        key={o}
                        onPress={() => setMonthOrdinal(o)}
                        style={[styles.chipSm, monthOrdinal === o && styles.chipSelected]}
                        accessibilityLabel={
                          o === -1
                            ? t('recurringMeetings.ordinalLast')
                            : o === 1
                              ? t('recurringMeetings.ordinalFirst')
                              : o === 2
                                ? t('recurringMeetings.ordinalSecond')
                                : o === 3
                                  ? t('recurringMeetings.ordinalThird')
                                  : t('recurringMeetings.ordinalFourth')
                        }
                        accessibilityRole="button"
                      >
                        <Text
                          style={[styles.chipTextSm, monthOrdinal === o && styles.chipTextSelected]}
                        >
                          {o === -1
                            ? t('recurringMeetings.ordinalLast')
                            : o === 1
                              ? t('recurringMeetings.ordinalFirst')
                              : o === 2
                                ? t('recurringMeetings.ordinalSecond')
                                : o === 3
                                  ? t('recurringMeetings.ordinalThird')
                                  : t('recurringMeetings.ordinalFourth')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>{t('recurringMeetings.time')}</Text>
              <Text style={styles.hint}>{t('recurringMeetings.timeHint')}</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <Pressable
                    onPress={() => setShowIosTime(true)}
                    style={styles.dateButton}
                    accessibilityLabel={t('recurringMeetings.time')}
                    accessibilityHint={t('recurringMeetings.timeHint')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dateButtonText}>{timeDateToLocalString(timeDate)}</Text>
                    <Ionicons name="time-outline" size={22} color={colors.primary} />
                  </Pressable>
                  {showIosTime ? (
                    <View style={styles.iosPickerShell}>
                      <View style={styles.pickerRow}>
                        <Button
                          title={t('common.done')}
                          variant="text"
                          onPress={() => setShowIosTime(false)}
                          accessibilityLabel={t('common.done')}
                        />
                      </View>
                      <DateTimePicker
                        value={timeDate}
                        mode="time"
                        display="spinner"
                        onChange={handleIosTimeChange}
                        themeVariant="light"
                        textColor={colors.textPrimary}
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setAndroidTimeOpen(true)}
                    style={styles.dateButton}
                    accessibilityLabel={t('recurringMeetings.time')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dateButtonText}>{timeDateToLocalString(timeDate)}</Text>
                    <Ionicons name="time-outline" size={22} color={colors.primary} />
                  </Pressable>
                  {androidTimeOpen ? (
                    <DateTimePicker
                      value={timeDate}
                      mode="time"
                      display="default"
                      onChange={handleAndroidTimeChange}
                    />
                  ) : null}
                </>
              )}

              <Text style={styles.label}>{t('recurringMeetings.timezone')}</Text>
              <View style={styles.tzChoices}>
                {timeZones.map((z) => (
                  <Pressable
                    key={z}
                    onPress={() => setTimezone(z)}
                    style={[styles.tzRow, timezone === z && styles.tzRowSelected]}
                    accessibilityLabel={recurringTimeZoneLabel(z)}
                    accessibilityHint={z}
                    accessibilityRole="button"
                    accessibilityState={{ selected: timezone === z }}
                  >
                    <View style={styles.tzRowTextCol}>
                      <Text style={styles.tzRowTitle}>{recurringTimeZoneLabel(z)}</Text>
                      <Text style={styles.tzRowSub} numberOfLines={1}>
                        {z}
                      </Text>
                    </View>
                    {timezone === z ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Button
                title={
                  mode === 'edit' ? t('recurringMeetings.save') : t('recurringMeetings.create')
                }
                onPress={handleSubmit}
                disabled={isSubmitting || isDeleting || !title.trim()}
                accessibilityLabel={
                  mode === 'edit' ? t('recurringMeetings.save') : t('recurringMeetings.create')
                }
                accessibilityHint={t('groupEvents.submitHint')}
              />
              {isSubmitting || isDeleting ? (
                <ActivityIndicator style={styles.spinner} color={colors.primary} />
              ) : null}

              {mode === 'edit' && onRequestDelete ? (
                <View style={styles.deleteSection}>
                  <Pressable
                    onPress={onRequestDelete}
                    disabled={isSubmitting || isDeleting}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                      (isSubmitting || isDeleting) && styles.deleteButtonDisabled,
                    ]}
                    accessibilityLabel={t('recurringMeetings.deleteRecurring')}
                    accessibilityHint={t('recurringMeetings.deleteRecurringConfirm')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={styles.deleteButtonText}>
                      {t('recurringMeetings.deleteRecurring')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  sheetInner: {
    paddingHorizontal: spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    color: colors.primary,
  },
  scrollContent: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceContainerLow,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  dateButtonText: {
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    maxWidth: '48%',
  },
  chipSm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  chipTextSm: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold,
  },
  tzChoices: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  tzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  tzRowSelected: {
    backgroundColor: colors.primaryFixed,
  },
  tzRowTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  tzRowTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  tzRowSub: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  iosPickerShell: {
    marginTop: spacing.sm,
  },
  pickerRow: {
    alignItems: 'flex-end',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  deleteSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.input,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
  },
});
