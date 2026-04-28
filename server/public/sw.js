/* ?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═??   Geniego-ROI Service Worker
   - App Shell 캐싱 (?�프?�인 지??
   - 배경 ?�기??   - ?�시 ?�림
   ?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═??*/

/* ?�?� 개발 ?�경(localhost)?�서??SW 즉시 비활?�화 ?�?� */
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => {
    e.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => clients.claim())
    );
  });
  // 개발 ?�경?�서??모든 ?�청??그�?�??�트?�크�??�과
  self.addEventListener('fetch', () => { return; });
  /* ?�하 코드 ?�행 ????*/
} else {

const CACHE_NAME = 'geniego-roi-v4800';

const OFFLINE_URL = '/offline.html';

/* ?�?� ?????�일 목록 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/mobile.css',
];

/* ?�?� ?�치 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        /* ?��? 리소???�패?�도 ?�치 계속 */
      });
    })
  );
  self.skipWaiting();
});

/* ?�?� ?�성???�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
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

/* ══ Fetch 처리 ═══════════════════════════════════════════════════ */
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

  /* SPA 네비게이션 요청 (HTML) → 항상 index.html (/) 반환하여 React Router가 처리 */
  const isNavigationRequest = request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));

  if (isNavigationRequest) {
    e.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', clone); // 항상 루트로 캐시 업데이트
            });
          }
          return response;
        })
        .catch(() => {
          // 오프라인 → 캐시된 index.html 반환 (SPA 라우팅 지원)
          return caches.match('/').then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  /* 정적 자산: 네트워크 우선, 실패 시 캐시 */
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
          return new Response('', { status: 503 });
        });
      })
  );
});

/* ?�?� ?�시 ?�림 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  const title = data.title || 'Geniego-ROI';
  const options = {
    body: data.body || '?�로???�림???�습?�다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '?�인' },
      { action: 'close', title: '?�기' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

/* ?�?� ?�림 ?�릭 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
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

/* ?�?� 배경 ?�기???�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?� */
self.addEventListener('sync', (e) => {
  if (e.tag === 'background-sync') {
    e.waitUntil(
      fetch('/api/auth/me').catch(() => {})
    );
  }
});

} /* end else (production only) */
