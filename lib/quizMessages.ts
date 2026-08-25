import { t } from '@/lib/i18n';
import type { QuizDraftProblem } from '@/lib/quiz';
import { MIN_QUIZ_OPTIONS } from '@/lib/quiz';

/**
 * Turns a quiz draft problem into a message naming the offending question, so an
 * instructor with twenty questions isn't told only that "something" is incomplete.
 * Kept apart from `lib/quiz` so the validation itself stays free of i18n.
 */
export function describeQuizDraftProblem(problem: QuizDraftProblem): string {
  switch (problem.kind) {
    case 'noQuestions':
      return t('assignments.quizNeedsQuestion');
    case 'emptyPrompt':
      return t('assignments.quizEmptyPrompt', { number: problem.index + 1 });
    case 'emptyOption':
      return t('assignments.quizEmptyOption', { number: problem.index + 1 });
    case 'tooFewOptions':
      return t('assignments.quizTooFewOptions', {
        number: problem.index + 1,
        count: MIN_QUIZ_OPTIONS,
      });
  }
}
