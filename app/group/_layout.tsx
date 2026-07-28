import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/patterns/StackHeaderBack';
import { useLocale } from '@/contexts/LocaleContext';
import { t } from '@/lib/i18n';
import { colors, typography } from '@/theme/tokens';

export default function GroupLayout() {
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
        headerBackTitle: '',
        headerTintColor: colors.primary,
        headerLeft: () => <StackHeaderBack accessibilityHint={t('groups.backToGroupsHint')} />,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('groups.createGroup'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('groups.editGroup'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: t('groups.settingsTitle'),
        }}
      />
      <Stack.Screen
        name="discussion/[id]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="discussion/create"
        options={{
          title: t('discussions.createDiscussion'),
        }}
      />
      <Stack.Screen
        name="discussion/edit"
        options={{
          title: t('discussions.editDiscussion'),
        }}
      />
      <Stack.Screen
        name="members"
        options={{
          title: t('groups.people'),
        }}
      />
      <Stack.Screen
        name="leaders"
        options={{
          title: t('groups.leaders'),
        }}
      />
      <Stack.Screen
        name="announcement/create"
        options={{
          title: t('announcements.screenTitle'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="announcement/list"
        options={{
          title: t('announcements.listTitle'),
        }}
      />
      <Stack.Screen
        name="announcement/[id]"
        options={{
          title: t('announcements.detailTitle'),
        }}
      />
      <Stack.Screen
        name="event/list"
        options={{
          title: t('groupEvents.listTitle'),
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manage"
        options={{
          title: t('groups.manageMyGroupsTitle'),
        }}
      />
    </Stack>
  );
}
