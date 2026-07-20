# DSAR — Runtime SoD Enforcement: 에러 계약 (Part 3-10 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §33 Error Contract는 SoD 차단·거부 시 반환하는 7종 표준 에러코드다: `SOD_CONFLICT_DETECTED`·`SOD_RULE_NOT_FOUND`·`SOD_RUNTIME_BLOCKED`·`SOD_EXCEPTION_EXPIRED`·`SOD_OVERRIDE_DENIED`·`SOD_COMPENSATING_CONTROL_REQUIRED`·`SOD_POLICY_VIOLATION`. §31 Runtime Guard의 차단 결과를 호출자에게 전달하는 계약이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §33 코드 | 판정 | 인접 substrate(재활용 패턴) | GT 인용 |
|---|---|---|---|
| SOD_CONFLICT_DETECTED | **ABSENT** | 충돌 판정 자체 부재 → 전용 코드 0 | GT②2.2 Runtime Evaluator ABSENT |
| SOD_RULE_NOT_FOUND | **ABSENT** | Conflict Rule Registry grep 0 | GT②2 첫 행 |
| SOD_RUNTIME_BLOCKED | ABSENT(패턴만 재활용) | approved-only 409 execute 차단 패턴 | `Alerting.php:684-688`(GT①§B) |
| SOD_EXCEPTION_EXPIRED | **ABSENT** | SoD 예외 자동종료 워크플로 부재 | GT②2·SPEC §19 |
| SOD_OVERRIDE_DENIED | ABSENT(패턴만) | break-glass 비상경로(사후감사) substrate | `UserAuth.php:790-801`(GT①§F) |
| SOD_COMPENSATING_CONTROL_REQUIRED | ABSENT(패턴만) | MFA 강제(`mfa_policy` off/admin/all) substrate | `UserAuth.php:929-961`·`:940-945`(GT①§F) |
| SOD_POLICY_VIOLATION | ABSENT(패턴만) | self-approval 403·정족수 409·미확인신원 403 거부 관용구 | `Mapping.php:268-271`·`:287`·`:186-190`(GT①§A) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **7코드 전부 순신규 상수**: SoD 도메인 전용 에러코드는 grep 0. 기존 HTTP 상태(403 인가거부·409 정족수/중복)의 **반환 관용구를 재사용**하되 SoD 전용 코드·사유를 신규 정의.
- **차단 사유 매핑**: `SOD_CONFLICT_DETECTED`/`SOD_RUNTIME_BLOCKED`는 §31 Runtime Guard 6종 차단(SoD·Critical Conflict)을; `SOD_EXCEPTION_EXPIRED`는 §19 자동종료; `SOD_OVERRIDE_DENIED`는 §20 Emergency Override 남용; `SOD_COMPENSATING_CONTROL_REQUIRED`는 §21(추가승인/강화MFA) 요구를 표현.
- **증거 연동**: 모든 거부 응답은 SecurityAudit 불변체인 기록과 대응(`SecurityAudit.php:14-33`, ADR D-5). Explain(§35 Explain Conflict)과 코드-사유 정합.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **HTTP 409 Conflict ≠ SOD_CONFLICT_DETECTED**: 기존 409(정족수 미달·중복승인 `Mapping.php:278-283`·`Alerting.php:634-640`, sync/merge conflict)는 dual-control·데이터충돌이지 SoD role-conflict 아님(GT② B-1·B-2). 코드 흡수 금지.
- **자기승인 403 ≠ SOD_POLICY_VIOLATION**: `Mapping.php:268-271` "self-approval not allowed"는 dual-control 위반 메시지이지 SoD 정책위반 코드가 아님(GT② B-2). 관용구 재사용하되 개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

Error Contract **7코드 전부 ABSENT·순신규**. 거부 반환 관용구(403/409)·break-glass·MFA는 **재활용 패턴**이나 SoD 전용 코드 자체는 그린필드. 코드 변경 0·NOT_CERTIFIED. 선행: §31 Runtime Guard·Conflict Rule 신설 후 결선(BLOCKED_PREREQUISITE).
