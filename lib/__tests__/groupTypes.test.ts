import { GROUP_TYPES, creatableGroupTypes, groupTypeLabel, isGroupType } from '@/lib/groupTypes';

describe('group types', () => {
  it('offers every kind, so a picker or filter row can never miss one', () => {
    expect([...GROUP_TYPES]).toEqual(['forum', 'ministry', 'training_school']);
  });

  it('names each kind distinctly', () => {
    const labels = GROUP_TYPES.map(groupTypeLabel);
    expect(new Set(labels).size).toBe(GROUP_TYPES.length);
    expect(labels.every((l) => l.length > 0 && !l.includes('groups.'))).toBe(true);
  });

  it('recognises a stored value and rejects anything else', () => {
    expect(isGroupType('training_school')).toBe(true);
    expect(isGroupType('forum')).toBe(true);
    expect(isGroupType('school')).toBe(false);
    expect(isGroupType('')).toBe(false);
  });
});

describe('creatableGroupTypes', () => {
  it('lets a super admin create every kind', () => {
    expect([...creatableGroupTypes({ isSuperAdmin: true })]).toEqual([...GROUP_TYPES]);
  });

  it('keeps a training school out of an ordinary admin’s reach', () => {
    // It carries access to content: courses attach to it and its members watch what a term
    // opens. Offering the choice would offer an insert the database refuses.
    const types = creatableGroupTypes({ isSuperAdmin: false });
    expect(types).not.toContain('training_school');
    expect(types).toContain('forum');
    expect(types).toContain('ministry');
  });

  it('never offers a kind that is not a kind', () => {
    for (const type of creatableGroupTypes({ isSuperAdmin: false })) {
      expect(isGroupType(type)).toBe(true);
    }
  });
});
