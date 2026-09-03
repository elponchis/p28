import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

/**
 * The chat sub-screens (edit, members, media) all belong to one chat, so their back arrow has a
 * single correct destination. router.back() only knows "the screen underneath", which on these
 * routes could be the home tab; naming the parent removes the guesswork.
 */
function chatChildOptions(title: string) {
  return ({ route }: { route: { params?: object } }) => {
    const chatId = (route.params as { id?: string } | undefined)?.id;
    return {
      title,
      headerLeft: () => (
        <StackHeaderBack returnTo={chatId ? (`/messages/chat/${chatId}` as const) : undefined} />
      ),
    };
  };
}

export default function MessagesTabLayout() {
  useLocale();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
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
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="requests"
        options={{
          title: t('messages.requestsTitle'),
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          title: t('messages.friendsList'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('messages.newChat'),
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen name="chat/[id]/edit" options={chatChildOptions(t('messages.editChat'))} />
      <Stack.Screen
        name="chat/[id]/manage-members"
        options={chatChildOptions(t('messages.manageMembers'))}
      />
      <Stack.Screen
        name="chat/[id]/media-and-links"
        options={chatChildOptions(t('messages.mediaAndLinksTitle'))}
      />
    </Stack>
  );
}
