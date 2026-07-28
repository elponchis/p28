/**
 * Allowed IANA timezones for recurring ministry meetings (product-limited for now).
 * Vancouver = `America/Vancouver`; Seoul = `Asia/Seoul`; Phnom Penh = `Asia/Phnom_Penh`.
 */
export const RECURRING_MEETING_TIMEZONE_IDS = [
  'America/Vancouver',
  'Asia/Seoul',
  'Asia/Phnom_Penh',
] as const;

export type RecurringMeetingTimezoneId = (typeof RECURRING_MEETING_TIMEZONE_IDS)[number];

const ALLOWED_SET = new Set<string>(RECURRING_MEETING_TIMEZONE_IDS);

/** Timezone picker options for the recurring-meeting form (fixed list). */
export function getRecurringMeetingTimeZones(): string[] {
  return [...RECURRING_MEETING_TIMEZONE_IDS];
}

export function isAllowedRecurringMeetingTimeZone(tz: string): boolean {
  return ALLOWED_SET.has(tz.trim());
}

/** Default when creating: device zone if allowed, otherwise Vancouver. */
export function defaultRecurringMeetingTimeZone(): string {
  try {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (device && ALLOWED_SET.has(device)) return device;
  } catch {
    /* ignore */
  }
  return 'America/Vancouver';
}
