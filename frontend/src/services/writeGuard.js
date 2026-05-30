/**
 * writeGuard.js — team_role(member) 읽기전용 강제 · 183차 Phase3 (FE 중앙 인터셉터)
 *
 * apiClient 의 mutating 함수(POST/PUT/PATCH/DELETE)에 삽입되어, 읽기전용 멤버(team_role='member')의
 * 쓰기 호출을 네트워크 전송 전에 차단한다. 116개 페이지를 개별 수정하지 않고 광범위 커버하는 토대.
 *
 * 설계(기존 안정성 + fail-open):
 * - 데모 모드 / admin 플랜 / local_admin 토큰 / 비로그인 / /auth·인증 경로 → 차단하지 않음.
 * - team_role 이 "명시적으로 member" 인 경우에만 차단. 읽기(GET)·미지정 역할은 통과.
 * - localStorage 파싱 실패 등 어떤 예외든 통과(fail-open) — 정책 불확실 시 기존 동작 보존.
 * - 차단 시 window 'rbac-write-denied' 이벤트 발행(토스트) + RbacWriteError throw(전송 차단).
 *
 * 백엔드 강제(세션토큰→app_user→team_role 미들웨어 브릿지)는 Phase3b 후속(방어 심층화).
 */
import { isReadOnlyRole } from "../auth/teamRolePolicy.js";

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";
const USER_KEY = IS_DEMO ? "demo_genie_user" : "genie_user";
const TOKEN_KEY = IS_DEMO ? "demo_genie_token" : "genie_token";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 차단 예외 경로 — 인증 수명주기(로그인/로그아웃/me/가입/팀관리)는 BE 가 권위 */
function isExemptPath(path) {
  if (typeof path !== "string") return true;
  // 쿼리스트링 제거 후 prefix 판정
  const p = path.split("?")[0];
  return (
    p.startsWith("/auth/") ||
    p.startsWith("/api/auth/") ||
    p.includes("/auth/login") ||
    p.includes("/auth/logout")
  );
}

export class RbacWriteError extends Error {
  constructor(message) {
    super(message);
    this.name = "RbacWriteError";
    this.rbacDenied = true;
  }
}

const DENY_MSG_FALLBACK =
  "읽기 전용 멤버 계정입니다 — 이 작업은 관리자(owner) 또는 매니저만 수행할 수 있습니다.";

/** 현재 세션 사용자(localStorage 캐시) 안전 파싱 */
function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

/**
 * 쓰기 호출 가드. 차단 대상이면 RbacWriteError throw.
 * @param {string} method  HTTP 메서드
 * @param {string} path    요청 경로
 */
export function guardWrite(method, path) {
  try {
    const m = String(method || "").toUpperCase();
    if (!MUTATING.has(m)) return;            // 읽기는 통과
    if (IS_DEMO) return;                      // 데모 = 전체 엔터프라이즈 경험
    if (isExemptPath(path)) return;          // 인증 수명주기 통과

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (token.startsWith("local_admin_") || token.startsWith("local__")) return; // 로컬 관리자

    const user = readUser();
    if (!user) return;                        // 비로그인(공개 호출) 통과
    if (user.plan === "admin") return;        // 플랫폼 admin 우회
    if (!isReadOnlyRole(user.team_role)) return; // member 가 아니면 통과(owner/manager/미지정)

    // ── 여기 도달 = 읽기전용 member 의 쓰기 시도 → 차단 ──
    try {
      window.dispatchEvent(
        new CustomEvent("rbac-write-denied", {
          detail: { method: m, path, role: "member", message: DENY_MSG_FALLBACK },
        })
      );
    } catch { /* 이벤트 발행 실패는 무시 */ }
    throw new RbacWriteError(DENY_MSG_FALLBACK);
  } catch (e) {
    if (e instanceof RbacWriteError) throw e; // 차단은 전파
    // 그 외 예외(localStorage 등) = fail-open
    return;
  }
}
