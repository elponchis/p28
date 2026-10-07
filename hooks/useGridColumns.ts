import { Platform, useWindowDimensions } from 'react-native';

import { SIDEBAR_WIDTH } from '@/components/navigation/DesktopSidebar';
import { breakpoints, spacing, tabScreenContent } from '@/theme/tokens';

/** Four across is as far as a row goes; past that the cards are too small to read at a glance. */
export const MAX_GRID_COLUMNS = 4;

/**
 * How many cards of at least `minWidth` fit on a row, once the desktop sidebar and the page
 * gutters have taken their share.
 *
 * One column on native, where the screen is a phone's and a grid would only shrink the type.
 */
export function useGridColumns(
  minWidth: number,
  gap: number = spacing.md,
  maxColumns: number = MAX_GRID_COLUMNS
): number {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 1;
  const sidebar = width >= breakpoints.sidebar ? SIDEBAR_WIDTH : 0;
  const content =
    Math.min(width - sidebar, tabScreenContent.maxWidth) - spacing.screenHorizontal * 2;
  const fits = Math.floor((content + gap) / (minWidth + gap));
  return Math.min(maxColumns, Math.max(1, fits));
}
