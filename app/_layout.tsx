import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  NotoSerif_400Regular,
  NotoSerif_400Regular_Italic,
  NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'react-native-reanimated';

import { BrandedSplash } from '@/components/patterns/BrandedSplash';
import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
import { PendingSignUpProvider } from '@/contexts/PendingSignUpContext';
import { useProfileQuery } from '@/hooks/useApiQueries';
import { useAppIconBadgeSync } from '@/hooks/useAppIconBadgeSync';
import { useAuth } from '@/hooks/useAuth';
import { useExpoPushRouting } from '@/hooks/useExpoPushRouting';
import { t } from '@/lib/i18n';
import { setupNotificationHandler } from '@/lib/push';
import { colors, fontFamily } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

setupNotificationHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [splashReady, setSplashReady] = useState(false);
  const onSplashComplete = useCallback(() => {
    setSplashReady(true);
  }, []);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    // Editorial fonts — Noto Serif (headlines) + Plus Jakarta Sans (body)
    [fontFamily.serif]: NotoSerif_400Regular,
    [fontFamily.serifItalic]: NotoSerif_400Regular_Italic,
    [fontFamily.serifBold]: NotoSerif_700Bold,
    [fontFamily.sans]: PlusJakartaSans_400Regular,
    [fontFamily.sansMedium]: PlusJakartaSans_500Medium,
    [fontFamily.sansSemiBold]: PlusJakartaSans_600SemiBold,
    [fontFamily.sansBold]: PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (!error) return;
    void SplashScreen.hideAsync();
    throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  if (error) {
    return null;
  }

  if (!splashReady) {
    return <BrandedSplash onComplete={onSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PendingSignUpProvider>
          <LocaleProvider>
            <RootLayoutNav />
          </LocaleProvider>
        </PendingSignUpProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const { locale, setLocale } = useLocale();
  const setLocaleRef = useRef(setLocale);
  setLocaleRef.current = setLocale;
  const segments = useSegments();
  const router = useRouter();

  const upcomingEventsStackOptions = useMemo(() => {
    return {
      headerShown: true as const,
      title: t('home.upcomingEvents'),
      headerBackButtonDisplayMode: 'minimal' as const,
      headerTitleStyle: {
        fontFamily: fontFamily.serif,
        fontWeight: '400' as const,
        color: colors.onSurface,
      },
      headerLeft: () => <StackHeaderBack fallbackHref="/(tabs)" />,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t()` uses locale; keep title in sync after language change
  }, [locale]);

  const profileStackScreenOptions = useMemo(() => {
    const sub = segments[0] === 'profile' ? segments[1] : undefined;
    let title = t('profile.title');
    if (sub === 'settings') title = t('profile.settings');
    else if (sub === 'notifications') title = t('profile.notificationPreferences');
    else if (sub === 'language') title = t('language.title');
    else if (sub === 'conduct') title = t('conduct.title');
    else if (sub === 'edit') title = t('profile.editProfile');
    return {
      headerShown: true as const,
      title,
      headerBackButtonDisplayMode: 'minimal' as const,
      headerTitleStyle: {
        fontFamily: fontFamily.serif,
        fontWeight: '400' as const,
        color: colors.onSurface,
      },
      headerLeft: () => <StackHeaderBack fallbackHref="/(tabs)" />,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t()` uses locale; keep title in sync after language change
  }, [segments, locale]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'auth';
    const authScreen = inAuthGroup ? segments[1] : null;
    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && authScreen === 'sign-in') {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  const { data: profile } = useProfileQuery(session?.user?.id, {
    enabled: !isLoading && !!session?.user?.id,
  });

  useEffect(() => {
    if (!profile?.preferredLanguage) return;
    setLocaleRef.current(profile.preferredLanguage);
  }, [profile?.preferredLanguage]);

  const userId = session?.user?.id;
  useExpoPushRouting({ userId, router });
  useAppIconBadgeSync(userId);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.surface,
      card: colors.surfaceContainerLowest,
      primary: colors.primary,
      border: colors.ghostBorder,
      text: colors.onSurface,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="upcoming-events" options={upcomingEventsStackOptions} />
        <Stack.Screen name="group" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={profileStackScreenOptions} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: '',
            headerLeft: () => <StackHeaderBack />,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
