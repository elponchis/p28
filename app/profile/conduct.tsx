import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ConductScreen() {
  useLocale(); // Re-render when locale changes so content updates
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      accessibilityLabel={t('conduct.title')}
      accessibilityHint={t('conduct.openHint')}
    >
      <View style={styles.card}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel={t('conduct.title')}
        >
          {t('conduct.title')}
        </Text>
        <Text style={styles.intro}>{t('conduct.intro')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('conduct.respectTitle')}
          </Text>
          <Text style={styles.body}>{t('conduct.respectBody')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('conduct.safetyTitle')}
          </Text>
          <Text style={styles.body}>{t('conduct.safetyBody')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('conduct.privacyTitle')}
          </Text>
          <Text style={styles.body}>{t('conduct.privacyBody')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('conduct.boundariesTitle')}
          </Text>
          <Text style={styles.body}>{t('conduct.boundariesBody')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
