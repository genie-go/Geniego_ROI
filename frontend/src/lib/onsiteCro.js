/* [R-P3-8] 온사이트 CRO 클라이언트 — 방문자 변형 배정(sticky) + 전환 추적.
 *   visitor_id 는 localStorage 영속(익명, PII 아님). assign 은 세션당 1회 권장(노출 중복 방지).
 *   백엔드가 hash(vid|key)로 결정론 배정 → 같은 방문자=항상 같은 변형. tenant 는 localStorage.tenantId. */
import { IS_DEMO } from '../utils/demoEnv.js';

const VID_KEY = 'genie_cro_vid';

function getVisitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) { v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(VID_KEY, v); }
    return v;
  } catch { return 'v_anon'; }
}

function tenant() {
  try { return localStorage.getItem('tenantId') || (IS_DEMO ? 'demo' : ''); } catch { return ''; }
}

/** 변형 배정(노출 기록). 반환: { variant, content } | null. 세션 sticky 캐시. */
export async function assignVariant(expKey) {
  if (!expKey) return null;
  const cacheKey = 'genie_cro_assigned_' + expKey;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* noop */ }
  const t = tenant(); if (!t) return null;
  try {
    const u = `/api/v424/cro/assign?key=${encodeURIComponent(expKey)}&vid=${encodeURIComponent(getVisitorId())}&tenant=${encodeURIComponent(t)}`;
    const r = await fetch(u);
    const d = await r.json();
    if (d && d.ok && d.variant) {
      const out = { variant: d.variant, content: d.content ?? null };
      try { sessionStorage.setItem(cacheKey, JSON.stringify(out)); } catch { /* noop */ }
      return out;
    }
  } catch { /* graceful */ }
  return null;
}

/** 전환 기록(방문자 변형 역산은 백엔드 해시). */
export async function trackConversion(expKey) {
  if (!expKey) return;
  const t = tenant(); if (!t) return;
  try {
    await fetch('/api/v424/cro/convert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: expKey, vid: getVisitorId(), tenant: t }),
    });
  } catch { /* graceful */ }
}
