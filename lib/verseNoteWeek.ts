/**
 * The week strip on the 이번 주 나의 묵상 card: which seven days it shows, which of them have a
 * note, and how long the current run of notes is.
 *
 * Weeks start on Monday and days are Seoul days, the same ones the verse rotates on.
 */
import type { PersonalVerseNote } from '@/lib/api';
import { seoulDateKey } from '@/lib/dailyVerse';

/** Monday through Sunday, as i18n keys for the letters under the circles. */
export const WEEKDAY_KEYS = [
  'home.weekdayMon',
  'home.weekdayTue',
  'home.weekdayWed',
  'home.weekdayThu',
  'home.weekdayFri',
  'home.weekdaySat',
  'home.weekdaySun',
] as const;

const DAY_MS = 86_400_000;

const toUtcNoon = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const keyOf = (utc: number) => new Date(utc).toISOString().slice(0, 10);

/** The seven Seoul dates of the week that `date` falls in, Monday first. */
export function weekDates(date: Date = new Date()): string[] {
  const today = toUtcNoon(seoulDateKey(date));
  // getUTCDay is 0 for Sunday, so Monday is 0 days back and Sunday is 6.
  const backToMonday = (new Date(today).getUTCDay() + 6) % 7;
  const monday = today - backToMonday * DAY_MS;
  return Array.from({ length: 7 }, (_, i) => keyOf(monday + i * DAY_MS));
}

export interface WeekDay {
  date: string;
  hasNote: boolean;
  isToday: boolean;
  /** A day that has not happened yet — drawn the same as an empty one. */
  isFuture: boolean;
}

export function weekStrip(notes: PersonalVerseNote[], date: Date = new Date()): WeekDay[] {
  const today = seoulDateKey(date);
  const written = new Set(notes.map((n) => n.noteDate));
  return weekDates(date).map((day) => ({
    date: day,
    hasNote: written.has(day),
    isToday: day === today,
    isFuture: day > today,
  }));
}

/**
 * How many days in a row end at today. A gap ends the run; today being empty does not, so long
 * as yesterday was written — the day is not over yet.
 */
export function noteStreak(notes: PersonalVerseNote[], date: Date = new Date()): number {
  const written = new Set(notes.map((n) => n.noteDate));
  const today = toUtcNoon(seoulDateKey(date));
  let streak = 0;
  let cursor = written.has(keyOf(today)) ? today : today - DAY_MS;
  while (written.has(keyOf(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

/** The note for today, if there is one. */
export function todaysNote(
  notes: PersonalVerseNote[],
  date: Date = new Date()
): PersonalVerseNote | null {
  const today = seoulDateKey(date);
  return notes.find((n) => n.noteDate === today) ?? null;
}
