/**
 * Cross-platform dialogs.
 *
 * `Alert.alert` is a no-op on react-native-web (its Alert export is an empty
 * stub), so any flow gated behind a dialog silently does nothing in the web
 * build. These helpers fall back to `window.confirm` / `window.alert` there.
 */
import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Styles the confirm action as destructive on native. */
  destructive?: boolean;
}

export interface NotifyOptions {
  title: string;
  message?: string;
  /** Dismiss button label. Defaults to the platform default on native. */
  dismissLabel?: string;
}

function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const { title, message, confirmLabel, cancelLabel, destructive } = options;

  if (isWeb()) {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }
    // `window.confirm` has no separate title slot, so passing both repeats the
    // action name back at the user ("Sign out / Sign out?").
    return Promise.resolve(window.confirm(message ?? title));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Shows a message the user only has to acknowledge. Resolves once dismissed, so
 * callers can sequence work after it (e.g. sign out, then navigate).
 */
export function notify(options: NotifyOptions): Promise<void> {
  const { title, message, dismissLabel } = options;

  if (isWeb()) {
    if (typeof window === 'undefined' || typeof window.alert !== 'function') {
      return Promise.resolve();
    }
    // Same reasoning as `confirm`: one text slot, so avoid repeating the title.
    window.alert(message ?? title);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    Alert.alert(
      title,
      message,
      dismissLabel ? [{ text: dismissLabel, onPress: () => resolve() }] : undefined,
      { cancelable: true, onDismiss: () => resolve() }
    );
    if (!dismissLabel) {
      // Without a buttons array RN renders a default OK button that has no
      // onPress, so `onDismiss` above is the only resolution path on Android
      // and iOS never fires it — resolve immediately since nothing is queued
      // behind a plain acknowledgement.
      resolve();
    }
  });
}
