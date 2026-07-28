import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GlobalAnnouncementCardProps {
  title: string;
  description: string;
}

export function GlobalAnnouncementCard({ title, description }: GlobalAnnouncementCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityLabel={`${t('home.globalAnnouncementLabel')}. ${title}. ${description}`}
    >
      <View
        style={styles.globeWatermark}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Ionicons name="globe-outline" size={112} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('home.globalAnnouncementLabel')}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  globeWatermark: {
    position: 'absolute',
    right: -spacing.md,
    bottom: -spacing.lg,
    opacity: 0.09,
    zIndex: 0,
  },
  content: {
    gap: spacing.xs,
    maxWidth: '100%',
    zIndex: 1,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.secondary,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
  },
});
