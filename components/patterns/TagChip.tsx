import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, listAccents, spacing } from '@/theme/tokens';

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
    paddingHorizontal: listAccents.chip.paddingHorizontal,
    paddingVertical: listAccents.chip.paddingVertical,
    borderRadius: listAccents.chip.borderRadius,
    borderWidth: listAccents.chip.borderWidth,
    borderColor: colors.chipBorder,
    backgroundColor: colors.chipBackground,
  },
  label: {
    flexShrink: 1,
    fontFamily: fontFamily.sans,
    fontSize: listAccents.chip.fontSize,
    color: colors.chipText,
  },
  hash: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: listAccents.chip.fontSize,
    color: colors.chipAccent,
  },
});
