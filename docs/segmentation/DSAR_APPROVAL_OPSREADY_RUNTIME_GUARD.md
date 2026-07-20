# DSAR — OpsReady Runtime Guard (Part 3-25 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

OpsReady Runtime Guard는 플랫폼 최종 통합·운영 준비(Part 3-25) 국면에서 **런타임 집행점(enforcement point)** 을 정의한다. 운영 전환(cutover)·릴리스 승격 경로에서 다음 6종 위반을 **집행 시점에 차단**한다.

- **Unapproved Deployment** — maker-checker 승인 레코드 없는 배포 집행.
- **Invalid Release Package** — 무결성/서명/매니페스트 미검증 릴리스 패키지.
- **Missing Production Certification** — 운영 인증서(certification) 부재·만료.
- **Baseline Drift** — 승인된 구성 baseline과 런타임 구성의 이탈.
- **Unauthorized Go-Live** — 권한 없는 주체의 go-live 트리거.
- **Invalid Rollback Execution** — 승인·계획 없는 롤백 집행.

Guard는 **Fail-closed**: 준비 상태(readiness)가 확정 GREEN이 아니면 집행 거부(READY 미확정=차단). 승인·인증·baseline 3축 중 하나라도 미충족 시 `PLATFORM_NOT_READY` 계열 에러(§26)로 종료.

## 2. Substrate 매핑

| Guard 축 | 현존 substrate (①②) | 인용 | 관계 |
|---|---|---|---|
| Unapproved Deployment | Mapping maker-checker 승인 파이프라인 | `backend/src/Handlers/Mapping.php:238-291`·`:267-269` | 승인 상태 재사용(확장) |
| Missing Production Certification | SecurityAudit append-only 인증 기록 | `backend/src/SecurityAudit.php:25-31` | 인증 서명 substrate |
| Baseline Drift | Db 구성 baseline(env 파싱) | `backend/src/Db.php:43-48` | drift 비교 기준값 |
| Invalid Release Package | (릴리스 무결성 검증 계층) | 파일 부재 | ABSENT·순신설 |
| Unauthorized Go-Live | (go-live 권한 게이트) | 파일 부재 | ABSENT·순신설 |
| Invalid Rollback Execution | (롤백 승인 게이트) | 파일 부재 | ABSENT·순신설 |

## 3. 설계 계약

- Guard는 **집행 전(pre-execution) 인터셉터**로 배선하며 신규 opsready 런타임 계층은 순신설이다(grep 0).
- 승인 판정은 재구현하지 않고 `Mapping.php:238-291`의 maker-checker 상태를 소비한다(`:267-269` 검증분기). 인증 서명은 `SecurityAudit.php:25-31`로 append-only 기록.
- Baseline Drift는 `Db.php:43-48` 구성값을 baseline 스냅샷으로 삼아 런타임 구성과 diff.
- 6종 위반은 §26 에러 계약으로 매핑되며 Guard 자체는 상태를 변경하지 않고 **차단·기록만** 수행(비파괴).

## 4. KEEP_SEPARATE

- 죽은 `infra/aws/terraform/codedeploy_bluegreen.tf`는 **PRESENT로 간주 금지**(미배선 인프라 스텁). Guard substrate로 인용 불가.
- `LiveCommerce.php:248-249` go-live는 **커머스 방송 도메인**의 별개 go-live로 OpsReady go-live와 명명 충돌일 뿐 KEEP_SEPARATE.

## 5. 판정

**ABSENT — greenfield.** OpsReady Runtime Guard 런타임 집행 계층은 grep 0으로 전무하다. Unapproved Deployment(maker-checker `Mapping.php:238-291`)·Missing Cert(`SecurityAudit.php:25-31`)·Baseline Drift(`Db.php:43-48`)의 3개 substrate만 존재하며 이를 소비하는 순신설 계층으로 설계한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
