import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

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
        name="create-folder"
        options={{
          title: t('messages.createFolder'),
        }}
      />
      <Stack.Screen
        name="add-chat-to-folder/[chatId]"
        options={{
          title: t('messages.addToFolder'),
        }}
      />
      <Stack.Screen
        name="edit-folder/[folderId]"
        options={{
          title: t('messages.editFolder'),
        }}
      />
      <Stack.Screen
        name="add-chats-to-folder/[folderId]"
        options={{
          title: t('messages.addToFolder'),
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="chat/[id]/edit"
        options={{
          title: t('messages.editChat'),
        }}
      />
      <Stack.Screen
        name="chat/[id]/manage-members"
        options={{
          title: t('messages.manageMembers'),
        }}
      />
      <Stack.Screen
        name="chat/[id]/media-and-links"
        options={{
          title: t('messages.mediaAndLinksTitle'),
        }}
      />
    </Stack>
  );
}
