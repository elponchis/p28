/**
 * What a course is called, and who may watch it when.
 *
 * This is the recurring administrative act behind the Watch tab: content arrives in bulk from
 * Vimeo and sits unpublished, and someone then decides who each course is for and when they may
 * see it. Doing that in SQL is a date typed into a console with no confirmation, where a wrong
 * one either shuts a term's students out or leaves a finished term open, and fails silently
 * either way. Its title is here for the same reason: courses arrive named by whoever made the
 * Vimeo folder, and renaming one used to mean a REST call typed by hand.
 *
 * Nothing here grants anything the database would not. The list is what the read policy returns —
 * unpublished courses reach admins and nobody else — and a save that RLS refuses comes back as a
 * refusal rather than as a change nobody made.
 */
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Input } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  useGroupsQuery,
  useManagedCoursesQuery,
  useUpdateCourseSettingsMutation,
} from '@/hooks/useApiQueries';
import type { WatchCourse } from '@/lib/api';
import { describeError } from '@/lib/api';
import { notify } from '@/lib/dialogs';
import { formatDateHeader, isIsoDate } from '@/lib/dates';
import { groupTypeLabel } from '@/lib/groupTypes';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

/** A course's settings, as the form holds them while being edited. */
interface CourseDraft {
  title: string;
  description: string;
  groupId: string | null;
  availableFrom: string;
  availableUntil: string;
  isPublished: boolean;
}

function draftFrom(course: WatchCourse): CourseDraft {
  return {
    title: course.title,
    description: course.description ?? '',
    groupId: course.groupId ?? null,
    availableFrom: course.availableFrom ? course.availableFrom.slice(0, 10) : '',
    availableUntil: course.availableUntil ? course.availableUntil.slice(0, 10) : '',
    isPublished: course.isPublished ?? false,
  };
}

function CourseCard({ course, onEdit }: { course: WatchCourse; onEdit: () => void }) {
  const audience = course.groupId
    ? (course.groupName ?? t('watch.groupCourses'))
    : t('watch.openToEveryone');
  const window =
    course.availableFrom || course.availableUntil
      ? `${course.availableFrom ? formatDateHeader(course.availableFrom) : '—'} ~ ${
          course.availableUntil ? formatDateHeader(course.availableUntil) : '—'
        }`
      : t('watchAdmin.noWindow');

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={course.title}
      accessibilityHint={t('watchAdmin.editAccessHint')}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {course.title}
        </Text>
        <View style={[styles.pill, course.isPublished ? styles.pillOpen : styles.pillClosed]}>
          <Text style={course.isPublished ? styles.pillOpenText : styles.pillClosedText}>
            {course.isPublished ? t('watchAdmin.open') : t('watchAdmin.notOpen')}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {audience} · {t('watch.videoCount', { count: course.lessonCount })} · {window}
      </Text>
    </Pressable>
  );
}

export default function WatchManageScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: courses = [], isLoading } = useManagedCoursesQuery({ enabled: !!userId });
  const { data: groups = [] } = useGroupsQuery({ enabled: !!userId });
  const updateCourse = useUpdateCourseSettingsMutation();

  const [editing, setEditing] = useState<WatchCourse | null>(null);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = useCallback((course: WatchCourse) => {
    setError(null);
    setEditing(course);
    setDraft(draftFrom(course));
  }, []);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setDraft(null);
    setError(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!editing || !draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError(t('watchAdmin.titleRequiredError'));
      return;
    }
    // Dates are typed, so they are checked before they can shut a term's students out.
    for (const value of [draft.availableFrom, draft.availableUntil]) {
      if (value && !isIsoDate(value)) {
        setError(t('watchAdmin.dateFormatError'));
        return;
      }
    }
    if (
      draft.availableFrom &&
      draft.availableUntil &&
      draft.availableUntil <= draft.availableFrom
    ) {
      setError(t('watchAdmin.dateOrderError'));
      return;
    }
    setError(null);
    const description = draft.description.trim();
    updateCourse.mutate(
      {
        courseId: editing.id,
        input: {
          title,
          description: description || null,
          groupId: draft.groupId,
          availableFrom: draft.availableFrom ? `${draft.availableFrom}T00:00:00Z` : null,
          availableUntil: draft.availableUntil ? `${draft.availableUntil}T23:59:59Z` : null,
          isPublished: draft.isPublished,
        },
      },
      {
        onSuccess: closeEdit,
        onError: (e) => void notify({ title: t('common.error'), message: describeError(e) }),
      }
    );
  }, [editing, draft, updateCourse, closeEdit]);

  const shelves = useMemo(
    () => ({
      closed: courses.filter((c) => !c.isPublished),
      open: courses.filter((c) => c.isPublished),
    }),
    [courses]
  );

  if (isLoading && courses.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (editing && draft) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.editTitle}>{editing.title}</Text>
        <Text style={styles.editSub}>{t('watch.videoCount', { count: editing.lessonCount })}</Text>

        <Input
          label={t('watchAdmin.courseTitle')}
          value={draft.title}
          onChangeText={(v) => setDraft({ ...draft, title: v })}
          accessibilityLabel={t('watchAdmin.courseTitle')}
          containerStyle={styles.field}
        />
        <Input
          label={t('watchAdmin.courseDescription')}
          value={draft.description}
          onChangeText={(v) => setDraft({ ...draft, description: v })}
          multiline
          numberOfLines={3}
          accessibilityLabel={t('watchAdmin.courseDescription')}
          accessibilityHint={t('watchAdmin.courseDescriptionHint')}
          containerStyle={styles.field}
        />
        <Text style={[styles.hint, styles.fieldHint]}>{t('watchAdmin.courseDescriptionHint')}</Text>

        <Text style={styles.label}>{t('watchAdmin.audience')}</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setDraft({ ...draft, groupId: null })}
            style={[styles.chip, draft.groupId === null && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.groupId === null }}
            accessibilityLabel={t('watch.openToEveryone')}
          >
            <Text style={[styles.chipText, draft.groupId === null && styles.chipTextActive]}>
              {t('watch.openToEveryone')}
            </Text>
          </Pressable>
          {groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => setDraft({ ...draft, groupId: group.id })}
              style={[styles.chip, draft.groupId === group.id && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.groupId === group.id }}
              accessibilityLabel={group.name}
            >
              <Text style={[styles.chipText, draft.groupId === group.id && styles.chipTextActive]}>
                {group.name}
                <Text style={styles.chipType}> · {groupTypeLabel(group.type)}</Text>
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label={t('watchAdmin.availableFrom')}
          value={draft.availableFrom}
          onChangeText={(v) => setDraft({ ...draft, availableFrom: v })}
          placeholder="2026-03-02"
          autoCapitalize="none"
          accessibilityLabel={t('watchAdmin.availableFrom')}
          containerStyle={styles.field}
        />
        <Input
          label={t('watchAdmin.availableUntil')}
          value={draft.availableUntil}
          onChangeText={(v) => setDraft({ ...draft, availableUntil: v })}
          placeholder="2026-06-30"
          autoCapitalize="none"
          accessibilityLabel={t('watchAdmin.availableUntil')}
          containerStyle={styles.field}
        />
        <Text style={styles.hint}>{t('watchAdmin.windowHint')}</Text>

        <Pressable
          onPress={() => setDraft({ ...draft, isPublished: !draft.isPublished })}
          style={styles.toggleRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.isPublished }}
          accessibilityLabel={t('watchAdmin.openToViewers')}
          accessibilityHint={t('watchAdmin.openToViewersHint')}
        >
          <Ionicons
            name={draft.isPublished ? 'checkbox' : 'square-outline'}
            size={22}
            color={draft.isPublished ? colors.primary : colors.onSurfaceVariant}
          />
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('watchAdmin.openToViewers')}</Text>
            <Text style={styles.hint}>{t('watchAdmin.openToViewersHint')}</Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title={updateCourse.isPending ? t('common.saving') : t('common.save')}
          onPress={handleSave}
          disabled={updateCourse.isPending}
          accessibilityLabel={t('common.save')}
          style={styles.saveButton}
        />
        <Button
          title={t('common.cancel')}
          onPress={closeEdit}
          variant="text"
          disabled={updateCourse.isPending}
          accessibilityLabel={t('common.cancel')}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {courses.length === 0 ? (
        <EmptyState
          iconName="albums-outline"
          title={t('watchAdmin.emptyTitle')}
          subtitle={t('watchAdmin.emptyDescription')}
        />
      ) : (
        <>
          {shelves.closed.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('watchAdmin.notOpenSection')}</Text>
              <Text style={styles.sectionHint}>{t('watchAdmin.notOpenSectionHint')}</Text>
              {shelves.closed.map((course) => (
                <CourseCard key={course.id} course={course} onEdit={() => startEdit(course)} />
              ))}
            </View>
          ) : null}
          {shelves.open.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('watchAdmin.openSection')}</Text>
              {shelves.open.map((course) => (
                <CourseCard key={course.id} course={course} onEdit={() => startEdit(course)} />
              ))}
            </View>
          ) : null}
        </>
      )}
      <Button
        title={t('watchAdmin.backToWatch')}
        onPress={() => router.replace('/watch')}
        variant="text"
        accessibilityLabel={t('watchAdmin.backToWatch')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.onSurface },
  sectionHint: { ...typography.caption, color: colors.onSurfaceVariant },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.ghostBorder,
    gap: 4,
  },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: {
    ...typography.body,
    flex: 1,
    color: colors.onSurface,
    fontFamily: fontFamily.sansSemiBold,
  },
  cardMeta: { ...typography.caption, color: colors.onSurfaceVariant },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  pillOpen: { backgroundColor: colors.secondaryContainer },
  pillClosed: { backgroundColor: colors.surfaceContainerHigh },
  pillOpenText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.onSecondaryContainer,
    fontFamily: fontFamily.sansSemiBold,
  },
  pillClosedText: { ...typography.caption, fontSize: 11, color: colors.onSurfaceVariant },
  editTitle: { ...typography.h2, color: colors.onSurface },
  editSub: { ...typography.caption, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.onSurface },
  chipTextActive: { color: colors.onPrimary },
  chipType: { color: colors.onSurfaceVariant },
  field: { marginBottom: spacing.sm },
  fieldHint: { marginBottom: spacing.lg },
  hint: { ...typography.caption, color: colors.onSurfaceVariant },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginVertical: spacing.lg,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { ...typography.body, color: colors.onSurface },
  error: { ...typography.caption, color: colors.error, marginBottom: spacing.sm },
  saveButton: { marginTop: spacing.sm },
});
