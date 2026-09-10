/**
 * What a grader is allowed to type into the score box.
 *
 * A submission's score used to be a bare integer with nothing to be out of, so 10000000 was a
 * valid mark. The bound belongs to the assignment, and the database enforces it — this is the
 * same rule stated where the grader can be told about it before the save fails.
 */

/** The largest an assignment may be out of. Matches assignments_max_score_check. */
export const MAX_ASSIGNMENT_SCORE = 100000;

export type ScoreParse =
  | { ok: true; score: number | null }
  | { ok: false; reason: 'not_a_number' | 'negative' | 'above_max' };

/**
 * Parses the score box. Blank is a real answer — it means "not marked yet" — and is why this
 * returns `score: null` rather than refusing.
 */
export function parseScoreInput(raw: string, maxScore: number): ScoreParse {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, score: null };

  // Number() would accept '1e3', ' 12 ' and '0x10'; a score is digits, optionally signed.
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, reason: 'not_a_number' };

  const value = Number(trimmed);
  if (value < 0) return { ok: false, reason: 'negative' };
  if (value > maxScore) return { ok: false, reason: 'above_max' };
  return { ok: true, score: value };
}

/** What an assignment may be out of: a whole number, at least 1, and not absurd. */
export function parseMaxScoreInput(raw: string): { ok: true; maxScore: number } | { ok: false } {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (value < 1 || value > MAX_ASSIGNMENT_SCORE) return { ok: false };
  return { ok: true, maxScore: value };
}
