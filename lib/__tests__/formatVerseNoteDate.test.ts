/**
 * A note from this year needs only the month and the day; one from another year has to say
 * which year, or a journal that runs for years reads as if everything happened at once.
 */
import { formatVerseNoteDate } from '@/lib/dates';

/** Mid-afternoon in Seoul, so the Seoul year is unambiguous. */
const today = new Date('2026-09-22T05:00:00Z');

describe('formatVerseNoteDate', () => {
  it('leaves the year off a note from this year', () => {
    const out = formatVerseNoteDate('2026-09-22', today);
    expect(out).not.toMatch(/2026|\b26\b/);
    expect(out).toMatch(/22/);
  });

  it('leads with the year for a note from another year', () => {
    expect(formatVerseNoteDate('2027-01-01', today)).toMatch(/27/);
    expect(formatVerseNoteDate('2025-12-31', today)).toMatch(/25/);
  });

  it('reads the stored day as a plain date, never shifted by a timezone', () => {
    // 2026-01-01 must stay the 1st, not slip to the 31st of December.
    expect(formatVerseNoteDate('2026-01-01', today)).toMatch(/1/);
    expect(formatVerseNoteDate('2026-01-01', today)).not.toMatch(/31/);
  });

  it('decides on the Seoul year, not the machine one', () => {
    // 2026-12-31T16:00Z is already 2027-01-01 in Seoul, so a 2027 note is "this year".
    const seoulNewYear = new Date('2026-12-31T16:00:00Z');
    expect(formatVerseNoteDate('2027-01-01', seoulNewYear)).not.toMatch(/27년|2027/);
  });
});
