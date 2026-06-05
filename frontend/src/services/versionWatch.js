/* 196차 #1-B — 배포 감지 자동 업데이트.
 * 사용자가 수동 새로고침하지 않아도, 새 배포(기능 추가·오류 수정)가 나오면 감지해
 * 최신 버전으로 자동 반영한다. index.html 의 메인 번들 해시(index-XXXX.js)를 주기적으로
 * 확인 → 변경 감지 시 리스너에게 알림(App 이 다음 라우트 전환 때 자동 reload + 안내 배너).
 * ChunkLoadError 자동 reload(main.jsx)와 상호 보완.
 */
let initialBundle = null;
let newVersionAvailable = false;
let started = false;
const listeners = new Set();

async function fetchBundleId() {
  try {
    const r = await fetch('/?_vw=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store' } });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}

export function startVersionWatch(intervalMs = 60000) {
  if (typeof window === 'undefined' || started) return;
  started = true;
  fetchBundleId().then(id => { if (id) initialBundle = id; });
  const tick = async () => {
    if (newVersionAvailable) return;
    const id = await fetchBundleId();
    if (!id) return;
    if (!initialBundle) { initialBundle = id; return; }
    if (id !== initialBundle) {
      newVersionAvailable = true;
      listeners.forEach(fn => { try { fn(); } catch (e) {} });
    }
  };
  setInterval(tick, Math.max(30000, intervalMs));
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
}

export function onNewVersion(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function isNewVersionAvailable() { return newVersionAvailable; }
