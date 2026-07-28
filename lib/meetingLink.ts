/** Max length stored for meeting_link (matches app validation). */
export const MEETING_LINK_MAX_LENGTH = 2048;

export type MeetingLinkParseResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'invalid' | 'too_long' };

/**
 * Normalizes optional meeting URL: trims, adds https if missing, validates http(s).
 * Empty input is allowed.
 */
export function parseMeetingLinkInput(raw: string): MeetingLinkParseResult {
  const t = raw.trim();
  if (!t) return { ok: true, value: '' };
  if (t.length > MEETING_LINK_MAX_LENGTH) return { ok: false, reason: 'too_long' };
  let u = t;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    u = `https://${u}`;
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, value: u };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
