import { MAX_ASSIGNMENT_SCORE, parseMaxScoreInput, parseScoreInput } from '@/lib/assignmentScore';

describe('parseScoreInput', () => {
  it('accepts a score inside the range', () => {
    expect(parseScoreInput('87', 100)).toEqual({ ok: true, score: 87 });
  });

  it('treats blank as not marked yet, rather than as an error', () => {
    expect(parseScoreInput('', 100)).toEqual({ ok: true, score: null });
    expect(parseScoreInput('   ', 100)).toEqual({ ok: true, score: null });
  });

  it('allows both ends of the range', () => {
    expect(parseScoreInput('0', 20)).toEqual({ ok: true, score: 0 });
    expect(parseScoreInput('20', 20)).toEqual({ ok: true, score: 20 });
  });

  it('refuses a score above what the assignment is out of', () => {
    // The reported bug: this was stored and displayed as "Reviewed · 10000000".
    expect(parseScoreInput('10000000', 100)).toEqual({ ok: false, reason: 'above_max' });
    expect(parseScoreInput('21', 20)).toEqual({ ok: false, reason: 'above_max' });
  });

  it('refuses a negative score', () => {
    expect(parseScoreInput('-1', 100)).toEqual({ ok: false, reason: 'negative' });
  });

  it('refuses anything that is not a whole number', () => {
    for (const raw of ['abc', '1e3', '12.5', '0x10', '1 2', '+']) {
      expect(parseScoreInput(raw, 100).ok).toBe(false);
    }
  });
});

describe('parseMaxScoreInput', () => {
  it('accepts a whole number of points', () => {
    expect(parseMaxScoreInput('20')).toEqual({ ok: true, maxScore: 20 });
  });

  it('refuses zero, negatives and fractions — an assignment out of nothing is not one', () => {
    for (const raw of ['0', '-5', '2.5', '', 'ten']) {
      expect(parseMaxScoreInput(raw).ok).toBe(false);
    }
  });

  it('refuses a ceiling the database would reject anyway', () => {
    expect(parseMaxScoreInput(String(MAX_ASSIGNMENT_SCORE)).ok).toBe(true);
    expect(parseMaxScoreInput(String(MAX_ASSIGNMENT_SCORE + 1)).ok).toBe(false);
  });
});
