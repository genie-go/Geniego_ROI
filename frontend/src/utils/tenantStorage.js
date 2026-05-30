/**
 * 멤버(테넌트) 격리 localStorage 헬퍼 — 회원 간 데이터 오염 방지 (은행·공공기관급).
 * ──────────────────────────────────────────────────────────────────────────
 * ★ 원칙: 같은 브라우저에서 회원 A 로그아웃 → 회원 B 로그인 시, A의 비즈니스 데이터가
 *   B에게 단 한 건도 노출되면 안 됨. **같은 구독 플랜이라도 tenantId 가 다르면 완전 분리.**
 *
 * 동작:
 *   - 키를 현재 tenantId 로 네임스페이스(`base::t=<tenant>`) → 회원별 저장소가 물리적으로 분리.
 *   - 데모: tenantId='demo' → 데모 사용자 공유 샌드박스 유지(179차 하이브리드 누적 설계 의도).
 *   - 미인증(anon): 'anon' 버킷 → 로그인 전 임시값이 회원 데이터에 섞이지 않음.
 *
 * 사용처: 회원 비즈니스 데이터/설정을 localStorage 에 영속하는 모든 경로
 *   (catalog 가격·매핑, plan 요금, email 템플릿, api keys, writeback/approval/ih/ai_policy cfg 등).
 *   UI 프리퍼런스(theme/sidebar/lang/tour)는 디바이스 단위라 스코프 불요.
 */

import { IS_DEMO } from './demoEnv';

export function currentTenant() {
  try {
    // 데모: 단일 공유 샌드박스(체험자 공통). 운영 격리와 무관.
    if (IS_DEMO) return 'demo';
    // 운영: 명시 tenantId(로그인 시 영속) 우선
    const explicit = localStorage.getItem('tenantId') || localStorage.getItem('X-Tenant-Id') || localStorage.getItem('x-tenant-id');
    if (explicit) return explicit;
    // 폴백: 저장된 user 객체의 tenant_id → company → id (백엔드 tenant_id 도입 전/유실 대비)
    const raw = localStorage.getItem('genie_user') || localStorage.getItem('demo_genie_user');
    if (raw) {
      const u = JSON.parse(raw);
      const t = u && (u.tenant_id || u.tenantId || u.company || (u.id != null ? 'u' + u.id : ''));
      if (t) return String(t);
    }
    return 'anon';
  } catch {
    return 'anon';
  }
}

export function tScopedKey(base) {
  return `${base}::t=${currentTenant()}`;
}

export function tGet(base) {
  try { return localStorage.getItem(tScopedKey(base)); } catch { return null; }
}

export function tSet(base, val) {
  try { localStorage.setItem(tScopedKey(base), val); } catch { /* quota — ignore */ }
}

export function tRemove(base) {
  try { localStorage.removeItem(tScopedKey(base)); } catch { /* ignore */ }
}

/** JSON 편의 래퍼 */
export function tGetJSON(base, fallback) {
  try { const s = tGet(base); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
export function tSetJSON(base, obj) {
  try { tSet(base, JSON.stringify(obj)); } catch { /* ignore */ }
}

export default { currentTenant, tScopedKey, tGet, tSet, tRemove, tGetJSON, tSetJSON };
