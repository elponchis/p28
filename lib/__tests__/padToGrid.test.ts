import { padToGrid } from '@/lib/padToGrid';

describe('padToGrid', () => {
  it('fills the last row so the cards keep their size', () => {
    expect(padToGrid([1, 2], 4)).toEqual([1, 2, null, null]);
  });

  it('leaves a full row alone', () => {
    expect(padToGrid([1, 2, 3, 4], 4)).toEqual([1, 2, 3, 4]);
    expect(padToGrid([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('pads only what the last row is missing', () => {
    expect(padToGrid([1, 2, 3, 4, 5], 4)).toEqual([1, 2, 3, 4, 5, null, null, null]);
  });

  it('does nothing in a single column, where a card is the row', () => {
    expect(padToGrid([1, 2], 1)).toEqual([1, 2]);
  });

  it('leaves an empty list empty, so the empty state still shows', () => {
    expect(padToGrid([], 4)).toEqual([]);
  });
});
