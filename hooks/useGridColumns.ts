import { Platform, useWindowDimensions } from 'react-native';

import { SIDEBAR_WIDTH } from '@/components/navigation/DesktopSidebar';
import { breakpoints, spacing, tabScreenContent } from '@/theme/tokens';

/**
 * How many cards of at least `minWidth` fit on a row, once the desktop sidebar and the page
 * gutters have taken their share.
 *
 * One column on native, where the screen is a phone's and a grid would only shrink the type.
 */
export function useGridColumns(minWidth: number, gap: number = spacing.md): number {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 1;
  const sidebar = width >= breakpoints.sidebar ? SIDEBAR_WIDTH : 0;
  const content =
    Math.min(width - sidebar, tabScreenContent.maxWidth) - spacing.screenHorizontal * 2;
  return Math.max(1, Math.floor((content + gap) / (minWidth + gap)));
}
