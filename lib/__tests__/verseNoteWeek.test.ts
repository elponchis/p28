/**
 * The week strip runs Monday to Sunday in Seoul days, and the streak counts back from today —
 * an empty today does not end a run that is still live, but a gap does.
 */
import type { PersonalVerseNote } from '@/lib/api';
import { noteStreak, todaysNote, weekDates, weekStrip } from '@/lib/verseNoteWeek';

const note = (noteDate: string): PersonalVerseNote => ({
  id: `n-${noteDate}`,
  userId: 'u1',
  noteDate,
  verseRef: '로마서 10:17',
  body: `${noteDate}의 메모`,
  updatedAt: `${noteDate}T00:00:00Z`,
});

/** 2026-09-22 is a Tuesday; 05:00Z is 14:00 in Seoul, safely mid-day. */
const tuesday = new Date('2026-09-22T05:00:00Z');

describe('weekDates', () => {
  it('starts the week on Monday', () => {
    expect(weekDates(tuesday)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('keeps Sunday at the end of its own week, not the start of the next', () => {
    expect(weekDates(new Date('2026-09-27T05:00:00Z'))[6]).toBe('2026-09-27');
    expect(weekDates(new Date('2026-09-27T05:00:00Z'))[0]).toBe('2026-09-21');
  });

  it('uses the Seoul day, so late-evening UTC is already tomorrow', () => {
    // 2026-09-27T15:00Z is Monday 00:00 in Seoul, so the week has rolled over.
    expect(weekDates(new Date('2026-09-27T15:00:00Z'))[0]).toBe('2026-09-28');
  });
});

describe('weekStrip', () => {
  it('marks the written days, today, and the days still to come', () => {
    const strip = weekStrip([note('2026-09-21'), note('2026-09-22')], tuesday);
    expect(strip.map((d) => d.hasNote)).toEqual([true, true, false, false, false, false, false]);
    expect(strip.filter((d) => d.isToday).map((d) => d.date)).toEqual(['2026-09-22']);
    expect(strip.filter((d) => d.isFuture).map((d) => d.date)).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });
});

describe('noteStreak', () => {
  it('counts back from today', () => {
    expect(noteStreak([note('2026-09-20'), note('2026-09-21'), note('2026-09-22')], tuesday)).toBe(
      3
    );
  });

  it('keeps a live run going when today is still empty', () => {
    expect(noteStreak([note('2026-09-20'), note('2026-09-21')], tuesday)).toBe(2);
  });

  it('stops at a gap', () => {
    expect(noteStreak([note('2026-09-19'), note('2026-09-22')], tuesday)).toBe(1);
  });

  it('is zero with nothing written', () => {
    expect(noteStreak([], tuesday)).toBe(0);
  });

  it('is zero when the last note is older than yesterday', () => {
    expect(noteStreak([note('2026-09-18')], tuesday)).toBe(0);
  });
});

describe('todaysNote', () => {
  it('finds today and nothing else', () => {
    expect(todaysNote([note('2026-09-21'), note('2026-09-22')], tuesday)?.noteDate).toBe(
      '2026-09-22'
    );
    expect(todaysNote([note('2026-09-21')], tuesday)).toBeNull();
  });
});
