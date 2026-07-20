# DSAR — JIT Access Governance: 오류 계약 (Part 3-9 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §30 Error Contract = JIT elevation 수명주기의 **결정론적 실패 코드 7종**이다. 안전한 실패(fail-secure·ADR §D-3)를 위해 모호한 상태는 모두 명시적 거부 코드로 표면화한다.

| 코드 | 발생 시점(SPEC 매핑) |
|---|---|
| `JIT_REQUEST_NOT_FOUND` | Request ID 미존재(§3 Request Registry 조회 실패) |
| `JIT_APPROVAL_REQUIRED` | 승인 미완 상태에서 grant 사용 시도(§7 Approval Workflow) |
| `JIT_SESSION_EXPIRED` | Elevation Session 만료 후 접근(§11 Session·§28 Expired) |
| `JIT_ELEVATION_DENIED` | Eligibility/Risk 평가 거부(§5·§6) |
| `JIT_POLICY_BLOCKED` | Elevation Policy 위반(§28 Policy Violation) |
| `JIT_EXTENSION_DENIED` | 연장 재승인·재위험평가 실패(§16 Extension) |
| `JIT_AUTO_REVOCATION_FAILED` | 자동회수 집행 실패(§14 Auto Revocation) |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 오류 코드 | 근접 substrate (파일:라인) | 상태 |
|---|---|---|
| `JIT_SESSION_EXPIRED` | 세션 만료 게이트 `UserAuth.php:249-284`·api_key 만료 401 `index.php:518`(GT①§4-D) — 세션/키축 만료 신호는 실존, elevation 코드체계는 부재 | PARTIAL |
| `JIT_APPROVAL_REQUIRED` | approved-only 거부 `Alerting.php:684-686`(status!=='approved')(GT①§4-B) — 마케팅 action_request용(KEEP_SEPARATE) | 재활용 |
| `JIT_ELEVATION_DENIED` | impersonate 상승 차단 가드 `UserAdmin.php:466-469`(하향 전용)(GT①§4-C) — elevation 거부 코드 아님 | 오근접 |
| `JIT_REQUEST_NOT_FOUND` / `JIT_POLICY_BLOCKED` / `JIT_EXTENSION_DENIED` / `JIT_AUTO_REVOCATION_FAILED` | Request Registry·Elevation Policy·Extension·Auto-expiry(권한축) **grep 0**(GT②표 §2·B-9) | ABSENT |

- **정직 경계**: 만료 신호(세션/키)는 실존하나 JIT 도메인 전용 오류 코드 네임스페이스(`JIT_*`)는 전무하다(GT②§1 `jit_*` 테이블/핸들러/라우트 전무). 위 재활용은 **신호원**일 뿐 코드 계약 자체는 순신규.

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

| 규칙 | 계약 내용 |
|---|---|
| E-1 fail-secure 매핑 | 모호·미승인·만료는 반드시 위 7코드 중 하나로 거부(silent-allow 금지·ADR §D-3). |
| E-2 상태 정합 | `JIT_SESSION_EXPIRED`는 Runtime Guard(§28 Expired) lazy gate와 동일 판정을 코드화 — 이중정의 금지. |
| E-3 승인 코드 분리 | `JIT_APPROVAL_REQUIRED`는 elevation 결재 미완용. 마케팅 `action_request` approved-only 게이트와 **동일 코드 공유 금지**(KEEP_SEPARATE). |
| E-4 회수 실패 표면화 | `JIT_AUTO_REVOCATION_FAILED`는 조용히 삼키지 않고 High-risk 감사(SecurityAudit)로 승격. |
| E-5 증거 결선 | 모든 거부 코드는 Evidence(§26)·SecurityAudit 불변체인(`SecurityAudit.php:12-53`)에 기록. |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- `action_request` 거부/미승인(`Alerting.php:684-686`·GT②B-1) — 마케팅 결재 실패이지 elevation 오류 아님.
- plan 게이팅 거부 `UserAuth.php:364`·`:77`(GT②B-3) — 구독 등급 미달이지 JIT 거부 아님.
- api_key 401(`index.php:518`·GT②B-5) — 자격증명 만료이지 elevation session expired 아님(신호는 재활용, 코드는 분리).
- MFA 실패 `UserAuth.php:930`(GT②B-6) — 2단계 인증 실패이지 JIT 거부 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Error Contract = ABSENT(JIT 네임스페이스) / 만료·승인 신호원만 재활용.** 7코드 중 세션만료 계열은 세션/키 만료 게이트를 신호원으로 재사용, 승인계열은 `Alerting.php:684-686` 상태거부 패턴을 재사용하되 **JIT 전용 코드·경로로 신설**한다. Registry/Policy/Extension/Auto-Revocation 코드는 대응 substrate가 없어 순신규. 코드 변경 0 · Part 1~3-8 인증 후 RP-track(BLOCKED_PREREQUISITE).
