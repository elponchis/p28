import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { colors, typography } from '@/theme/tokens';

export default function ProfileLayout() {
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
        headerTintColor: colors.primary,
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitleVisible: false,
        headerLeft: () => <StackHeaderBack fallbackHref="/(tabs)" />,
      }}
    >
      <Stack.Screen
        name="[userId]"
        options={{
          // Root stack (`app/_layout`) shows title + back for `/profile/*`.
          headerShown: false,
        }}
      />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="language" options={{ headerShown: false }} />
      <Stack.Screen name="conduct" options={{ headerShown: false }} />
    </Stack>
  );
}
