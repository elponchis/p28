import { View } from 'react-native';
import { Stack } from 'expo-router';

import { useDesktopFullWidth } from '@/hooks/useDesktopFullWidth';

export default function AuthLayout() {
  const { style } = useDesktopFullWidth();
  return (
    <View style={style}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </View>
  );
}
