/* Geniego-ROI Service Worker — UNREGISTER-ONLY (170차 P0 #1 fix)
 *
 * 이전 SW (170 이전) 가 chunk hash 를 강제 캐싱하여 새 dist 의 entry 가 옛 chunk 참조 mismatch →
 * 사용자 화이트스크린 4회 재현. 본 SW 는 기존 SW 를 깨끗 unregister + 모든 client navigate(reload)
 * 후 사라짐. fetch handler 부재 → network direct.
 *
 * 사용자 접속 1 회 시:
 *  1) install: skipWaiting 으로 즉시 activate
 *  2) activate: 모든 caches 삭제 + SW 자가 unregister
 *  3) 다음 페이지 load 부터는 SW 없이 nginx 직접 fetch — chunk hash 100% 정합
 *
 * [현 차수] ★activate 의 `c.navigate(c.url)` (= 열려 있는 모든 창 강제 reload) 제거.
 *   구형 캐싱 SW 가 클라이언트를 제어(clients.claim)하던 브라우저에서 이 SW 가 activate 되면
 *   작업 중이던 탭이 예고 없이 통째로 새로고침돼 입력값이 소실됐다.
 *   캐시 삭제 + unregister 만으로 목적(옛 청크 캐시 제거)은 달성되고, 정합된 번들은
 *   다음 자연스러운 이동/새로고침에서 받는다. 강제 reload 는 이득 없이 데이터만 날린다.
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
    // [현 차수] 여기서 열려 있던 창들을 c.navigate(c.url) 로 강제 reload 하던 코드를 제거했다.
    //   작업 중인 탭을 예고 없이 새로고침해 입력값을 날리는 경로였다. 위 unregister + 캐시삭제로 충분.
  })());
});
