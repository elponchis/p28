/**
 * The Edge Function's notification rule, tested here because there is nowhere in supabase/ to run
 * a test from. The module it imports is pure TypeScript with no Deno APIs, for exactly this.
 */
import {
  RENOTIFY_AFTER_MS,
  shouldNotifyForMessage,
} from '@/supabase/functions/_shared/notify-window';

const MINUTE = 60 * 1000;
const now = Date.parse('2026-09-08T12:00:00Z');

describe('shouldNotifyForMessage', () => {
  it('notifies when the recipient has nothing unread', () => {
    expect(
      shouldNotifyForMessage({ sentAt: now, readAt: now - MINUTE, priorMessageTimes: [] })
    ).toBe(true);
  });

  it('stays quiet for the rest of a burst', () => {
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - 10 * MINUTE,
        priorMessageTimes: [now - 4000, now - 9000],
      })
    ).toBe(false);
  });

  it('notifies again once the conversation has been quiet', () => {
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - 60 * MINUTE,
        priorMessageTimes: [now - RENOTIFY_AFTER_MS - 1],
      })
    ).toBe(true);
  });

  it('measures the gap from the newest unread message, not the oldest', () => {
    // An hour-old unread message would allow a notification; a recent one must still suppress it.
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - 120 * MINUTE,
        priorMessageTimes: [now - 60 * MINUTE, now - MINUTE],
      })
    ).toBe(false);
  });

  it('ignores messages the recipient has already read', () => {
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - MINUTE,
        priorMessageTimes: [now - 30 * MINUTE, now - 20 * MINUTE],
      })
    ).toBe(true);
  });

  it('ignores messages sent after the one being delivered', () => {
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - 30 * MINUTE,
        priorMessageTimes: [now + MINUTE],
      })
    ).toBe(true);
  });

  it('treats the window boundary as long enough', () => {
    expect(
      shouldNotifyForMessage({
        sentAt: now,
        readAt: now - 60 * MINUTE,
        priorMessageTimes: [now - RENOTIFY_AFTER_MS],
      })
    ).toBe(true);
  });

  it('refuses a message with no sane timestamp rather than guessing', () => {
    expect(shouldNotifyForMessage({ sentAt: Number.NaN, readAt: 0, priorMessageTimes: [] })).toBe(
      false
    );
  });
});
