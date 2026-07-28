/**
 * First letter for avatar fallback when there is no image.
 * Skips leading non-letters (e.g. quotes); returns "" if there is no usable text (never "?").
 */
export function avatarFallbackInitial(name: string | undefined | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';
  const letterMatch = trimmed.match(/\p{L}/u);
  if (letterMatch) {
    return letterMatch[0].toLocaleUpperCase();
  }
  const ch = trimmed.charAt(0);
  return ch ? ch.toLocaleUpperCase() : '';
}
