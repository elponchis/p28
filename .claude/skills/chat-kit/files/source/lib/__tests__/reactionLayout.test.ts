import { reactionRowMetrics, splitVisibleReactions } from '@/lib/reactionLayout';

const WIDE = 1440;
const NARROW = 390;

describe('reactionRowMetrics', () => {
  it('gives a wide window larger emoji and more of them', () => {
    const m = reactionRowMetrics(WIDE);
    expect(m.emojiSize).toBe(21);
    expect(m.maxVisible).toBe(10);
  });

  it('gives a narrow one smaller emoji and fewer', () => {
    const m = reactionRowMetrics(NARROW);
    expect(m.emojiSize).toBe(14);
    expect(m.maxVisible).toBe(4);
  });

  it('treats a desktop window dragged narrow as narrow, since space is what it decides', () => {
    expect(reactionRowMetrics(639)).toEqual(reactionRowMetrics(NARROW));
    expect(reactionRowMetrics(640)).toEqual(reactionRowMetrics(WIDE));
  });

  it('hangs a badge row less than its own height, so it straddles rather than clears', () => {
    for (const w of [WIDE, NARROW]) {
      const m = reactionRowMetrics(w);
      expect(m.overhang).toBeGreaterThan(0);
      expect(m.overhang).toBeLessThan(m.badgeHeight);
    }
  });
});

describe('splitVisibleReactions', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => `r${i}`);

  it('shows everything when everything fits', () => {
    const { visible, hidden } = splitVisibleReactions(['a', 'b'], reactionRowMetrics(WIDE));
    expect(visible).toEqual(['a', 'b']);
    expect(hidden).toBe(0);
  });

  it('counts exactly what it left out', () => {
    const wide = splitVisibleReactions(twelve, reactionRowMetrics(WIDE));
    expect(wide.visible).toHaveLength(10);
    expect(wide.hidden).toBe(2);

    const narrow = splitVisibleReactions(twelve, reactionRowMetrics(NARROW));
    expect(narrow.visible).toHaveLength(4);
    expect(narrow.hidden).toBe(8);
  });

  it('never reports a negative remainder', () => {
    expect(splitVisibleReactions([], reactionRowMetrics(NARROW)).hidden).toBe(0);
  });
});
