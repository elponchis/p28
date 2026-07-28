import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

export default function GroupEventDetailLayout() {
  useLocale();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          ...typography.title,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal' as const,
        headerBackTitleVisible: false,
        headerTintColor: colors.primary,
        headerLeft: () => <StackHeaderBack accessibilityHint={t('groups.backToGroupsHint')} />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('groupEvents.eventTitle'),
        }}
      />
      <Stack.Screen name="attendees" options={{ title: t('groupEvents.attendeesTitle') }} />
    </Stack>
  );
}
