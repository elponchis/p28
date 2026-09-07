/**
 * How the Watch tab's courses divide into shelves.
 *
 * A shelf answers "why am I being shown this?", and there are two different answers: because you
 * are in the group it was opened to, or because it is open to everyone. The second used to be one
 * shelf, which is how the training school's whole curriculum came to sit under "open to everyone"
 * — it has no group yet, and no group meant public. A course now says which curriculum it belongs
 * to, so a public training school course reads as one.
 *
 * Extracted from the screen because the ordering has a rule worth stating and testing: the
 * training school comes first, since a term running this week is why someone opens the tab.
 */
import type { CourseTrack, GroupType } from '@/lib/api';
import { t } from '@/lib/i18n';

/** The minimum a course must say for shelving; the screen passes whole WatchCourses. */
export interface ShelvableCourse {
  groupId?: string;
  groupName?: string;
  groupType?: GroupType;
  track?: CourseTrack;
}

export interface Shelf<C extends ShelvableCourse> {
  key: string;
  title: string;
  /** Named on the shelf so a training school reads as one, rather than as a group of videos. */
  isTrainingSchool: boolean;
  courses: C[];
}

export function buildShelves<C extends ShelvableCourse>(courses: C[]): Shelf<C>[] {
  const byGroup = new Map<string, Shelf<C>>();
  const openTrainingSchool: C[] = [];
  const open: C[] = [];

  for (const course of courses) {
    if (!course.groupId) {
      (course.track === 'training_school' ? openTrainingSchool : open).push(course);
      continue;
    }
    const existing = byGroup.get(course.groupId);
    if (existing) {
      existing.courses.push(course);
      continue;
    }
    byGroup.set(course.groupId, {
      key: course.groupId,
      title: course.groupName ?? t('watch.groupCourses'),
      // Either fact makes it a training school shelf: the group is one, or the courses in it are.
      isTrainingSchool:
        course.groupType === 'training_school' || course.track === 'training_school',
      courses: [course],
    });
  }

  const groups = [...byGroup.values()].sort((a, b) => {
    if (a.isTrainingSchool !== b.isTrainingSchool) return a.isTrainingSchool ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  const shelves: Shelf<C>[] = [...groups];
  if (openTrainingSchool.length > 0) {
    shelves.push({
      key: 'open-training-school',
      title: t('watch.trainingSchool'),
      isTrainingSchool: true,
      courses: openTrainingSchool,
    });
  }
  if (open.length > 0) {
    shelves.push({
      key: 'open',
      title: t('watch.openToEveryone'),
      isTrainingSchool: false,
      courses: open,
    });
  }
  return shelves;
}
