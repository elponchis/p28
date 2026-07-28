import type { Group, GroupEvent } from '@/lib/api';
import { compareGroupEventsByStartThenCreated } from '@/lib/groupEventsSort';

/** Group event with parent group display fields for home / cross-group lists. */
export interface JoinedGroupUpcomingEventRow extends GroupEvent {
  groupName: string;
  groupBannerImageUrl?: string;
}

/**
 * Merges parallel `getGroupEvents` results (one array per `groupIds` index) into
 * active future events with group labels, sorted soonest first.
 */
export function mergeUpcomingJoinedGroupEvents(
  groupIds: readonly string[],
  eventLists: GroupEvent[][],
  groupById: ReadonlyMap<string, Pick<Group, 'name' | 'bannerImageUrl'>>
): JoinedGroupUpcomingEventRow[] {
  const now = Date.now();
  const out: JoinedGroupUpcomingEventRow[] = [];
  for (let i = 0; i < groupIds.length; i++) {
    const gid = groupIds[i];
    const g = groupById.get(gid);
    if (!g) continue;
    const list = eventLists[i] ?? [];
    for (const e of list) {
      if (e.status !== 'active') continue;
      if (new Date(e.startsAt).getTime() <= now) continue;
      out.push({
        ...e,
        groupName: g.name,
        groupBannerImageUrl: g.bannerImageUrl,
      });
    }
  }
  out.sort(compareGroupEventsByStartThenCreated);
  return out;
}
