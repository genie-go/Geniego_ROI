/**
 * [CWIS Part004-02] Navigation Registry 클라이언트.
 *
 * ★무후퇴 원칙: 본 모듈은 **레거시 사이드바를 대체하지 않는다**. Sidebar.jsx 는 그대로
 *   `sidebarManifest.js` 정적 정의를 렌더하며(항목·순서·권한 동작 불변), 본 클라이언트는
 *   ① 관리자 진단(Registry/Shadow Compare) ② Part004-03 점진 전환의 데이터 소스로만 쓰인다.
 *   전환 스위치는 Part004-03 에서 도입하고, 그 전까지 렌더 경로에 영향이 없다.
 *
 * ★정직 미산출: 스냅샷이 없거나 검증 미통과면 서버가 503 + reason 을 준다. 빈 트리를
 *   '메뉴 없음'으로 오독하지 않도록 available=false 를 그대로 전달한다.
 */

const BASE = () => import.meta.env.VITE_API_BASE || '';

/** 세션 토큰 — apiClient 와 동일 키 규약(데모/운영 분리). */
function authHeaders(token) {
  const t = token || localStorage.getItem(
    import.meta.env.VITE_DEMO_MODE === 'true' ? 'demo_genie_token' : 'genie_token'
  );
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function getJson(path, { token, etag } = {}) {
  const headers = { ...authHeaders(token) };
  if (etag) headers['If-None-Match'] = etag;
  const res = await fetch(`${BASE()}${path}`, { headers, credentials: 'omit' });
  if (res.status === 304) return { notModified: true, etag };
  const json = await res.json().catch(() => null);
  return { status: res.status, etag: res.headers.get('ETag'), json };
}

/**
 * 현재 사용자에게 허용된 내비게이션 트리.
 * @param {{platform?:string, locale?:string, includeBadges?:boolean, token?:string, etag?:string}} opts
 */
export async function fetchNavigationTree(opts = {}) {
  const q = new URLSearchParams();
  if (opts.platform) q.set('platform', opts.platform);
  if (opts.locale) q.set('locale', opts.locale);
  if (opts.includeBadges) q.set('include_badges', '1');
  const qs = q.toString();
  return getJson(`/api/v425/pm/navigation${qs ? `?${qs}` : ''}`, opts);
}

/** 관리자 — 레지스트리 전체 + 빌드 검증 결과. */
export async function fetchRegistry(opts = {}) {
  return getJson('/api/v425/pm/navigation/registry', opts);
}

/** 관리자 — 런타임 재검증. */
export async function validateRegistry(token) {
  const res = await fetch(`${BASE()}/api/v425/pm/navigation/validate`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, credentials: 'omit',
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** 관리자 — 레거시 ↔ 레지스트리 차이(전환 안전성 측정). 사용자 화면에는 영향 없음. */
export async function fetchShadowCompare(opts = {}) {
  return getJson('/api/v425/pm/navigation/shadow-compare', opts);
}

/**
 * 관리자 — 특정 프로필 기준 예상 메뉴.
 * ★실제 권한 변경/임퍼소네이트 없음(서버가 body 의 tenant_id 를 무시하고 자기 테넌트로만 계산).
 */
export async function previewNavigation({ principalType = 'USER', plan = 'free', platform = 'WEB_DESKTOP', token } = {}) {
  const res = await fetch(`${BASE()}/api/v425/pm/navigation/preview`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ principal_type: principalType, plan, platform }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** 관리자 — 테넌트 메뉴 재정의 목록/등록/삭제. 보안 조건(권한·등급·스코프)은 서버가 구조적으로 차단한다. */
export async function listOverrides(opts = {}) {
  return getJson('/api/v425/pm/navigation/overrides', opts);
}

export async function upsertOverride({ menuKey, overrideType, overrideValue, token }) {
  const res = await fetch(`${BASE()}/api/v425/pm/navigation/overrides`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ menu_key: menuKey, override_type: overrideType, override_value: overrideValue }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

export async function removeOverride({ publicId, token }) {
  const res = await fetch(`${BASE()}/api/v425/pm/navigation/overrides/${encodeURIComponent(publicId)}/remove`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, credentials: 'omit',
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** 트리를 평탄화(메뉴 키 목록) — 진단·비교용. */
export function flattenTree(nodes, out = []) {
  for (const n of nodes || []) {
    out.push(n.menu_key);
    if (n.children?.length) flattenTree(n.children, out);
  }
  return out;
}

export default {
  fetchNavigationTree, fetchRegistry, validateRegistry, fetchShadowCompare,
  previewNavigation, listOverrides, upsertOverride, removeOverride, flattenTree,
};
