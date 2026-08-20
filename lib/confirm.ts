/**
 * Cross-platform confirmation dialog.
 *
 * `Alert.alert` is a no-op on react-native-web (its Alert export is an empty
 * stub), so any flow gated behind a confirm silently does nothing in the web
 * build. This helper falls back to `window.confirm` there.
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

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const { title, message, confirmLabel, cancelLabel, destructive } = options;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
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
