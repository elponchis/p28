import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { VerseNoteSheet } from '@/components/patterns/VerseNoteSheet';
import { usePersonalVerseNotesQuery } from '@/hooks/useApiQueries';
import type { DailyVerse } from '@/lib/api';
import { seoulDateKey } from '@/lib/dailyVerse';
import { t } from '@/lib/i18n';
import { noteStreak, todaysNote, weekDates, weekStrip, WEEKDAY_KEYS } from '@/lib/verseNoteWeek';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

export interface MyVerseWeekCardProps {
  userId: string;
  /** The verse the home screen is showing today; stored with the note. */
  verse: DailyVerse | null;
}

const CIRCLE = 28;

/**
 * A private week of notes on the day's verse — nobody else sees these. Separate from the group's
 * 오늘의 묵상, which is a shared passage with prompts and answers.
 */
export function MyVerseWeekCard({ userId, verse }: MyVerseWeekCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const week = useMemo(() => weekDates(), []);
  const { data: notes = [] } = usePersonalVerseNotesQuery(userId, week[0], week[6]);

  const days = useMemo(() => weekStrip(notes), [notes]);
  const streak = useMemo(() => noteStreak(notes), [notes]);
  const today = useMemo(() => todaysNote(notes), [notes]);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{t('home.myWeekTitle')}</Text>
        {streak > 0 ? (
          <View style={styles.streak}>
            <Text style={styles.streakText}>{t('home.noteStreak', { count: String(streak) })}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.week}>
        {days.map((day, i) => (
          <View key={day.date} style={styles.dayColumn}>
            <View
              style={[
                styles.circle,
                day.hasNote && styles.circleWritten,
                day.isToday && styles.circleToday,
              ]}
              accessibilityLabel={`${t(WEEKDAY_KEYS[i])}${day.hasNote ? ' ✓' : ''}`}
            >
              {day.hasNote ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
            </View>
            <Text style={styles.dayLabel}>{t(WEEKDAY_KEYS[i])}</Text>
          </View>
        ))}
      </View>

      {today ? (
        <Text style={styles.noteBody} numberOfLines={2}>
          {today.body}
        </Text>
      ) : (
        <Text style={styles.notePrompt}>{t('home.noteEmpty')}</Text>
      )}

      <Pressable
        onPress={() => setSheetOpen(true)}
        disabled={!verse}
        style={({ pressed }) => [
          styles.button,
          today ? styles.buttonOutlined : styles.buttonFilled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={today ? t('home.noteContinue') : t('home.noteWrite')}
        accessibilityHint={t('home.noteSaveHint')}
      >
        <Text
          style={[styles.buttonText, today ? styles.buttonTextOutlined : styles.buttonTextFilled]}
        >
          {today ? t('home.noteContinue') : t('home.noteWrite')}
        </Text>
      </Pressable>

      <VerseNoteSheet
        visible={sheetOpen}
        onRequestClose={() => setSheetOpen(false)}
        userId={userId}
        verse={verse}
        noteDate={seoulDateKey()}
        existingBody={today?.body ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.card,
    padding: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  streak: {
    backgroundColor: colors.amberSoft,
    borderRadius: radius.chip,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  streakText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    color: colors.onSecondaryContainer,
  },
  week: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayColumn: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWritten: {
    backgroundColor: colors.accent,
  },
  /** Today is outlined whether or not it has a note yet. */
  circleToday: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dayLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  noteBody: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  notePrompt: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  button: {
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFilled: {
    backgroundColor: colors.accent,
  },
  buttonOutlined: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  buttonText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextFilled: {
    color: colors.onAccent,
  },
  buttonTextOutlined: {
    color: colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
});
