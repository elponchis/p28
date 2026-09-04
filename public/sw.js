/*
 * Service worker for web push.
 *
 * Expo copies everything in public/ to the root of the web export, so this ships as /sw.js and
 * can be registered from the app. It is deliberately the whole service worker: no caching, no
 * offline shell, nothing that could serve a stale bundle. Push is the only job.
 *
 * The payload is produced by the send-chat-message Edge Function and mirrors the Expo push:
 *   { title, body, data: { type, chatId, messageId } }
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'New message', body: event.data.text() };
  }

  const title = payload.title || 'New message';
  const options = {
    body: payload.body || '',
    // A per-chat tag collapses a burst into one notification rather than a stack of them. The
    // sender already coalesces, but a reader with several chats still gets one entry per chat.
    tag: payload.data?.chatId ? `chat:${payload.data.chatId}` : undefined,
    renotify: Boolean(payload.data?.chatId),
    data: payload.data || {},
    icon: '/favicon.ico',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const chatId = event.notification.data && event.notification.data.chatId;
  const target = chatId ? `/messages/chat/${chatId}` : '/messages';

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
