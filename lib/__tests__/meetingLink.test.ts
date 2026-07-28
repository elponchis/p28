import { MEETING_LINK_MAX_LENGTH, parseMeetingLinkInput } from '@/lib/meetingLink';

describe('parseMeetingLinkInput', () => {
  it('accepts empty', () => {
    expect(parseMeetingLinkInput('')).toEqual({ ok: true, value: '' });
    expect(parseMeetingLinkInput('  ')).toEqual({ ok: true, value: '' });
  });

  it('normalizes host-only to https', () => {
    expect(parseMeetingLinkInput('meet.google.com/abc-def')).toEqual({
      ok: true,
      value: 'https://meet.google.com/abc-def',
    });
  });

  it('preserves https and http', () => {
    expect(parseMeetingLinkInput('https://zoom.us/j/123')).toEqual({
      ok: true,
      value: 'https://zoom.us/j/123',
    });
    const httpResult = parseMeetingLinkInput('http://example.com');
    expect(httpResult.ok).toBe(true);
    if (httpResult.ok) {
      expect(httpResult.value.startsWith('http://example.com')).toBe(true);
    }
  });

  it('rejects invalid URLs', () => {
    expect(parseMeetingLinkInput('not a url')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMeetingLinkInput('ftp://x.com')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects too long', () => {
    const long = 'x'.repeat(MEETING_LINK_MAX_LENGTH + 1);
    expect(parseMeetingLinkInput(long)).toEqual({ ok: false, reason: 'too_long' });
  });
});
