import type { GroupEvent } from '@/lib/api';

/** Soonest `startsAt` first; ties broken by newest `createdAt` first. */
export function compareGroupEventsByStartThenCreated(a: GroupEvent, b: GroupEvent): number {
  const startA = new Date(a.startsAt).getTime();
  const startB = new Date(b.startsAt).getTime();
  if (startA !== startB) return startA - startB;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * The next few active events that have not started yet, soonest first — the preview on the group
 * page. Admins get an "Add event" link in the section when this is empty, so it decides both.
 */
export function upcomingGroupEvents(
  events: GroupEvent[],
  nowMs: number = Date.now(),
  limit = 3
): GroupEvent[] {
  return events
    .filter((e) => e.status === 'active' && new Date(e.startsAt).getTime() > nowMs)
    .sort(compareGroupEventsByStartThenCreated)
    .slice(0, limit);
}

/**
 * Active upcoming events first (same order as group detail preview). Past and
 * cancelled events follow, ordered by most recent start time, then newest created.
 */
export function sortGroupEventsForList(
  events: GroupEvent[],
  nowMs: number = Date.now()
): GroupEvent[] {
  return [...events].sort((a, b) => {
    const startA = new Date(a.startsAt).getTime();
    const startB = new Date(b.startsAt).getTime();
    const activeUpcomingA = a.status === 'active' && startA > nowMs;
    const activeUpcomingB = b.status === 'active' && startB > nowMs;
    if (activeUpcomingA && activeUpcomingB) {
      return compareGroupEventsByStartThenCreated(a, b);
    }
    if (activeUpcomingA) return -1;
    if (activeUpcomingB) return 1;
    if (startA !== startB) return startB - startA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
