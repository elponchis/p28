import { t } from '@/lib/i18n';

export function formatRelativeTime(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMins < 1) return t('common.justNow');
  if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
  if (diffDays < 30) return t('common.daysAgo', { count: diffDays });
  if (diffMonths < 12) return t('common.monthsAgo', { count: diffMonths });
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(d);
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Sent-time clock (hour + minute) using device locale (12h or 24h per locale). */
const messageSentClockFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatMessageSentClockTime(isoDate: string): string {
  return messageSentClockFormatter.format(new Date(isoDate));
}

const messageSentDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const messageSentDateTimeWithYearFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Sent date + clock time, for threads that have no day separators and so cannot
 * rely on position to say when something was posted.
 *
 * The year is only shown when it is not the current one, so this year's replies
 * stay short and older ones are still unambiguous.
 */
export function formatMessageSentDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const formatter =
    d.getFullYear() === new Date().getFullYear()
      ? messageSentDateTimeFormatter
      : messageSentDateTimeWithYearFormatter;
  return formatter.format(d);
}

/** Local calendar minute bucket for grouping consecutive message timestamps. */
export function messageLocalMinuteKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

const dateHeaderFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function formatMessageTime(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return formatRelativeTime(isoDate);
  }
  return timeFormatter.format(d);
}

export function formatDateHeader(isoDate: string): string {
  return dateHeaderFormatter.format(new Date(isoDate)).toUpperCase();
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

const eventDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Localized date + time for group events (RSVP, detail screens). */
export function formatGroupEventDateTime(isoDate: string): string {
  return eventDateTimeFormatter.format(new Date(isoDate));
}

const eventListMonthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });

/** Month abbreviation + day-of-month for event list rows (e.g. Stitch “Latest Updates”). */
export function formatGroupEventCalendarBlock(isoDate: string): { month: string; day: string } {
  const d = new Date(isoDate);
  return {
    month: eventListMonthFormatter.format(d),
    day: String(d.getDate()),
  };
}

/** True when the event start time is on or before now (events have no separate end time in the model). */
export function isGroupEventPast(startsAt: string): boolean {
  return new Date(startsAt).getTime() <= Date.now();
}

/** True when the event's linked discussion should be read-only (cancelled events only; past events stay open). */
export function isGroupEventDiscussionReadOnly(event: {
  status: 'active' | 'cancelled';
  startsAt?: string;
}): boolean {
  return event.status === 'cancelled';
}

/**
 * The value an <input type="datetime-local"> expects: YYYY-MM-DDTHH:mm in *local* time.
 *
 * Not toISOString().slice(0, 16) — that is UTC, and would show a Seoul evening as the same
 * afternoon. Shared because every form that takes a date and time needs it on web, and the
 * copy that lived beside one field was about to become the copy beside three.
 */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * A date typed as YYYY-MM-DD, and a real one — 2026-02-31 parses but is not a day.
 *
 * Typed dates decide who may watch what and until when, so the check is shared rather than
 * rewritten beside each field that takes one.
 */
export function isIsoDate(value: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}
