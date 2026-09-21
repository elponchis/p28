/**
 * The home screen's verse, one per day.
 *
 * The list cycles: day 0 takes the first verse, day 1 the second, and after the last one it
 * starts over. Nobody posts anything each morning, and adding a verse is adding a row.
 */
import type { DailyVerse } from '@/lib/api';

/**
 * Days since the epoch in the reader's own timezone, so the verse turns over at their midnight
 * rather than at UTC — which in Korea would be 9am.
 */
export function dayIndex(date: Date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local / 86_400_000);
}

/**
 * The verse for a day, in `sortOrder`. Returns null for an empty list so the caller can fall
 * back to the string it shipped with.
 */
export function verseForDay(verses: DailyVerse[], date: Date = new Date()): DailyVerse | null {
  if (verses.length === 0) return null;
  const ordered = [...verses].sort((a, b) => a.sortOrder - b.sortOrder);
  // `%` keeps the sign of the left operand, and dates before 1970 would go negative.
  const index = ((dayIndex(date) % ordered.length) + ordered.length) % ordered.length;
  return ordered[index];
}
