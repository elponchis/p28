/**
 * The verse of the day turns over at Seoul's midnight, not the device's, so everyone reading on
 * the same day reads the same verse. After the last verse the list starts again.
 */
import type { DailyVerse } from '@/lib/api';
import { daysSinceEpoch, seoulDateKey, verseForDay, VERSE_EPOCH } from '@/lib/dailyVerse';

const verse = (sortOrder: number): DailyVerse => ({
  id: `v${sortOrder}`,
  locale: 'ko',
  sortOrder,
  reference: `시편 ${sortOrder}:1`,
  passage: `본문 ${sortOrder}`,
});

/** 15:00 UTC is midnight in Seoul. */
const utc = (iso: string) => new Date(iso);

describe('seoulDateKey', () => {
  it('reads the Seoul calendar date, not the device one', () => {
    expect(seoulDateKey(utc('2026-03-09T14:59:00Z'))).toBe('2026-03-09');
    expect(seoulDateKey(utc('2026-03-09T15:00:00Z'))).toBe('2026-03-10');
  });
});

describe('daysSinceEpoch', () => {
  it('counts from the epoch day', () => {
    expect(daysSinceEpoch(utc(`${VERSE_EPOCH}T05:00:00Z`))).toBe(0);
    expect(daysSinceEpoch(utc('2026-01-02T05:00:00Z'))).toBe(1);
    expect(daysSinceEpoch(utc('2025-12-31T05:00:00Z'))).toBe(-1);
  });

  it('steps at Seoul midnight', () => {
    expect(daysSinceEpoch(utc('2026-03-09T14:59:00Z')) + 1).toBe(
      daysSinceEpoch(utc('2026-03-09T15:00:00Z'))
    );
  });
});

describe('verseForDay', () => {
  const verses = [verse(3), verse(1), verse(2)];

  it('falls back to nothing when the list is empty', () => {
    expect(verseForDay([], utc('2026-03-09T05:00:00Z'))).toBeNull();
  });

  it('gives the same verse all through one Seoul day', () => {
    // 00:01 and 23:59 in Seoul are 15:01 the day before and 14:59 the same day in UTC.
    expect(verseForDay(verses, utc('2026-03-08T15:01:00Z'))?.id).toBe(
      verseForDay(verses, utc('2026-03-09T14:59:00Z'))?.id
    );
  });

  it('changes across Seoul midnight', () => {
    expect(verseForDay(verses, utc('2026-03-09T14:59:00Z'))?.id).not.toBe(
      verseForDay(verses, utc('2026-03-09T15:00:00Z'))?.id
    );
  });

  it('reads the list in sortOrder and steps one at a time', () => {
    const picks = [0, 1, 2].map(
      (offset) => verseForDay(verses, utc(`2026-03-1${offset}T05:00:00Z`))?.sortOrder
    );
    expect(new Set(picks)).toEqual(new Set([1, 2, 3]));
    expect(picks[1]).toBe((picks[0]! % 3) + 1);
    expect(picks[2]).toBe((picks[1]! % 3) + 1);
  });

  it('repeats once the list runs out', () => {
    expect(verseForDay(verses, utc('2026-03-09T05:00:00Z'))?.id).toBe(
      verseForDay(verses, utc('2026-03-12T05:00:00Z'))?.id
    );
  });

  it('repeats every 183 days on the real list', () => {
    const full = Array.from({ length: 183 }, (_, i) => verse(i + 1));
    expect(verseForDay(full, utc('2026-03-09T05:00:00Z'))?.id).toBe(
      verseForDay(full, utc('2026-09-08T05:00:00Z'))?.id
    );
  });

  it('starts the rotation at the epoch', () => {
    const full = Array.from({ length: 183 }, (_, i) => verse(i + 1));
    expect(verseForDay(full, utc(`${VERSE_EPOCH}T05:00:00Z`))?.sortOrder).toBe(1);
  });

  it('stays inside the list before the epoch', () => {
    const picked = verseForDay(verses, utc('2025-06-01T05:00:00Z'));
    expect(verses.map((v) => v.id)).toContain(picked?.id);
  });
});
