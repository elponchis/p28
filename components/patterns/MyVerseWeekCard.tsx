import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { VerseNoteReaderSheet } from '@/components/patterns/VerseNoteReaderSheet';
import { VerseNoteSheet } from '@/components/patterns/VerseNoteSheet';
import { usePersonalVerseNotesQuery } from '@/hooks/useApiQueries';
import type { DailyVerse, PersonalVerseNote } from '@/lib/api';
import { seoulDateKey } from '@/lib/dailyVerse';
import { formatVerseNoteDate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { noteStreak, todaysNote, weekStrip, WEEKDAY_KEYS } from '@/lib/verseNoteWeek';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

export interface MyVerseWeekCardProps {
  userId: string;
  /** The verse the home screen is showing today; stored with the note. */
  verse: DailyVerse | null;
}

const CIRCLE = 28;
/** How many past notes the card lists before offering the rest. */
const COLLECTION_PREVIEW = 5;

/**
 * A private week of notes on the day's verse — nobody else sees these. Separate from the group's
 * 오늘의 묵상, which is a shared passage with prompts and answers.
 */
export function MyVerseWeekCard({ userId, verse }: MyVerseWeekCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reading, setReading] = useState<PersonalVerseNote | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Every note the reader has: the week strip takes what it needs from the same list.
  const { data: notes = [] } = usePersonalVerseNotesQuery(userId);

  const days = useMemo(() => weekStrip(notes), [notes]);
  const streak = useMemo(() => noteStreak(notes), [notes]);
  const today = useMemo(() => todaysNote(notes), [notes]);
  const listed = showAll ? notes : notes.slice(0, COLLECTION_PREVIEW);

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

      {/* Everything written so far: the day and the verse, and the note itself on a tap. */}
      {notes.length > 0 ? (
        <View style={styles.collection}>
          <Text style={styles.collectionTitle}>{t('home.noteCollection')}</Text>
          {listed.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => setReading(note)}
              style={({ pressed }) => [styles.collectionRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${formatVerseNoteDate(note.noteDate)} ${note.verseRef}`}
              accessibilityHint={t('home.noteOpenHint')}
            >
              <Text style={styles.collectionDate}>{formatVerseNoteDate(note.noteDate)}</Text>
              <Text style={styles.collectionRef} numberOfLines={1}>
                {note.verseRef}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceVariant} />
            </Pressable>
          ))}
          {notes.length > COLLECTION_PREVIEW ? (
            <Pressable
              onPress={() => setShowAll((v) => !v)}
              style={({ pressed }) => [styles.collectionMore, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={
                showAll
                  ? t('home.noteCollapse')
                  : t('home.noteMore', { count: String(notes.length - COLLECTION_PREVIEW) })
              }
            >
              <Text style={styles.collectionMoreText}>
                {showAll
                  ? t('home.noteCollapse')
                  : t('home.noteMore', { count: String(notes.length - COLLECTION_PREVIEW) })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <VerseNoteSheet
        visible={sheetOpen}
        onRequestClose={() => setSheetOpen(false)}
        userId={userId}
        verse={verse}
        noteDate={seoulDateKey()}
        existingBody={today?.body ?? ''}
      />

      <VerseNoteReaderSheet note={reading} onRequestClose={() => setReading(null)} />
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
  collection: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
  },
  collectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xxs,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  collectionDate: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    color: colors.onSurface,
  },
  collectionRef: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  collectionMore: {
    paddingVertical: spacing.xs,
  },
  collectionMoreText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.accent,
  },
});
