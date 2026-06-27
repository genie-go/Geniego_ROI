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

/** [246차 P2] 방문자 컨텍스트 — 세그먼트 타겟팅용(기기·신규/재방문). PII 아님. */
function visitorCtx() {
  let dev = 'desktop';
  try { if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) dev = 'mobile'; } catch { /* noop */ }
  let vis = 'returning';
  try { if (!localStorage.getItem('genie_cro_seen')) { vis = 'new'; localStorage.setItem('genie_cro_seen', '1'); } } catch { /* noop */ }
  let src = '';
  try { src = new URLSearchParams(location.search).get('utm_source') || ''; } catch { /* noop */ }
  return { dev, vis, src };
}

/**
 * [246차 P2] 노코드 변형 체인지셋 적용 — assign.changes 를 DOM 에 반영(Optimizely식).
 *   change: { selector, action: text|html|css|hide|redirect, value, prop? }. graceful(요소 없으면 skip).
 */
export function applyChanges(changes) {
  if (!Array.isArray(changes)) return;
  for (const c of changes) {
    try {
      if (!c || !c.action) continue;
      if (c.action === 'redirect' && c.value) { location.href = String(c.value); return; }
      const els = c.selector ? document.querySelectorAll(c.selector) : [];
      els.forEach(el => {
        if (c.action === 'text') el.textContent = String(c.value ?? '');
        else if (c.action === 'html') el.innerHTML = String(c.value ?? '');
        else if (c.action === 'hide') el.style.display = 'none';
        else if (c.action === 'css' && c.prop) el.style.setProperty(c.prop, String(c.value ?? ''));
      });
    } catch { /* graceful — 개별 변경 실패 무시 */ }
  }
}

/** 변형 배정(노출 기록). 반환: { variant, content, changes } | null. 세션 sticky 캐시. applyChanges 옵션 자동적용. */
export async function assignVariant(expKey, { autoApply = false } = {}) {
  if (!expKey) return null;
  const cacheKey = 'genie_cro_assigned_' + expKey;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { const o = JSON.parse(cached); if (autoApply) applyChanges(o.changes); return o; }
  } catch { /* noop */ }
  const t = tenant(); if (!t) return null;
  try {
    const ctx = visitorCtx();
    const u = `/api/v424/cro/assign?key=${encodeURIComponent(expKey)}&vid=${encodeURIComponent(getVisitorId())}&tenant=${encodeURIComponent(t)}`
      + `&dev=${encodeURIComponent(ctx.dev)}&vis=${encodeURIComponent(ctx.vis)}&src=${encodeURIComponent(ctx.src)}`;
    const r = await fetch(u);
    const d = await r.json();
    if (d && d.ok && d.variant) {
      const out = { variant: d.variant, content: d.content ?? null, changes: d.changes ?? null };
      try { sessionStorage.setItem(cacheKey, JSON.stringify(out)); } catch { /* noop */ }
      if (autoApply) applyChanges(out.changes);
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
