import type { DevotionShare } from '@/lib/api';
import {
  DEVOTION_QUESTIONS,
  DEVOTION_QUESTION_KEYS,
  devotionTotals,
  groupThreadsByQuestion,
  localDateKey,
  threadDevotionShares,
  validateShareBody,
} from '@/lib/devotion';

function share(
  partial: Partial<DevotionShare> & Pick<DevotionShare, 'id' | 'createdAt'>
): DevotionShare {
  return {
    devotionId: 'd',
    userId: 'u',
    parentShareId: null,
    question: 'lesson',
    body: 'body',
    heartCount: 0,
    heartedByMe: false,
    ...partial,
  };
}

describe('DEVOTION_QUESTIONS', () => {
  it('lists the four prompts in tab order, each with a tab label and a question', () => {
    expect(DEVOTION_QUESTIONS).toEqual(['who_is_god', 'lesson', 'application', 'prayer']);
    for (const q of DEVOTION_QUESTIONS) {
      expect(DEVOTION_QUESTION_KEYS[q].tab).toMatch(/^devotion\.tab/);
      expect(DEVOTION_QUESTION_KEYS[q].question).toMatch(/^devotion\.question/);
    }
  });
});

describe('localDateKey', () => {
  it('uses the local calendar day, zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('validateShareBody', () => {
  it('rejects empty and whitespace-only answers', () => {
    expect(validateShareBody('')).toBe('empty');
    expect(validateShareBody('   \n ')).toBe('empty');
  });

  it('accepts one short line and rejects past the limit', () => {
    expect(validateShareBody('감사합니다')).toBeNull();
    expect(validateShareBody('가'.repeat(2000))).toBeNull();
    expect(validateShareBody('가'.repeat(2001))).toBe('tooLong');
  });
});

describe('threadDevotionShares', () => {
  const shares = [
    share({ id: 'a1', createdAt: '2026-09-18T01:00:00Z' }),
    share({ id: 'a2', createdAt: '2026-09-18T02:00:00Z' }),
    share({ id: 'r2', createdAt: '2026-09-18T04:00:00Z', parentShareId: 'a1', question: null }),
    share({ id: 'r1', createdAt: '2026-09-18T03:00:00Z', parentShareId: 'a1', question: null }),
    share({
      id: 'orphan',
      createdAt: '2026-09-18T05:00:00Z',
      parentShareId: 'gone',
      question: null,
    }),
  ];

  it('puts the newest answer first and replies under their answer, oldest first', () => {
    const threads = threadDevotionShares(shares);
    expect(threads.map((t) => t.share.id)).toEqual(['a2', 'a1']);
    expect(threads[1].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(threads[0].replies).toEqual([]);
  });

  it('drops replies whose answer is gone', () => {
    const ids = threadDevotionShares(shares).flatMap((t) => [
      t.share.id,
      ...t.replies.map((r) => r.id),
    ]);
    expect(ids).not.toContain('orphan');
  });
});

describe('devotionTotals', () => {
  it('sums hearts over every share and counts every answer and reply as a comment', () => {
    expect(
      devotionTotals([
        share({ id: 'a', createdAt: '1', heartCount: 2 }),
        share({ id: 'b', createdAt: '2', heartCount: 1, parentShareId: 'a', question: null }),
      ])
    ).toEqual({ hearts: 3, comments: 2 });
    expect(devotionTotals([])).toEqual({ hearts: 0, comments: 0 });
  });
});

describe('groupThreadsByQuestion', () => {
  it('gives every prompt its own list in tab order, counting answers and replies', () => {
    const threads = threadDevotionShares([
      share({ id: 'l1', createdAt: '1', question: 'lesson' }),
      share({ id: 'p1', createdAt: '2', question: 'prayer' }),
      share({ id: 'l2', createdAt: '3', question: 'lesson' }),
      share({ id: 'r', createdAt: '4', question: null, parentShareId: 'l1' }),
    ]);
    const groups = groupThreadsByQuestion(threads);
    expect(groups.map((g) => g.question)).toEqual([
      'who_is_god',
      'lesson',
      'application',
      'prayer',
    ]);
    expect(groups.map((g) => g.count)).toEqual([0, 3, 0, 1]);
    expect(groups[1].threads.map((th) => th.share.id)).toEqual(['l2', 'l1']);
  });
});
