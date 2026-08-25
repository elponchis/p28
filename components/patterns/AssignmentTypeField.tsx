import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { AssignmentType } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface AssignmentTypeFieldProps {
  value: AssignmentType;
  onChange: (value: AssignmentType) => void;
  disabled?: boolean;
  /**
   * Locks the choice with an explanation. Changing an existing assignment's type would
   * strand submissions made under the old one, so the edit screen passes this.
   */
  locked?: boolean;
}

const OPTIONS: {
  value: AssignmentType;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  hintKey: string;
}[] = [
  {
    value: 'file',
    icon: 'cloud-upload-outline',
    titleKey: 'assignments.typeFile',
    hintKey: 'assignments.typeFileHint',
  },
  {
    value: 'quiz',
    icon: 'help-circle-outline',
    titleKey: 'assignments.typeQuiz',
    hintKey: 'assignments.typeQuizHint',
  },
];

/** Choose whether students hand in a file or answer questions. */
export function AssignmentTypeField({
  value,
  onChange,
  disabled,
  locked,
}: AssignmentTypeFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('assignments.typeLabel')}</Text>
      <Text style={styles.hint}>
        {locked ? t('assignments.typeLockedHint') : t('assignments.typeHint')}
      </Text>

      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          const isDisabled = disabled || locked;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                pressed && !isDisabled && { opacity: 0.85 },
                isDisabled && !selected && styles.cardDisabled,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!isDisabled }}
              accessibilityLabel={t(option.titleKey)}
              accessibilityHint={t(option.hintKey)}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={selected ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                {t(option.titleKey)}
              </Text>
              <Text style={styles.cardHint}>{t(option.hintKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  cardTitleSelected: {
    color: colors.primary,
  },
  cardHint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
