import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GlobalAnnouncementCardProps {
  title: string;
  description: string;
  /** Super admins get these; everyone else reads the card. */
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GlobalAnnouncementCard({
  title,
  description,
  onEdit,
  onDelete,
}: GlobalAnnouncementCardProps) {
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
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>{t('home.globalAnnouncementLabel')}</Text>
          {onEdit || onDelete ? (
            <View style={styles.adminActions}>
              {onEdit ? (
                <Pressable
                  onPress={onEdit}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.editGlobalAnnouncement')}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              ) : null}
              {onDelete ? (
                <Pressable
                  onPress={onDelete}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.deleteGlobalAnnouncement')}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButton: {
    padding: spacing.xxs,
  },
  pressed: {
    opacity: 0.7,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.secondary,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 19,
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
