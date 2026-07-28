import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, minTouchTarget, spacing, typography } from '@/theme/tokens';

/** Shared with form sheets and settings — off state stays visible on light cards. */
const TRACK_COLORS = {
  false: colors.surfaceContainerHigh,
  true: colors.primary,
} as const;

const THUMB_COLOR = colors.surfaceContainerLowest;
const IOS_TRACK_OFF = colors.surfaceContainerHigh;

export interface LabeledSwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Caption below the row (typical for sheet / form layout). */
  hint?: string;
  /** `settings`: full-width card row. `sheet`: compact label + optional hint (e.g. group event form). */
  variant?: 'settings' | 'sheet';
}

export function LabeledSwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  hint,
  variant = 'settings',
}: LabeledSwitchRowProps) {
  const switchControl = (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={TRACK_COLORS}
      thumbColor={THUMB_COLOR}
      ios_backgroundColor={IOS_TRACK_OFF}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    />
  );

  if (variant === 'sheet') {
    return (
      <View style={sheetStyles.section}>
        <View style={sheetStyles.labelRow}>
          <Text style={sheetStyles.label}>{label}</Text>
          {switchControl}
        </View>
        {hint ? <Text style={sheetStyles.hint}>{hint}</Text> : null}
      </View>
    );
  }

  return (
    <View style={settingsStyles.row}>
      <Text style={settingsStyles.label}>{label}</Text>
      <View style={settingsStyles.switchWrap}>{switchControl}</View>
    </View>
  );
}

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    minHeight: minTouchTarget,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  switchWrap: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const sheetStyles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
