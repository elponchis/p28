import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors } from '@/theme/tokens';

export interface StackHeaderBackProps {
  iconColor?: string;
  /** Defaults to `common.navigateBackHint` */
  accessibilityHint?: string;
  /** When `router.canGoBack()` is false, navigate here instead of no-op (e.g. cold open). */
  fallbackHref?: Href;
}

/**
 * Explicit stack back control using `router.back()`. The native stack back
 * button can fail when the previous screen hid its header (e.g. tab roots).
 */
export function StackHeaderBack({
  iconColor = colors.primary,
  accessibilityHint,
  fallbackHref,
}: StackHeaderBackProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else if (fallbackHref !== undefined) {
          router.replace(fallbackHref);
        }
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
      accessibilityLabel={t('common.back')}
      accessibilityHint={accessibilityHint ?? t('common.navigateBackHint')}
      accessibilityRole="button"
    >
      <Ionicons name="chevron-back" size={22} color={iconColor} />
    </Pressable>
  );
}
