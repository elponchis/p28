/**
 * Pads a list so its last row is full.
 *
 * A grid built on FlatList lets the last row's cells grow into the space the missing ones would
 * have taken, so two items on a four-wide row come out as two half-width cards. The padding is
 * rendered as empty cells, which keeps every card the size of every other one.
 */
export function padToGrid<T>(items: T[], columns: number): (T | null)[] {
  if (columns <= 1 || items.length === 0) return items;
  const missing = (columns - (items.length % columns)) % columns;
  return missing === 0 ? items : [...items, ...Array.from({ length: missing }, () => null)];
}
