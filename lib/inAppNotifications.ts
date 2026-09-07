/**
 * How a notification presents itself: its icon, what to call it, and where tapping it goes.
 *
 * The screen asked `kind === 'announcement' ? … : …` in four places — the icon, the label, the
 * accessibility hint and the route. A third kind turns every one of those into a silent mislabel,
 * so a new message would have arrived wearing a calendar icon and calling itself an event. One
 * answer per notification instead.
 */
import type { InAppNotification } from '@/lib/api';
import { t } from '@/lib/i18n';

/**
 * A discriminated union, not one shape with a loose pathname: expo-router types each route with
 * the params it actually takes, and a single shape covering all three satisfies none of them.
 */
export type NotificationRoute =
  | { pathname: '/group/announcement/[id]'; params: { id: string; groupId: string } }
  | { pathname: '/group/event/[id]'; params: { id: string } }
  | { pathname: '/messages/chat/[id]'; params: { id: string } };

export interface NotificationPresentation {
  iconName: 'megaphone-outline' | 'calendar-outline' | 'chatbubble-ellipses-outline';
  /** "Announcement", "Event", "Message" — what kind of thing this is. */
  kindLabel: string;
  openHint: string;
  /** Where tapping it goes. Null when the row outlived what it pointed at. */
  route: NotificationRoute | null;
}

export function inAppNotificationPresentation(
  item: Pick<InAppNotification, 'kind' | 'groupId' | 'announcementId' | 'groupEventId' | 'chatId'>
): NotificationPresentation {
  switch (item.kind) {
    case 'chat_message':
      return {
        iconName: 'chatbubble-ellipses-outline',
        kindLabel: t('notifications.kindMessage'),
        openHint: t('notifications.openMessageHint'),
        route: item.chatId
          ? { pathname: '/messages/chat/[id]', params: { id: item.chatId } }
          : null,
      };
    case 'group_event':
      return {
        iconName: 'calendar-outline',
        kindLabel: t('notifications.kindEvent'),
        openHint: t('notifications.openEventHint'),
        route: item.groupEventId
          ? { pathname: '/group/event/[id]', params: { id: item.groupEventId } }
          : null,
      };
    case 'announcement':
    default:
      return {
        iconName: 'megaphone-outline',
        kindLabel: t('notifications.kindAnnouncement'),
        openHint: t('notifications.openAnnouncementHint'),
        route:
          item.announcementId && item.groupId
            ? {
                pathname: '/group/announcement/[id]',
                params: { id: item.announcementId, groupId: item.groupId },
              }
            : null,
      };
  }
}
