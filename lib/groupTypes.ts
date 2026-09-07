/**
 * The kinds of group, and what to call each one.
 *
 * There were two for a long time, and the code said so in ternaries — `type === 'forum' ? forum
 * : ministry` — scattered across the list, the home cards and the create form. A third kind
 * turns every one of those into a silent mislabel: a training school would have read as a
 * ministry everywhere the ternary ran. One list, one label function.
 */
import type { GroupType } from '@/lib/api';
import { t } from '@/lib/i18n';

/** Every kind, in the order a picker or a filter row should offer them. */
export const GROUP_TYPES: readonly GroupType[] = ['forum', 'ministry', 'training_school'] as const;

export function isGroupType(value: string): value is GroupType {
  return (GROUP_TYPES as readonly string[]).includes(value);
}

/**
 * The kinds this person may create.
 *
 * A training school carries access to content — courses attach to it, terms open on it, and
 * every member watches what the term opens — so making one is closer to granting an audience
 * than to opening a room, and it is a super admin's to grant (00094). Offering the choice to
 * anyone else would be offering an insert the database refuses.
 */
export function creatableGroupTypes(options: { isSuperAdmin: boolean }): readonly GroupType[] {
  return options.isSuperAdmin
    ? GROUP_TYPES
    : GROUP_TYPES.filter((type) => type !== 'training_school');
}

/** The name for a kind of group, in the reader's language. */
export function groupTypeLabel(type: GroupType): string {
  switch (type) {
    case 'ministry':
      return t('groups.ministry');
    case 'training_school':
      return t('groups.trainingSchool');
    case 'forum':
    default:
      return t('groups.forum');
  }
}
