/* Geniego-ROI Service Worker — UNREGISTER-ONLY (170차 P0 #1 fix)
 *
 * 이전 SW (170 이전) 가 chunk hash 를 강제 캐싱하여 새 dist 의 entry 가 옛 chunk 참조 mismatch →
 * 사용자 화이트스크린 4회 재현. 본 SW 는 기존 SW 를 깨끗 unregister + 모든 client navigate(reload)
 * 후 사라짐. fetch handler 부재 → network direct.
 *
 * 사용자 접속 1 회 시:
 *  1) install: skipWaiting 으로 즉시 activate
 *  2) activate: 모든 caches 삭제 + SW 자가 unregister + 모든 open client 강제 reload
 *  3) 다음 페이지 load 부터는 SW 없이 nginx 직접 fetch — chunk hash 100% 정합
 *
 * 향후 SW 가 다시 필요하면 본 파일을 정상 SW 로 교체 + index.html 의 register 활성화.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (_) { /* ignore */ }
    try {
      await self.registration.unregister();
    } catch (_) { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        try { c.navigate(c.url); } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore */ }
  })());
});
