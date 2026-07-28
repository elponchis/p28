/**
 * Shared styles for auth/form screens (sign-in, sign-up, onboarding).
 * Single source for layout and typography; screens only add screen-specific styles when needed.
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, authScreen } from '@/theme/tokens';

export const authScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  centeredBlock: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputSpacing: {
    marginBottom: spacing.md,
  },
  ctaButton: {
    alignSelf: 'stretch',
    minHeight: authScreen.ctaMinHeight,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  secondaryCtaButton: {
    alignSelf: 'center',
    minHeight: authScreen.ctaMinHeight,
    paddingHorizontal: spacing.lg,
  },
});

export { authScreen };
