import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

export default function NotificationsTabLayout() {
  useLocale();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="friend-requests"
        options={{
          headerShown: true,
          title: t('notifications.friendRequests'),
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            ...typography.title,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitleVisible: false,
          headerLeft: () => <StackHeaderBack />,
        }}
      />
    </Stack>
  );
}
