/* Geniego-ROI Push Service Worker — PUSH-ONLY (246차 P3)
 *
 * ★화이트스크린 트랩 회피(170차): 본 SW 는 'push'·'notificationclick' 핸들러만 가진다.
 *   'fetch' 리스너·caches·chunk 캐싱 절대 없음 → 내비게이션을 가로채지 않아 dist 교체 시 화이트스크린 0.
 *   별도 파일(push-sw.js)·사용자 명시 알림 허용 시에만 등록(opt-in). 기존 sw.js(unregister-only)와 무간섭.
 */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    try { data = { body: event.data ? event.data.text() : '' }; } catch (__) { data = {}; }
  }
  const title = data.title || 'GeniegoROI';
  const options = {
    body: data.body || data.message || '새 알림이 도착했습니다.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'geniego',
    data: { url: data.url || '/' },
    requireInteraction: !!data.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
