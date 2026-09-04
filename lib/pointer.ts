/**
 * Whether this is a browser being driven by a mouse.
 *
 * `Platform.OS === 'web'` is true on a phone browser too, and several chat affordances were built
 * on that alone: the hover toolbar beside each message, and selectable message text. Both are
 * wrong on touch. The toolbar crowds six controls onto a screen with no room for them and can
 * only be reached by a tap the browser translates into a hover; selectable text hands the long
 * press to the browser's own selection callout, which swallows the gesture that should have
 * opened the actions sheet. Touch has the sheet, which has room to label what it offers.
 *
 * Resolved on first use rather than at import, because a static export evaluates modules where
 * there is no window; cached afterwards, since a device does not grow a mouse mid-session.
 */
import { Platform } from 'react-native';

let cached: boolean | null = null;

export function isDesktopWebPointer(): boolean {
  if (cached !== null) return cached;
  cached =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches;
  return cached;
}

/** Tests only: forget what was resolved, so a different environment can be simulated. */
export function resetDesktopWebPointerCache(): void {
  cached = null;
}
