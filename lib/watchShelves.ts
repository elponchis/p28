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
import type { CourseGroupRef, CourseTrack } from '@/lib/api';
import { t } from '@/lib/i18n';

/** The minimum a course must say for shelving; the screen passes whole WatchCourses. */
export interface ShelvableCourse {
  /**
   * Every group this course is taught in. A course taught in three groups appears on three
   * shelves; a reader belongs to one of them and sees it once.
   */
  groups?: CourseGroupRef[];
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
    const groups = course.groups ?? [];
    if (groups.length === 0) {
      (course.track === 'training_school' ? openTrainingSchool : open).push(course);
      continue;
    }
    for (const group of groups) {
      const existing = byGroup.get(group.id);
      if (existing) {
        existing.courses.push(course);
        // Either fact makes it a training school shelf: the group is one, or a course in it is.
        existing.isTrainingSchool = existing.isTrainingSchool || course.track === 'training_school';
        continue;
      }
      byGroup.set(group.id, {
        key: group.id,
        title: group.name || t('watch.groupCourses'),
        isTrainingSchool: group.type === 'training_school' || course.track === 'training_school',
        courses: [course],
      });
    }
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
