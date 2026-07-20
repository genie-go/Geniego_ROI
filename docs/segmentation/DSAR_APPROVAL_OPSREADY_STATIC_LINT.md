# DSAR — OpsReady Static Lint (Part 3-25 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

OpsReady Static Lint는 **배포 이전(pre-deploy) 정적 검증 게이트**다. 릴리스 아티팩트/문서/구성이 운영 준비 기준을 정적으로 충족하는지 파이프라인 단계에서 검사하며, 위반 시 파이프라인을 실패(fail-closed)시킨다. 6종 lint 규칙:

- **Missing Runbook** — 운영 런북 문서 부재.
- **Missing Rollback Plan** — 롤백 절차 명세 부재.
- **Missing Approval** — maker-checker 승인 아티팩트 부재.
- **Missing Evidence** — 검증·인증 근거(evidence) 링크 부재.
- **Hardcoded Environment Variable** — 소스에 하드코딩된 환경변수/시크릿.
- **Incomplete Documentation** — 필수 운영 문서 섹션 누락.

Lint는 CI 정적 단계에서 수행하며 런타임 부작용 0. 규칙 위반은 §26 에러(예: `RELEASE_VALIDATION_FAILED`)로 매핑.

## 2. Substrate 매핑

| Lint 규칙 | 현존 substrate (①②) | 인용 | 관계 |
|---|---|---|---|
| Missing Rollback Plan | 마이그레이션 롤백 경로(baseline) | `backend/bin/migrate.php:94-133` | 롤백 절차 기준 |
| Missing Approval | maker-checker 승인 아티팩트 | `backend/src/Handlers/Mapping.php:238-291` | 승인 존재 검사 |
| Hardcoded Environment Variable | 시크릿 스캔(정적 CI) | `.github/workflows/security-scan.yml:72-82`·`:126-144` | 스캔 substrate 확장 |
| Missing Runbook | (RUNBOOK glob) | glob 0 | ABSENT·순신설 |
| Missing Evidence | (evidence 링크 검증) | 파일 부재 | ABSENT·순신설 |
| Incomplete Documentation | (문서 섹션 린터) | 파일 부재 | ABSENT·순신설 |

## 3. 설계 계약

- Static Lint는 CI 파이프라인 정적 단계에 배선하며 opsready 전용 린터는 순신설이다.
- Hardcoded Env 규칙은 기존 `security-scan.yml:72-82`(스캔 잡)·`:126-144`(리포트)의 시크릿 스캔을 확장 소비하고 중복 스캐너를 신설하지 않는다.
- Missing Rollback Plan은 `migrate.php:94-133`의 마이그레이션 롤백 경로를 baseline 절차로 참조.
- Missing Runbook은 RUNBOOK glob 0 실측에 근거해 **문서 존재 검사**를 순신설.
- 규칙은 검사·기록만 수행하며 아티팩트를 변경하지 않는다(비파괴).

## 4. 판정

**ABSENT — greenfield.** OpsReady 전용 static lint 게이트는 전무하며 RUNBOOK glob은 0이다. Hardcoded Env(`security-scan.yml:72-82`·`:126-144`)·Missing Approval(`Mapping.php:238-291`)·Missing Rollback Plan(`migrate.php:94-133`) substrate만 존재하며 이를 소비·확장하는 순신설 린터로 설계한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
