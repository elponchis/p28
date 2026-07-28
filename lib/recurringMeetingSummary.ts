import { DateTime } from 'luxon';

import type { GroupRecurringMeeting } from '@/lib/api/contracts/dto';
import { t } from '@/lib/i18n';

/** Minimal shape for formatting (matches `GroupRecurringMeeting` recurrence fields). */
export type RecurringMeetingSummaryInput = Pick<
  GroupRecurringMeeting,
  'recurrenceFrequency' | 'weekday' | 'timeLocal' | 'timezone' | 'monthWeekOrdinal' | 'createdAt'
>;

function jsWeekdayToLuxon(jsWeekday: number): number {
  return jsWeekday === 0 ? 7 : jsWeekday;
}

export function parseTimeLocalParts(s: string): { hour: number; minute: number; second: number } {
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s.trim());
  if (!m) return { hour: 0, minute: 0, second: 0 };
  return {
    hour: parseInt(m[1], 10),
    minute: parseInt(m[2], 10),
    second: m[3] ? parseInt(m[3], 10) : 0,
  };
}

function weekdayLabel(jsWeekday: number): string {
  const key = `recurringMeetings.wd${jsWeekday}` as const;
  return t(key);
}

function firstWeeklyOnOrAfter(anchor: DateTime, jsWeekday: number, timeLocal: string): DateTime {
  const { hour, minute, second } = parseTimeLocalParts(timeLocal);
  const luxDow = jsWeekdayToLuxon(jsWeekday);
  let d = anchor.startOf('day');
  const diff = (luxDow - d.weekday + 7) % 7;
  d = d.plus({ days: diff }).set({ hour, minute, second, millisecond: 0 });
  if (d < anchor) d = d.plus({ weeks: 1 });
  return d;
}

function nextWeeklyOccurrence(meeting: RecurringMeetingSummaryInput, nowUtc: DateTime): DateTime {
  const zone = meeting.timezone;
  const zNow = nowUtc.setZone(zone);
  const { hour, minute, second } = parseTimeLocalParts(meeting.timeLocal);
  const luxDow = jsWeekdayToLuxon(meeting.weekday);
  let d = zNow.startOf('day');
  const diff = (luxDow - d.weekday + 7) % 7;
  d = d.plus({ days: diff }).set({ hour, minute, second, millisecond: 0 });
  if (d <= zNow) d = d.plus({ weeks: 1 });
  return d;
}

function nextBiweeklyOccurrence(meeting: RecurringMeetingSummaryInput, nowUtc: DateTime): DateTime {
  const zone = meeting.timezone;
  const zNow = nowUtc.setZone(zone);
  const anchor = DateTime.fromISO(meeting.createdAt, { setZone: true }).setZone(zone);
  let n = firstWeeklyOnOrAfter(anchor, meeting.weekday, meeting.timeLocal);
  while (n <= zNow) {
    n = n.plus({ weeks: 2 });
  }
  return n;
}

function dateForNthWeekdayInMonth(
  year: number,
  month: number,
  zone: string,
  luxDow: number,
  ordinal: number
): DateTime | null {
  if (ordinal === -1) {
    let d = DateTime.fromObject({ year, month, day: 1 }, { zone }).endOf('month').startOf('day');
    while (d.weekday !== luxDow) d = d.minus({ days: 1 });
    return d;
  }
  let d = DateTime.fromObject({ year, month, day: 1 }, { zone });
  const diff = (luxDow - d.weekday + 7) % 7;
  d = d.plus({ days: diff }).plus({ weeks: ordinal - 1 });
  if (d.month !== month) return null;
  return d;
}

function nextMonthlyNthOccurrence(
  meeting: RecurringMeetingSummaryInput,
  nowUtc: DateTime
): DateTime {
  const zone = meeting.timezone;
  const zNow = nowUtc.setZone(zone);
  const anchor = DateTime.fromISO(meeting.createdAt, { setZone: true }).setZone(zone);
  const luxDow = jsWeekdayToLuxon(meeting.weekday);
  const ord = meeting.monthWeekOrdinal ?? 1;
  const { hour, minute, second } = parseTimeLocalParts(meeting.timeLocal);
  let iter = anchor.startOf('month');
  for (let i = 0; i < 48; i++) {
    const day = dateForNthWeekdayInMonth(iter.year, iter.month, zone, luxDow, ord);
    if (day) {
      const dt = day.set({ hour, minute, second, millisecond: 0 });
      if (dt >= anchor && dt > zNow) return dt;
    }
    iter = iter.plus({ months: 1 });
  }
  return zNow.plus({ years: 1 });
}

/**
 * Next occurrence instant in UTC (wall clock + recurrence in `meeting.timezone`).
 * For tests, pass a fixed `nowUtc`.
 */
export function computeNextOccurrenceUtc(
  meeting: RecurringMeetingSummaryInput,
  nowUtc?: DateTime
): DateTime | null {
  const now = (nowUtc ?? DateTime.utc()).toUTC();
  if (!DateTime.now().setZone(meeting.timezone).isValid) return null;
  try {
    if (meeting.recurrenceFrequency === 'weekly') {
      return nextWeeklyOccurrence(meeting, now).toUTC();
    }
    if (meeting.recurrenceFrequency === 'biweekly') {
      return nextBiweeklyOccurrence(meeting, now).toUTC();
    }
    if (meeting.recurrenceFrequency === 'monthly_nth') {
      return nextMonthlyNthOccurrence(meeting, now).toUTC();
    }
    return null;
  } catch {
    return null;
  }
}

function recurrencePatternLabel(meeting: RecurringMeetingSummaryInput): string {
  const wd = weekdayLabel(meeting.weekday);
  if (meeting.recurrenceFrequency === 'weekly') {
    return t('recurringMeetings.patternWeekly', { weekday: wd });
  }
  if (meeting.recurrenceFrequency === 'biweekly') {
    return t('recurringMeetings.patternBiweekly', { weekday: wd });
  }
  const o = meeting.monthWeekOrdinal ?? 1;
  if (o === -1) return t('recurringMeetings.patternMonthlyLast', { weekday: wd });
  if (o === 1) return t('recurringMeetings.patternMonthly1', { weekday: wd });
  if (o === 2) return t('recurringMeetings.patternMonthly2', { weekday: wd });
  if (o === 3) return t('recurringMeetings.patternMonthly3', { weekday: wd });
  return t('recurringMeetings.patternMonthly4', { weekday: wd });
}

function formatTimeShort(dt: DateTime, locale: string): string {
  return dt.setLocale(locale).toLocaleString({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export interface RecurringMeetingSummaryLines {
  primaryLine: string;
  canonicalLine: string | null;
}

/**
 * Primary line: recurrence pattern + next time in viewer zone.
 * Canonical line: same next occurrence formatted in organizer zone (for subtitle).
 */
export function formatRecurringMeetingSummary(
  meeting: RecurringMeetingSummaryInput,
  viewerTimeZone: string
): RecurringMeetingSummaryLines {
  const locale =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : 'en';
  const nextUtc = computeNextOccurrenceUtc(meeting);
  if (!nextUtc) {
    const pattern = recurrencePatternLabel(meeting);
    return { primaryLine: pattern, canonicalLine: null };
  }
  const inOrganizer = nextUtc.setZone(meeting.timezone);
  const inViewer = nextUtc.setZone(viewerTimeZone);
  const pattern = recurrencePatternLabel(meeting);
  const timeViewer = formatTimeShort(inViewer, locale);
  const timeOrg = formatTimeShort(inOrganizer, locale);
  const primaryLine = t('recurringMeetings.summaryPrimary', { pattern, time: timeViewer });
  const zoneShort = inOrganizer.offsetNameShort ?? meeting.timezone;
  const canonicalLine = t('recurringMeetings.canonicalLine', {
    time: timeOrg,
    zone: zoneShort,
  });
  return { primaryLine, canonicalLine };
}
