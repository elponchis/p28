/**
 * Rows for the friends list, built so a row can exist before its profile does.
 *
 * The screen loads friend ids and friend profiles as two queries, and the second waits on the
 * first. For the moment between them it knows who your friends are but not what they look like.
 * The rows used to be built with `profileMap.get(id)!`, asserting the profile was there — so that
 * moment rendered a row with no profile and crashed reading its avatar. The friend is real; only
 * their details are late. The row shows them as loading instead.
 */
import type { Profile } from '@/lib/api';
import { t } from '@/lib/i18n';

export interface FriendRow {
  userId: string;
  /** Undefined until the profile query answers, or if this person's profile cannot be read. */
  profile: Profile | undefined;
}

/** One row per friend id, in the order given, whether or not the profile has arrived. */
export function friendRows(
  friendIds: readonly string[],
  profileMap: ReadonlyMap<string, Profile>
): FriendRow[] {
  return friendIds.map((userId) => ({ userId, profile: profileMap.get(userId) }));
}

/**
 * What to call someone in the list.
 *
 * No profile yet reads as loading. A profile that has arrived with no name reads as a nameless
 * person rather than as still loading — the old fallback used `??` after a `join(' ')`, which is
 * never nullish, so it produced an empty string for both cases and the loading label never showed.
 */
export function friendDisplayName(profile: Profile | undefined): string {
  if (!profile) return t('common.loading');
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return profile.displayName || fullName || t('notifications.unknownUser');
}
