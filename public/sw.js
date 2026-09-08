/*
 * Service worker for web push.
 *
 * Expo copies everything in public/ to the root of the web export, so this ships as /sw.js and
 * can be registered from the app. It is deliberately the whole service worker: no caching, no
 * offline shell, nothing that could serve a stale bundle. Push is the only job.
 *
 * The payload is produced by the Edge Functions and mirrors the Expo push:
 *   { title, body, data: { type, ... } }
 * where type is chat_message, announcement or group_event.
 */

/** Where a notification of this kind should open. One rule, used to tag and to route. */
function targetFor(data) {
  if (!data) return '/';
  if (data.chatId) return `/messages/chat/${data.chatId}`;
  if (data.type === 'announcement' && data.announcementId) {
    return `/group/announcement/${data.announcementId}${data.groupId ? `?groupId=${data.groupId}` : ''}`;
  }
  if (data.type === 'group_event' && data.eventId) return `/group/event/${data.eventId}`;
  // A platform-wide announcement has no page of its own; it sits at the top of the home feed.
  return '/';
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'New message', body: event.data.text() };
  }

  const data = payload.data || {};
  const title = payload.title || 'New message';
  // A tag collapses a burst into one notification rather than a stack: per chat for messages, per
  // item for anything else. The sender already coalesces, but a reader with several conversations
  // still gets one entry each.
  const tag = data.chatId
    ? `chat:${data.chatId}`
    : data.announcementId
      ? `announcement:${data.announcementId}`
      : data.globalAnnouncementId
        ? `global:${data.globalAnnouncementId}`
        : data.eventId
          ? `event:${data.eventId}`
          : undefined;

  const options = {
    body: payload.body || '',
    tag,
    renotify: Boolean(tag),
    data,
    icon: '/favicon.ico',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = targetFor(event.notification.data);

  event.waitUntil(
    // Focus an open tab rather than piling up new ones; only fall back to opening a window.
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', url: target });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
