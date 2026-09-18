/**
 * 오늘의 묵상 (daily devotion): the prompt order, the day a devotion belongs to, and how a flat
 * list of answers and replies becomes threads and totals.
 */
import type { DevotionQuestion, DevotionShare } from '@/lib/api';

/** The four prompts, in the order the tabs show them. */
export const DEVOTION_QUESTIONS: readonly DevotionQuestion[] = [
  'who_is_god',
  'lesson',
  'application',
  'prayer',
];

/** i18n keys for each prompt's short tab label and full question. */
export const DEVOTION_QUESTION_KEYS: Record<DevotionQuestion, { tab: string; question: string }> = {
  who_is_god: { tab: 'devotion.tabWhoIsGod', question: 'devotion.questionWhoIsGod' },
  lesson: { tab: 'devotion.tabLesson', question: 'devotion.questionLesson' },
  application: { tab: 'devotion.tabApplication', question: 'devotion.questionApplication' },
  prayer: { tab: 'devotion.tabPrayer', question: 'devotion.questionPrayer' },
};

export const DEVOTION_BODY_MAX = 2000;

/**
 * The viewer's local calendar day as YYYY-MM-DD. A devotion is "today's" in the reader's day, not
 * the server's UTC one, which in Korea would change at 9am.
 */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type ShareBodyError = 'empty' | 'tooLong';

/** Whitespace-only counts as empty: a share has to say something. */
export function validateShareBody(body: string): ShareBodyError | null {
  const trimmed = body.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length > DEVOTION_BODY_MAX) return 'tooLong';
  return null;
}

export interface DevotionThread {
  share: DevotionShare;
  /** Oldest first, the way a conversation reads. */
  replies: DevotionShare[];
}

/**
 * Answers newest first, each with its replies oldest first. A reply whose answer is missing (it
 * was deleted) is dropped rather than shown without context.
 */
export function threadDevotionShares(shares: DevotionShare[]): DevotionThread[] {
  const byTime = (a: DevotionShare, b: DevotionShare) => a.createdAt.localeCompare(b.createdAt);
  const answers = shares.filter((s) => !s.parentShareId);
  const repliesByParent = new Map<string, DevotionShare[]>();
  for (const s of shares) {
    if (!s.parentShareId) continue;
    const list = repliesByParent.get(s.parentShareId) ?? [];
    list.push(s);
    repliesByParent.set(s.parentShareId, list);
  }
  return [...answers]
    .sort((a, b) => byTime(b, a))
    .map((share) => ({ share, replies: (repliesByParent.get(share.id) ?? []).sort(byTime) }));
}

/** What the folded card counts: hearts on every share, and every answer and reply as a comment. */
export function devotionTotals(shares: DevotionShare[]): { hearts: number; comments: number } {
  return {
    hearts: shares.reduce((total, s) => total + s.heartCount, 0),
    comments: shares.length,
  };
}
