# DSAR — Approval Recovery Simulation (Part 3-20 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_RECOVERY_SIMULATION`은 실제 장애가 발생하기 전에 **인가 복구 시나리오를 사전 실행(dry-run)** 하여, 복구 절차의 타당성·기대 효과·잔여 리스크를 정량 예측하는 엔진을 정의한다. 시뮬레이션 대상 실패 유형 5종:

- **Region Failure** — 특정 리전 인가 서비스/데이터 소실 시 복구 경로 시뮬레이션.
- **Policy Corruption** — 정책 정본 손상/변조 시 재구성·롤백 시뮬레이션.
- **Cache Failure** — 결정 캐시 소실/스탬피드 시 cold-path 복구 시뮬레이션.
- **Certificate Expiration** — 서명/신뢰 인증서 만료 시 갱신·재신뢰 시뮬레이션.
- **Trust Compromise** — federation 신뢰선/키 침해 시 격리·재수립 시뮬레이션.

각 시나리오는 예상 지표를 산출한다: **MTTR**(평균 복구 시간), **Availability**(가용성 영향), **Risk**(잔여 리스크 등급), **Compliance**(규정 위반 노출). 시뮬레이션은 **읽기 전용·부작용 0** 로 운영 상태를 변경하지 않는다.

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| 헬스/가용성 관측(Availability 입력) | `backend/src/Handlers/Health.php:27`·`:102` · `backend/src/Handlers/SystemMetrics.php:53-54` | 관측 substrate |
| 규정 노출 평가(Compliance 입력) | `backend/src/Handlers/Compliance.php:53`·`:120` | 부분 substrate |
| 시뮬레이션 이벤트 감사 | `backend/src/SecurityAudit.php:56-68`(append-only) | 재사용 대상 |
| 복구 시나리오 실행 엔진 | 부재 — recovery 시뮬레이터 전무(grep 0) | ABSENT |
| MTTR/Risk 예측 모델 | 부재 | ABSENT |
| Region/Cert/Trust 실패 모델 | 부재 | ABSENT |

## 3. 설계 계약

- **RecoverySimulator**는 §5 Drift 탐지 결과와 §25 Snapshot을 입력으로 받는 순수 예측 계층이다(선행 부재 → BLOCKED_PREREQUISITE).
- 시뮬레이션은 운영 데이터·정책·캐시를 **절대 변경하지 않는다**(dry-run 불변식). 실집행은 별도 승인 세션 대상.
- 예측 지표(MTTR/Availability/Risk/Compliance)는 관측 substrate에서 파생하며 임의 숫자 하드코딩 금지.
- 시뮬레이션 실행/결과는 `SecurityAudit.php:56-68` 해시체인에 기록한다.

## 4. KEEP_SEPARATE

- **재무/정산 시뮬레이션**: `backend/src/Handlers/PgSettlement.php:294-301` — 정산 재계산이며 authz recovery 시뮬레이션 아님. 흡수 금지.
- **ML 모델 예측/모니터링**: `backend/src/Handlers/ModelMonitor.php:273` — 모델 성능 예측이며 인가 복구 예측 아님. 별개 유지.

## 5. 판정

**ABSENT** — authz Recovery Simulation 엔진은 recovery 시뮬레이션 자체가 전무(grep 0)하여 순신설 대상이다. 기존 예측/재계산 코드는 재무·ML 도메인이며 KEEP_SEPARATE. §5 Drift·§25 Snapshot 선행 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
