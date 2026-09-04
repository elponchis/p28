import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface UploadProgressBarProps {
  /** 0..1 fraction of bytes uploaded so far. */
  progress: number;
}

/** Thin horizontal progress bar with a percentage label, shown while an upload is in flight. */
export function UploadProgressBar({ progress }: UploadProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View style={styles.container} accessibilityLabel={t('attachments.uploadingPercent', { pct })}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.label}>{`${pct}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    minWidth: 36,
    textAlign: 'right',
  },
});
