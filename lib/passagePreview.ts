/**
 * How much of a devotion passage the card shows before you ask for the rest.
 *
 * A leader sets several verses at a time, so the navy plate grew into most of the screen on a
 * desktop window. Collapsed, it shows the first verse; the rest is behind the expander.
 */

/** A verse starts where a line begins with its number, the way the passages are stored. */
const VERSE_START = /^\s*\d+\s/;

export interface PassagePreview {
  /** The first verse, or the opening paragraph when the text carries no verse numbers. */
  preview: string;
  /** Whether anything was left out — i.e. whether the expander is worth showing. */
  hasMore: boolean;
}

export function passagePreview(passage: string): PassagePreview {
  const text = (passage ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return { preview: '', hasMore: false };

  const lines = text.split('\n');
  // Where does the second verse begin? Everything before it is the first.
  let cut = -1;
  for (let i = 1; i < lines.length; i++) {
    if (VERSE_START.test(lines[i])) {
      cut = i;
      break;
    }
  }

  if (cut === -1) {
    // No numbering to go by: the first paragraph stands in, and a blank line marks its end.
    const blank = lines.findIndex((l, i) => i > 0 && l.trim() === '');
    if (blank === -1) return { preview: text, hasMore: false };
    const preview = lines.slice(0, blank).join('\n').trim();
    return { preview, hasMore: preview.length < text.length };
  }

  const preview = lines.slice(0, cut).join('\n').trim();
  return { preview, hasMore: preview.length < text.length };
}
