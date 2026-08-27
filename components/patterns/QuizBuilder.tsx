import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import type { QuizQuestionInput, QuizQuestionType } from '@/lib/api';
import {
  createEmptyQuizQuestion,
  isChoiceQuestion,
  MAX_QUIZ_OPTIONS,
  MAX_QUIZ_QUESTIONS,
  newQuizOptionId,
} from '@/lib/quiz';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface QuizBuilderProps {
  questions: QuizQuestionInput[];
  onChange: (questions: QuizQuestionInput[]) => void;
  disabled?: boolean;
}

const TYPE_OPTIONS: { value: QuizQuestionType; labelKey: string }[] = [
  { value: 'multiple_choice', labelKey: 'assignments.questionTypeMultipleChoice' },
  { value: 'short_answer', labelKey: 'assignments.questionTypeShortAnswer' },
  { value: 'essay', labelKey: 'assignments.questionTypeEssay' },
];

/**
 * Instructor-facing quiz authoring: add questions, pick how each is answered, and for
 * multiple choice write the options and tick the correct one(s).
 *
 * Marking a correct answer is optional. A question left unmarked simply isn't machine
 * scored — the instructor grades it by hand like any written answer — which is why
 * `autoScore` is reported out of only the keyed questions rather than the whole quiz.
 */
export function QuizBuilder({ questions, onChange, disabled }: QuizBuilderProps) {
  const update = (index: number, patch: Partial<QuizQuestionInput>) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const handleAddQuestion = () => {
    if (questions.length >= MAX_QUIZ_QUESTIONS) return;
    onChange([...questions, createEmptyQuizQuestion(questions.length)]);
  };

  const handleRemoveQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, sortOrder: i })));
  };

  const handleMove = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((q, i) => ({ ...q, sortOrder: i })));
  };

  const handleTypeChange = (index: number, questionType: QuizQuestionType) => {
    const q = questions[index];
    if (q.questionType === questionType) return;
    // Keep whatever options were already typed when switching between choice types so a
    // mis-click doesn't discard the instructor's work; free-text types just ignore them.
    update(index, {
      questionType,
      options: isChoiceQuestion(questionType) ? q.options : [],
      allowMultiple: isChoiceQuestion(questionType) ? q.allowMultiple : false,
      correctOptionIds: isChoiceQuestion(questionType) ? q.correctOptionIds : [],
    });
  };

  const handleOptionTextChange = (index: number, optionId: string, text: string) => {
    update(index, {
      options: questions[index].options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  };

  const handleAddOption = (index: number) => {
    const q = questions[index];
    if (q.options.length >= MAX_QUIZ_OPTIONS) return;
    update(index, { options: [...q.options, { id: newQuizOptionId(), text: '' }] });
  };

  const handleRemoveOption = (index: number, optionId: string) => {
    const q = questions[index];
    update(index, {
      options: q.options.filter((o) => o.id !== optionId),
      correctOptionIds: (q.correctOptionIds ?? []).filter((id) => id !== optionId),
    });
  };

  const handleToggleCorrect = (index: number, optionId: string) => {
    const q = questions[index];
    const current = q.correctOptionIds ?? [];
    if (q.allowMultiple) {
      update(index, {
        correctOptionIds: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      });
    } else {
      update(index, { correctOptionIds: current.includes(optionId) ? [] : [optionId] });
    }
  };

  const handleToggleAllowMultiple = (index: number, allowMultiple: boolean) => {
    const q = questions[index];
    const current = q.correctOptionIds ?? [];
    // Going back to single-answer, more than one ticked box no longer makes sense.
    update(index, {
      allowMultiple,
      correctOptionIds: allowMultiple ? current : current.slice(0, 1),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('assignments.questionsLabel')}</Text>
      <Text style={styles.hint}>{t('assignments.questionsHint')}</Text>

      {questions.length === 0 ? (
        <Text style={styles.emptyText}>{t('assignments.noQuestionsYet')}</Text>
      ) : null}

      {questions.map((question, index) => {
        const choice = isChoiceQuestion(question.questionType);
        const correct = question.correctOptionIds ?? [];
        return (
          <View key={question.id ?? `new-${index}`} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>
                {t('assignments.questionNumber', { number: index + 1 })}
              </Text>
              <View style={styles.questionHeaderActions}>
                <Pressable
                  onPress={() => handleMove(index, -1)}
                  disabled={disabled || index === 0}
                  style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={t('assignments.moveQuestionUp')}
                  accessibilityHint={t('assignments.moveQuestionUpHint')}
                >
                  <Ionicons name="arrow-up" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                  onPress={() => handleMove(index, 1)}
                  disabled={disabled || index === questions.length - 1}
                  style={[
                    styles.iconButton,
                    index === questions.length - 1 && styles.iconButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('assignments.moveQuestionDown')}
                  accessibilityHint={t('assignments.moveQuestionDownHint')}
                >
                  <Ionicons name="arrow-down" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                  onPress={() => handleRemoveQuestion(index)}
                  disabled={disabled}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('assignments.removeQuestion')}
                  accessibilityHint={t('assignments.removeQuestionHint')}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            </View>

            <TextInput
              value={question.prompt}
              onChangeText={(prompt) => update(index, { prompt })}
              placeholder={t('assignments.questionPromptPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              editable={!disabled}
              multiline
              style={styles.promptInput}
              accessibilityLabel={t('assignments.questionPromptLabel')}
            />

            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((option) => {
                const selected = question.questionType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleTypeChange(index, option.value)}
                    disabled={disabled}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(option.labelKey)}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {choice ? (
              <View style={styles.optionsBlock}>
                <Text style={styles.optionsHint}>{t('assignments.markCorrectHint')}</Text>
                {question.options.map((option) => {
                  const isCorrect = correct.includes(option.id);
                  return (
                    <View key={option.id} style={styles.optionRow}>
                      {/* A bare icon here read as a bullet, not a control, so instructors
                          never marked an answer and nothing auto-graded. It carries its
                          own label now. */}
                      <Pressable
                        onPress={() => handleToggleCorrect(index, option.id)}
                        disabled={disabled}
                        style={[styles.correctToggle, isCorrect && styles.correctToggleOn]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isCorrect }}
                        accessibilityLabel={t('assignments.markCorrect')}
                        accessibilityHint={t('assignments.markCorrectA11yHint')}
                      >
                        <Ionicons
                          name={
                            isCorrect
                              ? question.allowMultiple
                                ? 'checkbox'
                                : 'checkmark-circle'
                              : question.allowMultiple
                                ? 'square-outline'
                                : 'ellipse-outline'
                          }
                          size={16}
                          color={isCorrect ? colors.onPrimary : colors.onSurfaceVariant}
                        />
                        <Text
                          style={[
                            styles.correctToggleText,
                            isCorrect && styles.correctToggleTextOn,
                          ]}
                        >
                          {t('assignments.correctBadge')}
                        </Text>
                      </Pressable>
                      <TextInput
                        value={option.text}
                        onChangeText={(text) => handleOptionTextChange(index, option.id, text)}
                        placeholder={t('assignments.optionPlaceholder')}
                        placeholderTextColor={colors.onSurfaceVariant}
                        editable={!disabled}
                        style={styles.optionInput}
                        accessibilityLabel={t('assignments.optionPlaceholder')}
                      />
                      <Pressable
                        onPress={() => handleRemoveOption(index, option.id)}
                        disabled={disabled || question.options.length <= 2}
                        style={[
                          styles.iconButton,
                          question.options.length <= 2 && styles.iconButtonDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('assignments.removeOption')}
                        accessibilityHint={t('assignments.removeOptionHint')}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
                      </Pressable>
                    </View>
                  );
                })}

                <Button
                  title={t('assignments.addOption')}
                  variant="text"
                  onPress={() => handleAddOption(index)}
                  disabled={disabled || question.options.length >= MAX_QUIZ_OPTIONS}
                  style={styles.addOptionButton}
                  accessibilityLabel={t('assignments.addOption')}
                  accessibilityHint={t('assignments.addOptionHint')}
                />

                {/* Say what silence costs, next to the control that fixes it — an
                    unmarked question is graded by hand, which is easy to not notice
                    until submissions arrive unscored. */}
                {correct.length === 0 ? (
                  <View style={styles.noCorrectWarning}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.secondary} />
                    <Text style={styles.noCorrectWarningText}>
                      {t('assignments.noCorrectWarning')}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('assignments.allowMultipleLabel')}</Text>
                  <Switch
                    value={question.allowMultiple}
                    onValueChange={(v) => handleToggleAllowMultiple(index, v)}
                    disabled={disabled}
                    accessibilityLabel={t('assignments.allowMultipleLabel')}
                    accessibilityHint={t('assignments.allowMultipleHint')}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.pointsCol}>
                <Text style={styles.metaLabel}>{t('assignments.pointsLabel')}</Text>
                <TextInput
                  value={String(question.points)}
                  onChangeText={(text) => {
                    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    update(index, { points: Number.isNaN(parsed) ? 0 : parsed });
                  }}
                  keyboardType="number-pad"
                  editable={!disabled}
                  style={styles.pointsInput}
                  accessibilityLabel={t('assignments.pointsLabel')}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('assignments.requiredLabel')}</Text>
                <Switch
                  value={question.required}
                  onValueChange={(required) => update(index, { required })}
                  disabled={disabled}
                  accessibilityLabel={t('assignments.requiredLabel')}
                  accessibilityHint={t('assignments.requiredHint')}
                />
              </View>
            </View>
          </View>
        );
      })}

      <Button
        title={t('assignments.addQuestion')}
        variant="secondary"
        onPress={handleAddQuestion}
        disabled={disabled || questions.length >= MAX_QUIZ_QUESTIONS}
        fullWidth
        accessibilityLabel={t('assignments.addQuestion')}
        accessibilityHint={t('assignments.addQuestionHint')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.sm,
  },
  questionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionNumber: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  questionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButton: {
    padding: spacing.xxs,
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  promptInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeChipText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  optionsBlock: {
    gap: spacing.xs,
  },
  optionsHint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  correctToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerHighest,
  },
  correctToggleOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  correctToggleText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  correctToggleTextOn: {
    color: colors.onPrimary,
  },
  noCorrectWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  noCorrectWarningText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  optionInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  addOptionButton: {
    alignSelf: 'flex-start',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  pointsCol: {
    gap: 2,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  pointsInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 72,
  },
});
