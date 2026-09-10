import { buildShelves, type ShelvableCourse } from '@/lib/watchShelves';
import type { CourseGroupRef, GroupType } from '@/lib/api';

interface TestCourse extends ShelvableCourse {
  id: string;
}

const group = (id: string, name: string, type: GroupType = 'forum'): CourseGroupRef => ({
  id,
  name,
  type,
});

const course = (id: string, extra: Partial<TestCourse> = {}): TestCourse => ({ id, ...extra });

describe('buildShelves', () => {
  it('keeps a public general course on the open shelf', () => {
    const shelves = buildShelves([course('a')]);
    expect(shelves).toHaveLength(1);
    expect(shelves[0].key).toBe('open');
    expect(shelves[0].isTrainingSchool).toBe(false);
  });

  it('shelves a public training school course apart from the open shelf', () => {
    const shelves = buildShelves([
      course('general'),
      course('curriculum', { track: 'training_school' }),
    ]);
    expect(shelves.map((s) => s.key)).toEqual(['open-training-school', 'open']);
    expect(shelves[0].courses.map((c) => c.id)).toEqual(['curriculum']);
    expect(shelves[0].isTrainingSchool).toBe(true);
  });

  it('groups courses of the same group onto one shelf, named for it', () => {
    const bible = group('g1', 'Bible study');
    const shelves = buildShelves([
      course('a', { groups: [bible] }),
      course('b', { groups: [bible] }),
    ]);
    expect(shelves).toHaveLength(1);
    expect(shelves[0].title).toBe('Bible study');
    expect(shelves[0].courses.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('puts a course taught in several groups on each of their shelves', () => {
    // The point of the link table: one course, taught in the Korean and Khmer groups, and a
    // member of either finds it under their own group rather than under someone else's.
    const shelves = buildShelves([
      course('shared', { groups: [group('ko', 'Korean'), group('km', 'Khmer')] }),
    ]);
    expect(shelves.map((s) => s.title)).toEqual(['Khmer', 'Korean']);
    for (const shelf of shelves) {
      expect(shelf.courses.map((c) => c.id)).toEqual(['shared']);
    }
  });

  it('marks a group shelf as a training school by the group or by any course in it', () => {
    const byGroup = buildShelves([
      course('a', { groups: [group('g1', 'Spring 2026', 'training_school')] }),
    ]);
    expect(byGroup[0].isTrainingSchool).toBe(true);

    const byCourse = buildShelves([
      course('a', { groups: [group('g2', 'Leaders')] }),
      course('b', { groups: [group('g2', 'Leaders')], track: 'training_school' }),
    ]);
    expect(byCourse[0].isTrainingSchool).toBe(true);
  });

  it('puts training school groups first, then other groups, then the open shelves', () => {
    const shelves = buildShelves([
      course('open'),
      course('school', { groups: [group('g1', 'Spring 2026', 'training_school')] }),
      course('forum', { groups: [group('g2', 'Alpha')] }),
      course('free', { track: 'training_school' }),
    ]);
    expect(shelves.map((s) => s.key)).toEqual(['g1', 'g2', 'open-training-school', 'open']);
  });

  it('orders group shelves of the same kind by name', () => {
    const shelves = buildShelves([
      course('b', { groups: [group('g2', 'Beta')] }),
      course('a', { groups: [group('g1', 'Alpha')] }),
    ]);
    expect(shelves.map((s) => s.title)).toEqual(['Alpha', 'Beta']);
  });

  it('returns nothing when there are no courses', () => {
    expect(buildShelves([])).toEqual([]);
  });
});
