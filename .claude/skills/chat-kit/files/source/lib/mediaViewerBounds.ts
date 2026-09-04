import { breakpoints } from '@/theme/tokens';

/**
 * Full-bleed video/image/file viewer modals look right on a phone (edge-to-edge),
 * but stretch awkwardly across a desktop browser window. Past the desktop
 * breakpoint, bound the viewer to a centered "theater" box instead.
 */
export function getMediaViewerSize(
  windowWidth: number,
  windowHeight: number
): { width: number; height: number } {
  if (windowWidth < breakpoints.desktop) {
    return { width: windowWidth, height: windowHeight };
  }
  return {
    width: Math.min(windowWidth * 0.9, 960),
    height: windowHeight * 0.85,
  };
}
