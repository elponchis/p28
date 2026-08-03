import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LabeledSwitchRow } from './LabeledSwitchRow';
import { formatGroupEventDateTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface AssignmentDueDateFieldProps {
  value: Date | null;
  onChange: (next: Date | null) => void;
  disabled?: boolean;
}

function defaultDueDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  return d;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Nullable due-date/time field: a switch to enable/disable a deadline, then a platform-native
 * picker. @react-native-community/datetimepicker has no web implementation (renders null
 * there), so web uses a raw <input type="datetime-local"> instead — same escape hatch as the
 * birth-date field in app/auth/onboarding.tsx.
 */
export function AssignmentDueDateField({
  value,
  onChange,
  disabled = false,
}: AssignmentDueDateFieldProps) {
  const hasDueDate = value !== null;
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [androidPick, setAndroidPick] = useState<'date' | 'time' | null>(null);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onChange(enabled ? defaultDueDate() : null);
    },
    [onChange]
  );

  const handleIosChange = useCallback(
    (_event: unknown, selected?: Date) => {
      if (selected) onChange(selected);
    },
    [onChange]
  );

  const handleAndroidDateChange = useCallback(
    (event: { type?: string }, selected?: Date) => {
      setAndroidPick(null);
      if (event.type === 'dismissed' || !selected || !value) return;
      const next = new Date(value);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
    },
    [value, onChange]
  );

  const handleAndroidTimeChange = useCallback(
    (event: { type?: string }, selected?: Date) => {
      setAndroidPick(null);
      if (event.type === 'dismissed' || !selected || !value) return;
      const next = new Date(value);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
    },
    [value, onChange]
  );

  const handleWebChange = useCallback(
    (event: { target: { value: string } }) => {
      const raw = event.target.value;
      onChange(raw ? new Date(raw) : null);
    },
    [onChange]
  );

  return (
    <View>
      <LabeledSwitchRow
        variant="sheet"
        label={t('assignments.hasDueDateLabel')}
        value={hasDueDate}
        onValueChange={handleToggle}
        hint={t('assignments.hasDueDateHint')}
        accessibilityLabel={t('assignments.hasDueDateLabel')}
        accessibilityHint={t('assignments.hasDueDateHint')}
        disabled={disabled}
      />

      {hasDueDate && value ? (
        Platform.OS === 'web' ? (
          <View style={styles.dateButton}>
            {React.createElement('input', {
              type: 'datetime-local',
              value: toDatetimeLocalValue(value),
              onChange: handleWebChange,
              disabled,
              'aria-label': t('assignments.dueDateLabel'),
              style: {
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: fontFamily.sans,
                fontSize: 15,
                color: colors.textPrimary,
                cursor: disabled ? 'default' : 'pointer',
              },
            })}
          </View>
        ) : Platform.OS === 'ios' ? (
          <>
            <Pressable
              onPress={() => setShowIosPicker(true)}
              disabled={disabled}
              style={styles.dateButton}
              accessibilityLabel={t('assignments.dueDateLabel')}
              accessibilityHint={t('assignments.dueDateHint')}
              accessibilityRole="button"
            >
              <Text style={styles.dateButtonText}>
                {formatGroupEventDateTime(value.toISOString())}
              </Text>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </Pressable>
            {showIosPicker ? (
              <View style={styles.iosPickerShell} collapsable={false}>
                <DateTimePicker
                  value={value}
                  mode="datetime"
                  display="spinner"
                  onChange={handleIosChange}
                  themeVariant="light"
                  textColor={colors.textPrimary}
                />
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.androidDateRow}>
            <Text style={styles.dateButtonText}>
              {formatGroupEventDateTime(value.toISOString())}
            </Text>
            <View style={styles.androidPickButtons}>
              <Pressable
                onPress={() => setAndroidPick('date')}
                disabled={disabled}
                style={styles.androidPickBtn}
                accessibilityLabel={t('groupEvents.pickDate')}
                accessibilityRole="button"
              >
                <Text style={styles.androidPickBtnText}>{t('groupEvents.pickDate')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setAndroidPick('time')}
                disabled={disabled}
                style={styles.androidPickBtn}
                accessibilityLabel={t('groupEvents.pickTime')}
                accessibilityRole="button"
              >
                <Text style={styles.androidPickBtnText}>{t('groupEvents.pickTime')}</Text>
              </Pressable>
            </View>
            {androidPick === 'date' ? (
              <DateTimePicker
                value={value}
                mode="date"
                display="default"
                onChange={handleAndroidDateChange}
              />
            ) : null}
            {androidPick === 'time' ? (
              <DateTimePicker
                value={value}
                mode="time"
                display="default"
                onChange={handleAndroidTimeChange}
              />
            ) : null}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: spacing.sm,
  },
  dateButtonText: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    flex: 1,
  },
  androidDateRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  iosPickerShell: {
    marginTop: spacing.xs,
    minHeight: 216,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
});
