/**
 * How many course cards fit across the Watch shelf, and how wide each one is.
 *
 * The cards were a fixed 220px inside the 720px column every tab shares. That column is right for
 * a feed you read, and wrong for a wall of thumbnails: on a desktop it left two cards adrift in
 * the middle of the screen with the rest of the width empty. So the shelf measures itself and
 * fills what it is given — two across on a phone, five on a desktop.
 *
 * Five is the ceiling on purpose. A training school is five courses, so its shelf is one row, and
 * past five the thumbnails get too small to tell apart.
 */

/** Card counts by container width; the first row wide enough wins. */
const BREAKPOINTS: readonly { minWidth: number; columns: number }[] = [
  { minWidth: 1040, columns: 5 },
  { minWidth: 760, columns: 4 },
  { minWidth: 520, columns: 3 },
];

/** Two, until the shelf has been measured — a phone's answer, and the safe one to render first. */
export const DEFAULT_COLUMNS = 2;

export function watchGridColumns(containerWidth: number): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return DEFAULT_COLUMNS;
  return BREAKPOINTS.find((b) => containerWidth >= b.minWidth)?.columns ?? DEFAULT_COLUMNS;
}

/**
 * The width of one card, gaps taken out first. Floored, because a fractional pixel over the
 * container is a column that wraps and leaves a row of one.
 */
export function watchCardWidth(containerWidth: number, gap: number): number | undefined {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return undefined;
  const columns = watchGridColumns(containerWidth);
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}
