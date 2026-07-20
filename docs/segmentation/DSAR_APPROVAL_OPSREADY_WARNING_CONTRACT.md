# DSAR — OpsReady Warning Contract (Part 3-25 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

OpsReady Warning Contract는 **non-blocking(집행 지속) 경고 신호** 5종을 정의한다. 에러(§26)와 달리 운영 전환을 차단하지 않으나 hypercare 관측·운영 리스크 대시보드에 기록되어 조기 개입을 유도한다.

- **Operational Risk Increasing** — 운영 리스크 지표 상승 추세.
- **Hypercare Alert** — go-live 직후 hypercare 기간 이상 신호.
- **Configuration Drift** — 경미한 구성 이탈(에러 임계 미만).
- **Release Delay** — 릴리스 일정 지연 경고.
- **Certification Near Expiration** — 운영 인증서 만료 임박.

Warning은 관측(observe)·기록만 하며 fail-closed를 트리거하지 않는다. 경고 임계 초과 시 §26 에러로 승격 가능.

## 2. Substrate 매핑

| 경고 | 현존 substrate (①②) | 인용/상태 | 관계 |
|---|---|---|---|
| Operational Risk Increasing | 시스템 메트릭 baseline | `backend/src/Handlers/SystemMetrics.php:60-83` | 지표 baseline |
| Hypercare Alert | 시스템 메트릭 관측 | `backend/src/Handlers/SystemMetrics.php:60-83` | 관측 substrate |
| Configuration Drift | 구성 baseline | `backend/src/Db.php:43-48` | drift 임계 비교 |
| Certification Near Expiration | 인증 기록 | `backend/src/SecurityAudit.php:25-31` | 만료 계산 근거 |
| Release Delay | (릴리스 일정 트래킹) | 파일 부재 | ABSENT·순신설 |

## 3. 설계 계약

- 5종 경고는 opsready 관측 계층으로 순신설하며 기존 알림 엔진을 재구현하지 않고 신호를 방출만 한다.
- Operational Risk/Hypercare는 `SystemMetrics.php:60-83` 메트릭을 baseline으로 소비, Configuration Drift는 `Db.php:43-48`, Cert Near Expiration은 `SecurityAudit.php:25-31` 기록을 만료 계산에 사용.
- 경고는 상태 변경·집행 차단 없이 기록만 수행(비파괴). 임계 초과 시 §26 에러 승격 경로만 규정.

## 4. 판정

**ABSENT — greenfield.** OpsReady 전용 warning 계약은 전무하다. Health/메트릭(`SystemMetrics.php:60-83`)·Baseline(`Db.php:43-48`)·Cert(`SecurityAudit.php:25-31`) substrate를 관측 근거로 소비하는 순신설 경고 계층으로 설계한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
