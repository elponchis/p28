import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

const MARK = 28;

/**
 * The app's name and mark, standing where the tab's own name used to.
 *
 * "Home" in the header said what the tab bar underneath it already said, on every tab, forever.
 * The brand is the one thing that belongs in that slot on the first screen and is otherwise
 * invisible on a phone — the sidebar that carries it only exists on desktop.
 */
export function BrandHeaderTitle() {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.mark}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.names}>
        <Text style={styles.wordmark}>P2:8</Text>
        <Text style={styles.subtitle}>{t('tabs.brandSubtitle')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: radius.sm,
  },
  names: {
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});
