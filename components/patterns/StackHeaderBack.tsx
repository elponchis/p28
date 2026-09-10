import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors } from '@/theme/tokens';

export interface StackHeaderBackProps {
  iconColor?: string;
  /** Defaults to `common.navigateBackHint` */
  accessibilityHint?: string;
  /** When `router.canGoBack()` is false, navigate here instead of no-op (e.g. cold open). */
  fallbackHref?: Href;
  /**
   * Always return HERE rather than to whatever is underneath. Use it on a screen that has one
   * sensible parent: back should mean "up to that screen", not "undo my last navigation", and
   * router.back() cannot tell the difference -- from a chat's media tab it can land the user
   * on the home tab.
   */
  returnTo?: Href;
  /**
   * Draw the chevron on a translucent dark disc.
   *
   * For a transparent header floating over content: the icon has to survive whatever scrolls
   * under it, and a bare white chevron disappears the moment a pale section arrives.
   */
  onScrim?: boolean;
}

/**
 * Explicit stack back control using `router.back()`. The native stack back
 * button can fail when the previous screen hid its header (e.g. tab roots).
 */
export function StackHeaderBack({
  iconColor = colors.primary,
  accessibilityHint,
  fallbackHref,
  returnTo,
  onScrim = false,
}: StackHeaderBackProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        if (returnTo !== undefined) {
          // Pops to it when it is in the stack, replaces this screen with it when it is not.
          router.dismissTo(returnTo);
          return;
        }
        if (router.canGoBack()) {
          router.back();
        } else if (fallbackHref !== undefined) {
          router.replace(fallbackHref);
        }
      }}
      style={({ pressed }) => [styles.button, onScrim && styles.scrim, pressed && styles.pressed]}
      accessibilityLabel={t('common.back')}
      accessibilityHint={accessibilityHint ?? t('common.navigateBackHint')}
      accessibilityRole="button"
    >
      <Ionicons name="chevron-back" size={22} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  scrim: {
    // Sized to the 22px icon plus its padding, so the disc is a circle rather than a lozenge.
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    // Dark enough for a white chevron to read against a white page, light enough not to blot
    // out the hero photograph it sits on at the top of the screen.
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
});
