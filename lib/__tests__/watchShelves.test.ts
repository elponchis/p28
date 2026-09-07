import { buildShelves, type ShelvableCourse } from '@/lib/watchShelves';

interface TestCourse extends ShelvableCourse {
  id: string;
}

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
    const shelves = buildShelves([
      course('a', { groupId: 'g1', groupName: 'Bible study' }),
      course('b', { groupId: 'g1', groupName: 'Bible study' }),
    ]);
    expect(shelves).toHaveLength(1);
    expect(shelves[0].title).toBe('Bible study');
    expect(shelves[0].courses.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('marks a group shelf as a training school by the group or by the course', () => {
    const byGroup = buildShelves([
      course('a', { groupId: 'g1', groupName: 'Spring 2026', groupType: 'training_school' }),
    ]);
    expect(byGroup[0].isTrainingSchool).toBe(true);

    const byCourse = buildShelves([
      course('a', { groupId: 'g2', groupName: 'Leaders', track: 'training_school' }),
    ]);
    expect(byCourse[0].isTrainingSchool).toBe(true);
  });

  it('puts training school groups first, then other groups, then the open shelves', () => {
    const shelves = buildShelves([
      course('open'),
      course('school', { groupId: 'g1', groupName: 'Spring 2026', groupType: 'training_school' }),
      course('forum', { groupId: 'g2', groupName: 'Alpha' }),
      course('free', { track: 'training_school' }),
    ]);
    expect(shelves.map((s) => s.key)).toEqual(['g1', 'g2', 'open-training-school', 'open']);
  });

  it('orders group shelves of the same kind by name', () => {
    const shelves = buildShelves([
      course('b', { groupId: 'g2', groupName: 'Beta' }),
      course('a', { groupId: 'g1', groupName: 'Alpha' }),
    ]);
    expect(shelves.map((s) => s.title)).toEqual(['Alpha', 'Beta']);
  });

  it('returns nothing when there are no courses', () => {
    expect(buildShelves([])).toEqual([]);
  });
});
