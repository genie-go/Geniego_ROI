/**
 * Plan tier 단일 출처 (Single Source of Truth)
 * Bank-grade enterprise security baseline (152차 N-152-A)
 *
 * 보안 원칙:
 * 1. Immutable: Object.freeze + 외부 mutation 방어
 * 2. Audit: 모든 권한 비교는 audit hook 으로 telemetry 가능
 * 3. Fail-secure: 미정의 plan 은 최저 권한으로 폴백 + 경고 로그
 * 4. Type-safe: JSDoc + 입력 검증
 * 5. No leakage: 내부 enum 노출 없음 (조회 헬퍼만 export)
 *
 * 변경 이력:
 * - 152차: 신규 생성 (AuthContext PLAN_RANK / PLAN_RANK_LOCAL / PlanGate PLAN_RANK 통합)
 * - 152차 N-152-A: 은행급 보안 보강
 */

/* ──────────────────────────────────────────────────────────────────────── */
/* Internal: enum 정의 (외부 직접 접근 금지, 헬퍼 통해서만)                */
/* ──────────────────────────────────────────────────────────────────────── */

const _PLAN_RANK = Object.freeze({
  free:       0,
  demo:       0,
  starter:    1,
  growth:     2,
  pro:        3,
  enterprise: 4,
  admin:      5,
});

const _PLAN_LABEL = Object.freeze({
  free:       "Free",
  demo:       "Demo",
  starter:    "Starter",
  growth:     "Growth",
  pro:        "Pro",
  enterprise: "Enterprise",
  admin:      "Admin",
});

const _ADMIN_ROLE_RANK = Object.freeze({
  moderator:   1,
  admin:       2,
  super_admin: 3,
});

/* Tampering 검증용 무결성 해시 (런타임 변조 감지) */
const _INTEGRITY_SIGNATURE = (() => {
  const s = JSON.stringify({ p: _PLAN_RANK, l: _PLAN_LABEL, r: _ADMIN_ROLE_RANK });
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
})();

function _verifyIntegrity() {
  const s = JSON.stringify({ p: _PLAN_RANK, l: _PLAN_LABEL, r: _ADMIN_ROLE_RANK });
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  if (h !== _INTEGRITY_SIGNATURE) {
    // 변조 감지 — 보안 침해 가능성
    // eslint-disable-next-line no-console
    console.error("[SECURITY] plans.js integrity violation detected");
    if (typeof window !== "undefined" && window.__GENIE_AUDIT_HOOK) {
      try { window.__GENIE_AUDIT_HOOK("plan_integrity_violation", { signature: h }); } catch { /* 알림/감사 훅 실패 무시(best-effort) */ }
    }
    return false;
  }
  return true;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Public API                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * 알려진 plan 키 목록 (UI 드롭다운 / 검증용)
 * @returns {readonly string[]}
 */
export const KNOWN_PLANS = Object.freeze(Object.keys(_PLAN_RANK));

/**
 * 알려진 admin role 키 목록
 * @returns {readonly string[]}
 */
export const KNOWN_ADMIN_ROLES = Object.freeze(Object.keys(_ADMIN_ROLE_RANK));

/**
 * Plan 의 숫자 등급 반환
 * - 미정의 plan: 0 (free 동등) + 경고 로그 + audit hook
 * - 변조 감지 시: 0 강제 반환 (fail-secure)
 *
 * @param {string} plan
 * @returns {number}
 */
export function planRank(plan) {
  if (!_verifyIntegrity()) return 0;
  if (typeof plan !== "string" || !plan) {
    _logUnknown("planRank", plan, "empty_or_non_string");
    return 0;
  }
  if (!(plan in _PLAN_RANK)) {
    _logUnknown("planRank", plan, "unknown_plan");
    return 0;
  }
  return _PLAN_RANK[plan];
}

/* ──────────────────────────────────────────────────────────────────────── */
/* 동적 표시명 레지스트리 (202차) — admin 이 plan_config.name 을 바꾸면 전파       */
/* ──────────────────────────────────────────────────────────────────────── */
/**
 * plan_id → 표시명 동적 맵. AuthContext 가 public-plans 응답의 name 으로 주입한다.
 * ★ 등급(_PLAN_RANK)·ID 는 불변(권한 비교 안전). 표시명만 동적으로 전파 →
 *   관리자가 플랜명을 바꿔도 모든 화면 라벨이 즉시 일치하고, 기능/권한은 영향 없음.
 *   (integrity 서명 대상이 아니므로 변조 감지와 무관)
 */
let _dynamicLabels = Object.create(null);

/**
 * 동적 표시명 주입. 잘못된 입력은 무시(fail-safe). 빈 값/공백은 등록 안 함.
 * @param {Record<string,string>} map  { plan_id: 표시명 }
 */
export function setPlanLabels(map) {
  if (!map || typeof map !== "object") return;
  const next = Object.create(null);
  for (const [k, v] of Object.entries(map)) {
    if (typeof k === "string" && k && typeof v === "string" && v.trim()) {
      next[k] = v.trim();
    }
  }
  _dynamicLabels = next;
}

/**
 * Plan 의 사람-읽기 가능 라벨 반환
 * - 동적 표시명(admin 변경) 우선 → 정적 _PLAN_LABEL → 원본 문자열
 * - null/undefined: "Unknown"
 *
 * @param {string} plan
 * @returns {string}
 */
export function planLabel(plan) {
  if (typeof plan !== "string" || !plan) return "Unknown";
  if (_dynamicLabels[plan]) return _dynamicLabels[plan];   // admin 변경 표시명 우선(전파)
  if (plan in _PLAN_LABEL) return _PLAN_LABEL[plan];
  _logUnknown("planLabel", plan, "unknown_plan");
  return plan;
}

/**
 * plan A 가 plan B 등급 이상인지 비교
 * audit hook 으로 모든 비교 결과 telemetry 가능
 *
 * @param {string} plan      현재 사용자 plan
 * @param {string} required  요구 plan
 * @param {object} [ctx]     audit 컨텍스트 (feature, page 등)
 * @returns {boolean}
 */
export function planAtLeast(plan, required, ctx) {
  const userRank = planRank(plan);
  const reqRank  = planRank(required);
  const result   = userRank >= reqRank;
  _auditCompare("plan_compare", { plan, required, userRank, reqRank, result, ctx });
  return result;
}

/**
 * Admin role A 가 role B 등급 이상인지 비교
 *
 * @param {string} role
 * @param {string} required
 * @param {object} [ctx]
 * @returns {boolean}
 */
export function adminRoleAtLeast(role, required, ctx) {
  if (!_verifyIntegrity()) return false;
  const u = _ADMIN_ROLE_RANK[role] ?? 0;
  const r = _ADMIN_ROLE_RANK[required] ?? 0;
  const result = u >= r && u > 0;
  _auditCompare("admin_role_compare", { role, required, userRank: u, reqRank: r, result, ctx });
  return result;
}

/**
 * 알려진 plan 인지 검증 (UI 입력 검증용)
 * @param {string} plan
 * @returns {boolean}
 */
export function isKnownPlan(plan) {
  return typeof plan === "string" && plan in _PLAN_RANK;
}

/**
 * 알려진 admin role 인지 검증
 * @param {string} role
 * @returns {boolean}
 */
export function isKnownAdminRole(role) {
  return typeof role === "string" && role in _ADMIN_ROLE_RANK;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Internal: audit / telemetry                                             */
/* ──────────────────────────────────────────────────────────────────────── */

function _logUnknown(fn, value, reason) {
  if (typeof window !== "undefined" && window.__GENIE_AUDIT_HOOK) {
    try { window.__GENIE_AUDIT_HOOK("plan_unknown_input", { fn, value: String(value).slice(0, 100), reason }); } catch { /* 알림/감사 훅 실패 무시(best-effort) */ }
  }
  if (typeof window !== "undefined" && window.__GENIE_DEBUG_PLANS) {
    // eslint-disable-next-line no-console
    console.warn(`[plans] ${fn}: ${reason} for input:`, value);
  }
}

function _auditCompare(event, data) {
  if (typeof window !== "undefined" && window.__GENIE_AUDIT_HOOK) {
    try { window.__GENIE_AUDIT_HOOK(event, data); } catch { /* 알림/감사 훅 실패 무시(best-effort) */ }
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Legacy compat exports (deprecated, 153차 제거 예정)                     */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * @deprecated 직접 접근 금지. planRank() 사용. 152차 호환성용.
 */
export const PLAN_RANK = _PLAN_RANK;

/**
 * @deprecated 직접 접근 금지. planLabel() 사용. 152차 호환성용.
 */
export const PLAN_LABEL = _PLAN_LABEL;
