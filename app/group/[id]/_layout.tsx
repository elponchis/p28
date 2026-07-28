import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

export default function GroupDetailStackLayout() {
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
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerLeft: () => (
            <StackHeaderBack iconColor="#ffffff" accessibilityHint={t('groups.backToGroupsHint')} />
          ),
        }}
      />
      <Stack.Screen
        name="super-admin"
        options={{
          title: t('groups.superAdminAssignTitle'),
        }}
      />
    </Stack>
  );
}
