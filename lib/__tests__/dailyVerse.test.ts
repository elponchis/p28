/**
 * The home verse turns over at the reader's own midnight and cycles through the list, so a
 * rotation of N verses repeats every N days and never lands outside the list.
 */
import type { DailyVerse } from '@/lib/api';
import { dayIndex, verseForDay } from '@/lib/dailyVerse';

const verse = (sortOrder: number): DailyVerse => ({
  id: `v${sortOrder}`,
  locale: 'ko',
  sortOrder,
  reference: `시편 ${sortOrder}:1`,
  passage: `본문 ${sortOrder}`,
});

describe('dayIndex', () => {
  it('advances by one each local day, not each UTC day', () => {
    const lateEvening = new Date(2026, 8, 21, 23, 30);
    const justAfterMidnight = new Date(2026, 8, 22, 0, 30);
    expect(justAfterMidnight.getTime() - lateEvening.getTime()).toBeLessThan(2 * 60 * 60 * 1000);
    expect(dayIndex(justAfterMidnight)).toBe(dayIndex(lateEvening) + 1);
  });

  it('holds still through a single day', () => {
    expect(dayIndex(new Date(2026, 8, 22, 0, 0))).toBe(dayIndex(new Date(2026, 8, 22, 23, 59)));
  });
});

describe('verseForDay', () => {
  const verses = [verse(3), verse(1), verse(2)];

  it('falls back to nothing when the list is empty', () => {
    expect(verseForDay([], new Date(2026, 8, 22))).toBeNull();
  });

  it('reads the list in sortOrder, whatever order it arrived in', () => {
    const picks = [0, 1, 2].map(
      (offset) => verseForDay(verses, new Date(2026, 8, 22 + offset))?.sortOrder
    );
    expect(new Set(picks)).toEqual(new Set([1, 2, 3]));
    expect(picks[1]).toBe((picks[0]! % 3) + 1);
    expect(picks[2]).toBe((picks[1]! % 3) + 1);
  });

  it('repeats every N days', () => {
    const day = new Date(2026, 8, 22);
    const later = new Date(2026, 8, 22 + verses.length);
    expect(verseForDay(verses, day)?.id).toBe(verseForDay(verses, later)?.id);
  });

  it('gives the same verse all day', () => {
    expect(verseForDay(verses, new Date(2026, 8, 22, 1))?.id).toBe(
      verseForDay(verses, new Date(2026, 8, 22, 22))?.id
    );
  });

  it('stays inside the list for dates before the epoch', () => {
    const picked = verseForDay(verses, new Date(1965, 0, 1));
    expect(verses.map((v) => v.id)).toContain(picked?.id);
  });

  it('never moves with a single verse', () => {
    const one = [verse(1)];
    expect(verseForDay(one, new Date(2026, 8, 22))?.id).toBe(
      verseForDay(one, new Date(2026, 8, 23))?.id
    );
  });
});
