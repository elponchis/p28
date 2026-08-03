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
      <Stack.Screen
        name="assignment/create"
        options={{
          title: t('assignments.addAssignment'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="assignment/[assignmentId]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="assignment/[assignmentId]/edit"
        options={{
          title: t('assignments.editAssignment'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="assignment/[assignmentId]/submissions"
        options={{
          title: t('submissions.listTitle'),
        }}
      />
      <Stack.Screen
        name="assignment/[assignmentId]/submissions/[submissionId]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="course/create"
        options={{
          title: t('courses.addCourse'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="course/[courseId]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="course/[courseId]/edit"
        options={{
          title: t('courses.editCourse'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="course/[courseId]/lesson/create"
        options={{
          title: t('lessons.addLesson'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="course/[courseId]/lesson/[lessonId]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="course/[courseId]/lesson/[lessonId]/edit"
        options={{
          title: t('lessons.editLesson'),
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
