import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

export interface TagChipProps {
  /** Where the item comes from — a group or channel name. */
  label: string;
}

/**
 * A small outlined pill naming where an item belongs, set at the right of a row ("LMS 테스트 그룹 #").
 * Quiet on purpose: white, a light outline and grey text, with only the trailing # in amber.
 */
export function TagChip({ label }: TagChipProps) {
  return (
    <View style={styles.chip} accessibilityLabel={label}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.hash} accessibilityElementsHidden importantForAccessibility="no">
        #
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: 180,
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  label: {
    flexShrink: 1,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  hash: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    color: colors.secondary,
  },
});
