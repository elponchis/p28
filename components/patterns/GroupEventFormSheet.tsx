import React, { useCallback, useEffect, useState } from 'react';
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
import { LabeledSwitchRow } from './LabeledSwitchRow';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { GroupEvent } from '@/lib/api';
import { formatGroupEventDateTime } from '@/lib/dates';
import { MEETING_LINK_MAX_LENGTH, parseMeetingLinkInput } from '@/lib/meetingLink';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GroupEventFormSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  mode: 'create' | 'edit';
  /** Required when mode is edit */
  initialEvent?: GroupEvent;
  onSubmit: (payload: {
    title: string;
    description: string;
    location: string;
    meetingLink: string;
    startsAt: string;
    requiresRsvp: boolean;
  }) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

function defaultEventDate(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function GroupEventFormSheet({
  visible,
  onRequestClose,
  mode,
  initialEvent,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: GroupEventFormSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkError, setMeetingLinkError] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<Date>(() => defaultEventDate());
  const [requiresRsvp, setRequiresRsvp] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  /** Android: which picker is open */
  const [androidPick, setAndroidPick] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initialEvent) {
      setTitle(initialEvent.title);
      setDescription(initialEvent.description);
      setLocation(initialEvent.location ?? '');
      setMeetingLink(initialEvent.meetingLink ?? '');
      setMeetingLinkError(null);
      setStartsAt(new Date(initialEvent.startsAt));
      setRequiresRsvp(initialEvent.requiresRsvp);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setMeetingLink('');
      setMeetingLinkError(null);
      setStartsAt(defaultEventDate());
      setRequiresRsvp(false);
    }
  }, [visible, mode, initialEvent]);

  const handleIosPickerChange = useCallback((_event: unknown, selected?: Date) => {
    if (selected) setStartsAt(selected);
  }, []);

  const handleAndroidDateChange = useCallback((_event: { type?: string }, selected?: Date) => {
    setAndroidPick(null);
    if (_event.type === 'dismissed' || !selected) return;
    setStartsAt((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  }, []);

  const handleAndroidTimeChange = useCallback((_event: { type?: string }, selected?: Date) => {
    setAndroidPick(null);
    if (_event.type === 'dismissed' || !selected) return;
    setStartsAt((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  }, []);

  const openIosPicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
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
    onSubmit({
      title: trimmedTitle,
      description: trimmedDesc,
      location: location.trim(),
      meetingLink: parsed.value,
      startsAt: startsAt.toISOString(),
      requiresRsvp,
    });
  }, [title, description, location, meetingLink, startsAt, requiresRsvp, onSubmit]);

  const sheetTitle = mode === 'edit' ? t('groupEvents.editEvent') : t('groupEvents.createEvent');

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
              <Text style={styles.label}>{t('groupEvents.eventName')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('groupEvents.eventNamePlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={200}
                accessibilityLabel={t('groupEvents.eventName')}
                accessibilityHint={t('groupEvents.eventNamePlaceholder')}
              />

              <Text style={styles.label}>{t('groupEvents.description')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('groupEvents.descriptionPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('groupEvents.description')}
                accessibilityHint={t('groupEvents.descriptionPlaceholder')}
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

              <Text style={styles.label}>{t('groupEvents.dateTime')}</Text>
              {Platform.OS === 'ios' ? (
                <Pressable
                  onPress={openIosPicker}
                  style={styles.dateButton}
                  accessibilityLabel={t('groupEvents.dateTime')}
                  accessibilityHint={t('groupEvents.dateTimeHint')}
                  accessibilityRole="button"
                >
                  <Text style={styles.dateButtonText}>
                    {formatGroupEventDateTime(startsAt.toISOString())}
                  </Text>
                  <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                </Pressable>
              ) : (
                <View style={styles.androidDateRow}>
                  <Text style={styles.dateButtonText}>
                    {formatGroupEventDateTime(startsAt.toISOString())}
                  </Text>
                  <View style={styles.androidPickButtons}>
                    <Pressable
                      onPress={() => setAndroidPick('date')}
                      style={styles.androidPickBtn}
                      accessibilityLabel={t('groupEvents.pickDate')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.androidPickBtnText}>{t('groupEvents.pickDate')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAndroidPick('time')}
                      style={styles.androidPickBtn}
                      accessibilityLabel={t('groupEvents.pickTime')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.androidPickBtnText}>{t('groupEvents.pickTime')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {Platform.OS === 'ios' && showPicker ? (
                <>
                  <View style={styles.pickerRow}>
                    <Button
                      title={t('common.done')}
                      variant="text"
                      onPress={() => setShowPicker(false)}
                      accessibilityLabel={t('common.done')}
                    />
                  </View>
                  {/* Light sheet + dark mode: UIDatePicker wheels can render invisible without themeVariant/textColor. */}
                  <View style={styles.iosPickerShell} collapsable={false}>
                    <DateTimePicker
                      value={startsAt}
                      mode="datetime"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={handleIosPickerChange}
                      themeVariant="light"
                      textColor={colors.textPrimary}
                    />
                  </View>
                </>
              ) : null}

              {Platform.OS === 'android' && androidPick === 'date' ? (
                <DateTimePicker
                  value={startsAt}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleAndroidDateChange}
                />
              ) : null}
              {Platform.OS === 'android' && androidPick === 'time' ? (
                <DateTimePicker
                  value={startsAt}
                  mode="time"
                  display="default"
                  onChange={handleAndroidTimeChange}
                />
              ) : null}

              <LabeledSwitchRow
                variant="sheet"
                label={t('groupEvents.requiresRsvp')}
                value={requiresRsvp}
                onValueChange={setRequiresRsvp}
                hint={t('groupEvents.requiresRsvpHint')}
                accessibilityLabel={t('groupEvents.requiresRsvp')}
                accessibilityHint={t('groupEvents.requiresRsvpHint')}
              />

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Button
                title={mode === 'edit' ? t('groupEvents.saveEvent') : t('groupEvents.createEvent')}
                onPress={handleSubmit}
                disabled={isSubmitting || !title.trim()}
                accessibilityLabel={
                  mode === 'edit' ? t('groupEvents.saveEvent') : t('groupEvents.createEvent')
                }
                accessibilityHint={t('groupEvents.submitHint')}
              />
              {isSubmitting ? (
                <ActivityIndicator style={styles.spinner} color={colors.primary} />
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
    // Extra room so fields + submit stay scrollable above the keyboard (sheet + KAV).
    // Bottom inset lives here (not on the sheet) so drags at the bottom of the sheet still scroll.
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
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
    minHeight: 100,
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
    flex: 1,
  },
  androidDateRow: {
    gap: spacing.sm,
  },
  androidPickButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  androidPickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
  },
  androidPickBtnText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  pickerRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
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
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginVertical: spacing.sm,
  },
  spinner: {
    marginTop: spacing.md,
  },
});
