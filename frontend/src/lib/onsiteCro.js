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
 * [246차 P2 · 260차 WYSIWYG 패리티] 노코드 변형 체인지셋 적용 — assign.changes 를 DOM 에 반영(Optimizely식).
 *   change: { selector, action, value, prop? }.
 *   action: text|html|css(prop)|hide|remove|attr(prop=속성명)|class(prop=add|remove)|insert(prop=before|after|prepend|append)|img|redirect.
 *   graceful(요소 없으면 skip). 실 방문자 변형 B 적용기 — 에디터·백엔드 화이트리스트와 3자 정합.
 */
// [289차후속 XSS] 위험 URL 스킴(javascript:/data:/vbscript:) 차단 — redirect/img 값이
//   CRO 에디터에서 저자되므로 저권한 팀원이 스토어프론트/미리보기에 스크립트 URL 을 주입하지 못하게 한다.
//   (attr 의 on* 가드와 동일한 경량 방어 · lib 독립 유지 위해 외부 의존성 미도입.)
function _croSafeUrl(v) {
  const s = String(v ?? '').trim();
  return /^(javascript|data|vbscript):/i.test(s) ? '' : s;
}

export function applyChanges(changes) {
  if (!Array.isArray(changes)) return;
  for (const c of changes) {
    try {
      if (!c || !c.action) continue;
      if (c.action === 'redirect' && c.value) { const u = _croSafeUrl(c.value); if (u) location.href = u; return; }
      const els = c.selector ? document.querySelectorAll(c.selector) : [];
      els.forEach(el => {
        switch (c.action) {
          case 'text': el.textContent = String(c.value ?? ''); break;
          case 'html': el.innerHTML = String(c.value ?? ''); break;
          case 'hide': el.style.display = 'none'; break;
          case 'remove': el.parentNode && el.parentNode.removeChild(el); break;
          case 'css': if (c.prop) el.style.setProperty(c.prop, String(c.value ?? '')); break;
          case 'attr': if (c.prop && !/^on/i.test(c.prop)) el.setAttribute(c.prop, String(c.value ?? '')); break;
          case 'class':
            if (c.value) { const cls = String(c.value).trim().split(/\s+/); if (c.prop === 'remove') el.classList.remove(...cls); else el.classList.add(...cls); }
            break;
          case 'insert': {
            const pos = { before: 'beforebegin', after: 'afterend', prepend: 'afterbegin', append: 'beforeend' }[c.prop] || 'afterend';
            el.insertAdjacentHTML(pos, String(c.value ?? ''));
            break;
          }
          case 'img': if (c.value) { const iu = _croSafeUrl(c.value); if (iu) { el.setAttribute('src', iu); el.removeAttribute('srcset'); } } break;
          default: break;
        }
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
