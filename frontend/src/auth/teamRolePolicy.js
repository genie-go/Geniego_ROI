/**
 * teamRolePolicy.js — 테넌트 내 팀 역할(team_role) 기반 쓰기 권한 정본(SSOT) · 183차 Phase3
 *
 * 멀티테넌트 신원체계 축:
 *   - plan(요금제)  : 메뉴/기능 접근 폭   → planMenuPolicy.js (직교 축)
 *   - team_role     : 같은 테넌트 내 쓰기 권한 위계 → 본 모듈
 *
 * 위계: owner > manager > member
 *   - owner   : 상위(본) 계정. 전체 쓰기 + 청구/구독/계정/팀 owner 변경 등 소유자 전용 동작.
 *   - manager : owner 가 위임한 운영자. 일반 업무 쓰기 가능, 소유자 전용 동작은 불가.
 *   - member  : 종속 하위계정. 기본 읽기 전용(모든 업무 쓰기 차단).
 *
 * 설계 원칙 (은행급 / 글로벌 SaaS + 기존 안정성):
 * 1. Fail-OPEN for unknown role: team_role 이 미지정(레거시 단독 회원/관리자/로컬 계정)이면
 *    'owner' 로 정규화하여 쓰기를 보존한다. (member 가 "명시적으로" 식별된 경우에만 제한)
 *    → 신원체계 미적용 기존 회원의 쓰기를 깨뜨리지 않는다.
 * 2. 제한은 오직 member(읽기전용) + manager 의 소유자 전용 동작에만 적용.
 * 3. admin/데모 우회는 소비처(AuthContext/writeGuard)에서 처리한다(본 모듈은 순수 정책).
 */

export const TEAM_ROLES = Object.freeze(["owner", "manager", "member"]);

/** team_role 정규화 — 미지정/비정상 값은 owner(쓰기 보존)로 처리 (fail-open) */
export function normalizeTeamRole(role) {
  const r = String(role || "").toLowerCase().trim();
  return TEAM_ROLES.includes(r) ? r : "owner";
}

/**
 * 소유자(owner) 전용 동작 — manager 도 수행 불가.
 * 청구/구독/계정 수명주기/팀 소유권 등 상위 계정 권한.
 */
export const OWNER_ONLY_ACTIONS = Object.freeze(
  new Set([
    "billing",            // 청구/결제수단
    "subscription",       // 구독 변경/해지
    "plan_change",        // 플랜 업·다운그레이드
    "account_delete",     // 계정 삭제
    "team_owner_change",  // 팀 소유권 이전
    "api_keys",           // API 키 발급/회수(플랫폼 키)
  ])
);

/**
 * 쓰기 가능 여부 (순수 정책 — admin/데모 우회는 소비처 책임).
 * @param {string} role   team_role
 * @param {string} [action]  소유자 전용 판정을 위한 동작 키(생략 시 일반 업무 쓰기)
 * @returns {boolean}
 */
export function canWrite(role, action) {
  const r = normalizeTeamRole(role);
  if (r === "member") return false;              // member = 읽기 전용
  if (r === "manager") return action ? !OWNER_ONLY_ACTIONS.has(action) : true;
  return true;                                    // owner = 전체
}

/** 읽기 전용 역할(member) 여부 */
export function isReadOnlyRole(role) {
  return normalizeTeamRole(role) === "member";
}

/** 소유자 전용 동작 여부 */
export function isOwnerOnlyAction(action) {
  return OWNER_ONLY_ACTIONS.has(action);
}
