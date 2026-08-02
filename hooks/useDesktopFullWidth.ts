import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';

import { breakpoints } from '@/theme/tokens';

// react-native-web supports CSS position:fixed; core RN's ViewStyle type doesn't model it.
const FULL_WIDTH_ESCAPE_STYLE = {
  flex: 1,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as unknown as ViewStyle;
const NORMAL_STYLE: ViewStyle = { flex: 1 };

/**
 * Escapes app/+html.tsx's phone-width cap (`#root { max-width: 560px }`) on desktop web
 * so a route branch can render full-bleed instead of centered in the phone frame. No-op
 * on native or narrow/mobile web, where it returns the normal `{ flex: 1 }` layout.
 */
export function useDesktopFullWidth(minWidth: number = breakpoints.desktop) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= minWidth;
  return { isDesktop, style: isDesktop ? FULL_WIDTH_ESCAPE_STYLE : NORMAL_STYLE };
}
