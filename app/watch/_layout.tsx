import { View } from 'react-native';
import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { useDesktopFullWidth } from '@/hooks/useDesktopFullWidth';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

export default function WatchLayout() {
  useLocale();
  const { style } = useDesktopFullWidth();
  return (
    <View style={style}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            ...typography.title,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal' as const,
          headerBackTitle: '',
          headerTintColor: colors.primary,
          // Back always lands on the Watch tab, however the course was reached — a link from a
          // group or a notification should not leave someone in a stack they cannot get out of.
          headerLeft: () => <StackHeaderBack accessibilityHint={t('watch.backToWatch')} />,
        }}
      >
        <Stack.Screen name="[courseId]" options={{ title: '' }} />
      </Stack>
    </View>
  );
}
