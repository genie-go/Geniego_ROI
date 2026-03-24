/* ═══════════════════════════════════════════════
   Geniego-ROI Service Worker
   - App Shell 캐싱 (오프라인 지원)
   - 배경 동기화
   - 푸시 알림
   ═══════════════════════════════════════════════ */

/* ── 개발 환경(localhost)에서는 SW 즉시 비활성화 ── */
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => {
    e.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => clients.claim())
    );
  });
  // 개발 환경에서는 모든 요청을 그대로 네트워크로 통과
  self.addEventListener('fetch', () => { return; });
  /* 이하 코드 실행 안 함 */
} else {

const CACHE_NAME = 'geniego-roi-v6';

const OFFLINE_URL = '/offline.html';

/* ── 앱 셸 파일 목록 ─────────────────────────── */
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/mobile.css',
];

/* ── 설치 ──────────────────────────────────────── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        /* 일부 리소스 실패해도 설치 계속 */
      });
    })
  );
  self.skipWaiting();
});

/* ── 활성화 ────────────────────────────────────── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  clients.claim();
});

/* ── Fetch 처리 ─────────────────────────────────── */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  /* API 요청은 캐시 제외 (항상 네트워크) */
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v4')) {
    e.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ ok: false, error: 'offline' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  /* 네트워크 우선, 실패 시 캐시 */
  e.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          /* HTML 요청은 앱 루트로 */
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('', { status: 503 });
        });
      })
  );
});

/* ── 푸시 알림 ──────────────────────────────────── */
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  const title = data.title || 'Geniego-ROI';
  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '확인' },
      { action: 'close', title: '닫기' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

/* ── 알림 클릭 ──────────────────────────────────── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

/* ── 배경 동기화 ─────────────────────────────────── */
self.addEventListener('sync', (e) => {
  if (e.tag === 'background-sync') {
    e.waitUntil(
      fetch('/api/auth/me').catch(() => {})
    );
  }
});

} /* end else (production only) */
