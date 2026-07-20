# DSAR — OpsReady Error Contract (Part 3-25 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

OpsReady Error Contract는 Runtime Guard(§24)·Static Lint(§25)·API(§28)가 **hard-fail(집행 거부)** 시 반환하는 정규 에러코드 7종을 정의한다. 모든 코드는 fail-closed 의미론이며 발생 시 운영 전환은 차단된다.

- **PLATFORM_NOT_READY** — 플랫폼 준비 상태 미확정(READY 아님).
- **OPERATIONAL_READINESS_FAILED** — 준비도 평가 종합 실패.
- **DEPLOYMENT_BASELINE_INVALID** — 승인 baseline과 이탈/부재.
- **RELEASE_VALIDATION_FAILED** — 릴리스 패키지 정적 검증 실패.
- **CUTOVER_FAILED** — 운영 전환(cutover) 집행 실패.
- **GO_LIVE_BLOCKED** — go-live 권한/게이트 미충족 차단.
- **PRODUCTION_CERTIFICATION_FAILED** — 운영 인증 부재·실패.

## 2. Substrate 매핑

| 에러코드 | 트리거 축 (①②) | 인용/상태 | 관계 |
|---|---|---|---|
| DEPLOYMENT_BASELINE_INVALID | Baseline Drift(§24) | `backend/src/Db.php:43-48` | baseline 소스 |
| PRODUCTION_CERTIFICATION_FAILED | Missing Cert(§24) | `backend/src/SecurityAudit.php:25-31` | 인증 부재 판정 |
| GO_LIVE_BLOCKED | Unauthorized Go-Live(§24) | 발생원 부재 | ABSENT·순신설 |
| PLATFORM_NOT_READY | Guard 종합 | 발생원 부재 | ABSENT·순신설 |
| OPERATIONAL_READINESS_FAILED | Readiness 평가 | 발생원 부재 | ABSENT·순신설 |
| RELEASE_VALIDATION_FAILED | Static Lint(§25) | 발생원 부재 | ABSENT·순신설 |
| CUTOVER_FAILED | Cutover 집행 | 발생원 부재 | ABSENT·순신설 |

## 3. 설계 계약

- 7종 에러코드는 **전부 순신규 심볼**로 코드베이스 grep 0이며 발생원(throw site) 부재.
- 각 코드는 §24 Guard 위반·§25 Lint 규칙·§28 API 실패에 1:1 매핑되며 별도 에러 도메인을 신설하지 않고 opsready 네임스페이스로 통일.
- DEPLOYMENT_BASELINE_INVALID는 `Db.php:43-48` baseline diff, PRODUCTION_CERTIFICATION_FAILED는 `SecurityAudit.php:25-31` 인증 부재를 근거로 발생.
- 에러 계약은 상태 변경 없이 fail-closed 반환만 규정(비파괴).

## 4. 판정

**ABSENT — greenfield.** 7종 에러코드는 모두 신규이며 발생원이 부재하다(grep 0). Baseline(`Db.php:43-48`)·Cert(`SecurityAudit.php:25-31`) substrate만 판정 근거로 존재하며 나머지 트리거는 순신설이다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
