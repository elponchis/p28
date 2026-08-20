import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';

import { breakpoints } from '@/theme/tokens';

const NORMAL_STYLE: ViewStyle = { flex: 1 };

/**
 * Reports whether the viewport is desktop-width on web, for branches that lay out
 * differently there (e.g. sidebar vs. tab bar).
 *
 * `style` is plain `{ flex: 1 }` on every platform and width. It used to return a
 * `position: fixed` inset-0 escape hatch on desktop, to break out of the phone-width
 * cap (`#root { max-width: 560px }`) that app/+html.tsx applied before React hydrated.
 * That CSS was removed, so the escape had nothing left to escape — and taking the
 * branch out of normal flow pinned it to the viewport top, sliding the first ~64px
 * of every screen underneath the navigation header.
 */
export function useDesktopFullWidth(minWidth: number = breakpoints.desktop) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= minWidth;
  return { isDesktop, style: NORMAL_STYLE };
}
