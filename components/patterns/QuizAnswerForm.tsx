import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { QuizAnswer, QuizAnswerResult, QuizQuestion } from '@/lib/api';
import { isChoiceQuestion } from '@/lib/quiz';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface QuizAnswerFormProps {
  questions: QuizQuestion[];
  /** Current answers keyed by question id. */
  answers: Record<string, QuizAnswer>;
  onChange: (answers: Record<string, QuizAnswer>) => void;
  disabled?: boolean;
  /**
   * Read-only rendering of what was answered — used for the past-due view and for the
   * instructor reviewing a submission. Correct options are marked when the viewer's
   * questions carry an answer key, which only group admins ever receive.
   */
  readOnly?: boolean;
  /**
   * Server-computed per-question verdicts. Shown as a badge on each question so a
   * student learns which ones they missed; carries no answer key, so a wrong answer
   * stays wrong without revealing what was right.
   */
  results?: QuizAnswerResult[];
}

/** Student-facing quiz: one card per question, answered inline. */
export function QuizAnswerForm({
  questions,
  answers,
  onChange,
  disabled,
  readOnly,
  results,
}: QuizAnswerFormProps) {
  const verdicts = new Map((results ?? []).map((r) => [r.questionId, r.correct]));
  const setAnswer = (questionId: string, patch: Partial<QuizAnswer>) => {
    onChange({ ...answers, [questionId]: { ...answers[questionId], ...patch, questionId } });
  };

  const handleToggleOption = (question: QuizQuestion, optionId: string) => {
    const current = answers[question.id]?.optionIds ?? [];
    if (question.allowMultiple) {
      setAnswer(question.id, {
        optionIds: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      });
    } else {
      setAnswer(question.id, { optionIds: current.includes(optionId) ? [] : [optionId] });
    }
  };

  return (
    <View style={styles.container}>
      {questions.map((question, index) => {
        const answer = answers[question.id];
        const chosen = answer?.optionIds ?? [];
        const key = question.correctOptionIds;
        const verdict = verdicts.get(question.id);
        return (
          <View key={question.id} style={styles.questionCard}>
            <View style={styles.promptRow}>
              <Text style={styles.questionNumber}>
                {t('assignments.questionNumber', { number: index + 1 })}
              </Text>
              {question.points > 0 ? (
                <Text style={styles.points}>
                  {t('submissions.pointsSuffix', { points: question.points })}
                </Text>
              ) : null}
              {question.required ? <Text style={styles.requiredMark}>*</Text> : null}
              {verdict !== undefined ? (
                <View
                  style={[
                    styles.verdictBadge,
                    verdict ? styles.verdictBadgeCorrect : styles.verdictBadgeWrong,
                  ]}
                >
                  <Ionicons
                    name={verdict ? 'checkmark' : 'close'}
                    size={13}
                    color={colors.onPrimary}
                  />
                  <Text style={styles.verdictText}>
                    {t(verdict ? 'submissions.verdictCorrect' : 'submissions.verdictWrong')}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.prompt}>{question.prompt}</Text>

            {isChoiceQuestion(question.questionType) ? (
              <View style={styles.optionsBlock}>
                {question.allowMultiple ? (
                  <Text style={styles.multiHint}>{t('submissions.pickAllThatApply')}</Text>
                ) : null}
                {question.options.map((option) => {
                  const selected = chosen.includes(option.id);
                  const isCorrect = key?.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => handleToggleOption(question, option.id)}
                      disabled={disabled || readOnly}
                      style={[
                        styles.optionRow,
                        selected && styles.optionRowSelected,
                        readOnly && isCorrect && styles.optionRowCorrect,
                      ]}
                      accessibilityRole={question.allowMultiple ? 'checkbox' : 'radio'}
                      accessibilityState={{ selected, checked: selected }}
                      accessibilityLabel={option.text}
                    >
                      <Ionicons
                        name={
                          question.allowMultiple
                            ? selected
                              ? 'checkbox'
                              : 'square-outline'
                            : selected
                              ? 'radio-button-on'
                              : 'radio-button-off'
                        }
                        size={20}
                        color={selected ? colors.primary : colors.onSurfaceVariant}
                      />
                      <Text style={styles.optionText}>{option.text}</Text>
                      {readOnly && isCorrect ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : readOnly ? (
              <Text style={styles.readOnlyAnswer}>
                {answer?.text?.trim() || t('submissions.noAnswerGiven')}
              </Text>
            ) : (
              <TextInput
                value={answer?.text ?? ''}
                onChangeText={(text) => setAnswer(question.id, { text })}
                placeholder={t('submissions.answerPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                editable={!disabled}
                multiline={question.questionType === 'essay'}
                style={[
                  styles.answerInput,
                  question.questionType === 'essay' && styles.answerInputEssay,
                ]}
                accessibilityLabel={t('submissions.answerPlaceholder')}
                accessibilityHint={question.prompt}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  questionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  questionNumber: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  points: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  requiredMark: {
    ...typography.bodyStrong,
    color: colors.error,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.chip,
    marginLeft: 'auto',
  },
  verdictBadgeCorrect: {
    backgroundColor: colors.success,
  },
  verdictBadgeWrong: {
    backgroundColor: colors.secondary,
  },
  verdictText: {
    ...typography.micro,
    color: colors.onPrimary,
  },
  prompt: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  optionsBlock: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  multiHint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionRowCorrect: {
    borderColor: colors.success,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  answerInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xxs,
  },
  answerInputEssay: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  readOnlyAnswer: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xxs,
  },
});
