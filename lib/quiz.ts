import type { QuizAnswer, QuizQuestion, QuizQuestionInput, QuizQuestionType } from '@/lib/api';

export const MAX_QUIZ_QUESTIONS = 50;
export const MAX_QUIZ_OPTIONS = 10;
export const MIN_QUIZ_OPTIONS = 2;

/**
 * Ids for options are generated on the client and stored inside the question's JSONB, so
 * they must survive an edit: a student's saved answer refers to the option by id, and
 * regenerating ids would detach every answer already given.
 */
export function newQuizOptionId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `qo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyQuizQuestion(sortOrder: number): QuizQuestionInput {
  return {
    prompt: '',
    questionType: 'multiple_choice',
    options: [
      { id: newQuizOptionId(), text: '' },
      { id: newQuizOptionId(), text: '' },
    ],
    allowMultiple: false,
    points: 1,
    required: true,
    sortOrder,
    correctOptionIds: [],
  };
}

/** An existing question reopened in the builder. Only admins get `correctOptionIds`. */
export function toQuizQuestionInput(question: QuizQuestion): QuizQuestionInput {
  return {
    id: question.id,
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options.map((o) => ({ ...o })),
    allowMultiple: question.allowMultiple,
    points: question.points,
    required: question.required,
    sortOrder: question.sortOrder,
    correctOptionIds: question.correctOptionIds ? [...question.correctOptionIds] : [],
  };
}

export function isChoiceQuestion(type: QuizQuestionType): boolean {
  return type === 'multiple_choice';
}

/** Why a quiz draft cannot be saved yet, or null when it is ready. */
export type QuizDraftProblem =
  | { kind: 'noQuestions' }
  | { kind: 'emptyPrompt'; index: number }
  | { kind: 'tooFewOptions'; index: number }
  | { kind: 'emptyOption'; index: number };

export function findQuizDraftProblem(questions: QuizQuestionInput[]): QuizDraftProblem | null {
  if (questions.length === 0) return { kind: 'noQuestions' };
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt.trim()) return { kind: 'emptyPrompt', index: i };
    if (!isChoiceQuestion(q.questionType)) continue;
    const filled = q.options.filter((o) => o.text.trim().length > 0);
    if (q.options.some((o) => !o.text.trim())) return { kind: 'emptyOption', index: i };
    if (filled.length < MIN_QUIZ_OPTIONS) return { kind: 'tooFewOptions', index: i };
  }
  return null;
}

/**
 * Questions a student left blank but had to answer. Multiple choice needs a selection;
 * the free-text types need non-whitespace text.
 */
export function findUnansweredRequired(
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>
): QuizQuestion[] {
  return questions.filter((q) => {
    if (!q.required) return false;
    const answer = answers[q.id];
    if (!answer) return true;
    return isChoiceQuestion(q.questionType)
      ? !answer.optionIds?.length
      : !answer.text?.trim().length;
  });
}

/** Drops blank answers so a skipped optional question stores nothing rather than an empty shell. */
export function toSubmittableAnswers(
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>
): QuizAnswer[] {
  const result: QuizAnswer[] = [];
  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer) continue;
    if (isChoiceQuestion(q.questionType)) {
      if (answer.optionIds?.length) {
        result.push({ questionId: q.id, optionIds: answer.optionIds });
      }
    } else if (answer.text?.trim()) {
      result.push({ questionId: q.id, text: answer.text.trim() });
    }
  }
  return result;
}

/** Saved answers keyed by question id, for the answer form's local state. */
export function answersById(answers: QuizAnswer[]): Record<string, QuizAnswer> {
  const map: Record<string, QuizAnswer> = {};
  for (const a of answers) map[a.questionId] = a;
  return map;
}
