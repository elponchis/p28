import type { QuizAnswer, QuizQuestion, QuizQuestionInput } from '@/lib/api';
import {
  answersById,
  createEmptyQuizQuestion,
  findQuizDraftProblem,
  findUnansweredRequired,
  MIN_QUIZ_OPTIONS,
  newQuizOptionId,
  toQuizQuestionInput,
  toSubmittableAnswers,
} from '@/lib/quiz';

function question(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q1',
    assignmentId: 'a1',
    prompt: 'Who wrote Romans?',
    questionType: 'multiple_choice',
    options: [
      { id: 'o1', text: 'Paul' },
      { id: 'o2', text: 'Peter' },
    ],
    allowMultiple: false,
    points: 1,
    required: true,
    sortOrder: 0,
    ...overrides,
  };
}

function draft(overrides: Partial<QuizQuestionInput> = {}): QuizQuestionInput {
  return {
    prompt: 'Who wrote Romans?',
    questionType: 'multiple_choice',
    options: [
      { id: 'o1', text: 'Paul' },
      { id: 'o2', text: 'Peter' },
    ],
    allowMultiple: false,
    points: 1,
    required: true,
    sortOrder: 0,
    correctOptionIds: ['o1'],
    ...overrides,
  };
}

describe('newQuizOptionId', () => {
  it('returns distinct ids', () => {
    expect(newQuizOptionId()).not.toBe(newQuizOptionId());
  });
});

describe('createEmptyQuizQuestion', () => {
  it('starts as multiple choice with the minimum number of blank options', () => {
    const created = createEmptyQuizQuestion(3);
    expect(created.questionType).toBe('multiple_choice');
    expect(created.options).toHaveLength(MIN_QUIZ_OPTIONS);
    expect(created.sortOrder).toBe(3);
    expect(created.options[0].id).not.toBe(created.options[1].id);
  });
});

describe('toQuizQuestionInput', () => {
  it('carries the id through so answers stay attached across an edit', () => {
    expect(toQuizQuestionInput(question()).id).toBe('q1');
  });

  it('copies options rather than aliasing them', () => {
    const source = question();
    const input = toQuizQuestionInput(source);
    input.options[0].text = 'changed';
    expect(source.options[0].text).toBe('Paul');
  });

  it('defaults a student-loaded question to an empty answer key', () => {
    // Students never receive correctOptionIds; the builder is admin-only, but the
    // conversion must not produce undefined holes either way.
    expect(toQuizQuestionInput(question()).correctOptionIds).toEqual([]);
  });
});

describe('findQuizDraftProblem', () => {
  it('rejects a quiz with no questions', () => {
    expect(findQuizDraftProblem([])).toEqual({ kind: 'noQuestions' });
  });

  it('reports which question has no text', () => {
    const problem = findQuizDraftProblem([draft(), draft({ prompt: '   ' })]);
    expect(problem).toEqual({ kind: 'emptyPrompt', index: 1 });
  });

  it('reports a blank answer option', () => {
    const problem = findQuizDraftProblem([
      draft({
        options: [
          { id: 'o1', text: 'Paul' },
          { id: 'o2', text: '' },
        ],
      }),
    ]);
    expect(problem).toEqual({ kind: 'emptyOption', index: 0 });
  });

  it('reports too few options', () => {
    const problem = findQuizDraftProblem([draft({ options: [{ id: 'o1', text: 'Paul' }] })]);
    expect(problem).toEqual({ kind: 'tooFewOptions', index: 0 });
  });

  it('ignores options on free-text questions', () => {
    expect(findQuizDraftProblem([draft({ questionType: 'essay', options: [] })])).toBeNull();
  });

  it('accepts a complete draft', () => {
    expect(findQuizDraftProblem([draft(), draft({ questionType: 'short_answer' })])).toBeNull();
  });
});

describe('findUnansweredRequired', () => {
  it('flags a required choice question with nothing selected', () => {
    const missing = findUnansweredRequired([question()], {});
    expect(missing.map((q) => q.id)).toEqual(['q1']);
  });

  it('flags a required text question answered with only whitespace', () => {
    const q = question({ questionType: 'short_answer', options: [] });
    const answers: Record<string, QuizAnswer> = { q1: { questionId: 'q1', text: '   ' } };
    expect(findUnansweredRequired([q], answers)).toHaveLength(1);
  });

  it('does not flag optional questions', () => {
    expect(findUnansweredRequired([question({ required: false })], {})).toEqual([]);
  });

  it('does not flag an answered question', () => {
    const answers: Record<string, QuizAnswer> = { q1: { questionId: 'q1', optionIds: ['o1'] } };
    expect(findUnansweredRequired([question()], answers)).toEqual([]);
  });
});

describe('toSubmittableAnswers', () => {
  it('drops blank answers so a skipped optional question stores nothing', () => {
    const questions = [
      question({ id: 'q1' }),
      question({ id: 'q2', questionType: 'essay', options: [], required: false }),
    ];
    const answers: Record<string, QuizAnswer> = {
      q1: { questionId: 'q1', optionIds: ['o1'] },
      q2: { questionId: 'q2', text: '  ' },
    };
    expect(toSubmittableAnswers(questions, answers)).toEqual([
      { questionId: 'q1', optionIds: ['o1'] },
    ]);
  });

  it('trims free text', () => {
    const q = question({ questionType: 'short_answer', options: [] });
    const answers: Record<string, QuizAnswer> = { q1: { questionId: 'q1', text: '  Paul  ' } };
    expect(toSubmittableAnswers([q], answers)).toEqual([{ questionId: 'q1', text: 'Paul' }]);
  });

  it('ignores answers for questions that no longer exist', () => {
    const answers: Record<string, QuizAnswer> = { gone: { questionId: 'gone', text: 'x' } };
    expect(toSubmittableAnswers([question()], answers)).toEqual([]);
  });
});

describe('answersById', () => {
  it('keys saved answers by question', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', optionIds: ['o1'] },
      { questionId: 'q2', text: 'hello' },
    ];
    expect(answersById(answers)).toEqual({
      q1: { questionId: 'q1', optionIds: ['o1'] },
      q2: { questionId: 'q2', text: 'hello' },
    });
  });
});
