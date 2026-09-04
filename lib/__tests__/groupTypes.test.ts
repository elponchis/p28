import { GROUP_TYPES, groupTypeLabel, isGroupType } from '@/lib/groupTypes';

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
