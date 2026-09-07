import { DEFAULT_COLUMNS, watchCardWidth, watchGridColumns } from '@/lib/watchGrid';

describe('watchGridColumns', () => {
  it('puts two across on a phone', () => {
    expect(watchGridColumns(360)).toBe(2);
    expect(watchGridColumns(414)).toBe(2);
  });

  it('puts five across on a desktop', () => {
    expect(watchGridColumns(1040)).toBe(5);
    expect(watchGridColumns(1600)).toBe(5);
  });

  it('steps through three and four in between', () => {
    expect(watchGridColumns(520)).toBe(3);
    expect(watchGridColumns(759)).toBe(3);
    expect(watchGridColumns(760)).toBe(4);
    expect(watchGridColumns(1039)).toBe(4);
  });

  it('never goes past five, however wide the screen', () => {
    expect(watchGridColumns(4000)).toBe(5);
  });

  it('falls back to a phone layout when it has not been measured', () => {
    expect(watchGridColumns(0)).toBe(DEFAULT_COLUMNS);
    expect(watchGridColumns(-10)).toBe(DEFAULT_COLUMNS);
    expect(watchGridColumns(Number.NaN)).toBe(DEFAULT_COLUMNS);
  });
});

describe('watchCardWidth', () => {
  it('divides the row up, gaps taken out first', () => {
    // 1200 wide, five columns, four 16px gaps -> (1200 - 64) / 5
    expect(watchCardWidth(1200, 16)).toBe(227);
  });

  it('leaves the cards at their own width until the shelf is measured', () => {
    expect(watchCardWidth(0, 16)).toBeUndefined();
  });

  it('never overflows the row it was given', () => {
    for (const width of [321, 517, 733, 1041, 1287, 1919]) {
      const columns = watchGridColumns(width);
      const card = watchCardWidth(width, 16) as number;
      expect(card * columns + 16 * (columns - 1)).toBeLessThanOrEqual(width);
    }
  });
});
