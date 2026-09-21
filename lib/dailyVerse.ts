/**
 * The verse of the day, one per day, cycling through the list.
 *
 * Everyone sees the same verse on the same day, so the day is counted in Seoul rather than on
 * whatever clock the device is set to — a reader in Phnom Penh and a reader in Seoul are looking
 * at the same card.
 */
import type { DailyVerse } from '@/lib/api';

/** Day 1 of the rotation. */
export const VERSE_EPOCH = '2026-01-01';

/** Shown under every verse; the Korean text is used on the publisher's terms. */
export const VERSE_ATTRIBUTION = '성경전서 개역한글판 © 대한성서공회';

const SEOUL = 'Asia/Seoul';

/** The Seoul calendar date as YYYY-MM-DD, whatever timezone the device is in. */
export function seoulDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whole days from the epoch to that Seoul date. Negative before 2026-01-01. */
export function daysSinceEpoch(date: Date = new Date()): number {
  const [y, m, d] = seoulDateKey(date).split('-').map(Number);
  const [ey, em, ed] = VERSE_EPOCH.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ey, em - 1, ed)) / 86_400_000);
}

/**
 * The verse for a day, read in `sortOrder`. Returns null for an empty list so the caller can
 * fall back to whatever it shipped with.
 */
export function verseForDay(verses: DailyVerse[], date: Date = new Date()): DailyVerse | null {
  if (verses.length === 0) return null;
  const ordered = [...verses].sort((a, b) => a.sortOrder - b.sortOrder);
  // `%` keeps the sign of its left operand, and days before the epoch are negative.
  const index = ((daysSinceEpoch(date) % ordered.length) + ordered.length) % ordered.length;
  return ordered[index];
}
