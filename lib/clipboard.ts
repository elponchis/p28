/**
 * Copying message text to the clipboard.
 *
 * Deliberately no new dependency: `expo-clipboard` carries native code, so adding it would
 * force everyone onto a fresh dev-client build for what is one string write. React Native
 * still ships `Clipboard` in core (deprecated, warns once) and react-native-web ships its
 * own implementation, so both platforms are already covered by what is installed.
 *
 * On web the async Clipboard API is preferred when available — it is the only path that
 * works without a synchronous user-gesture hack — and the react-native-web module is the
 * fallback for browsers or contexts (non-HTTPS, older Safari) where it is missing.
 */
import { Clipboard, Platform } from 'react-native';

/** Writes `text` to the clipboard. Returns false when no clipboard path was available. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.clipboard?.writeText) {
      try {
        await nav.clipboard.writeText(text);
        return true;
      } catch {
        // Permission denied or insecure context — fall through to the RNW implementation.
      }
    }
  }

  try {
    Clipboard.setString(text);
    return true;
  } catch (e) {
    console.warn('[clipboard] copy failed', e);
    return false;
  }
}
