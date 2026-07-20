# DSAR — Service Drift (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Drift는 Snapshot 대비 diff이지 임계값 알람이 아님(별개 계층) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. SystemMetrics(cron 헬스)를 Service Drift로 오등록 금지. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Drift = 두 시점(마지막 Service Snapshot vs 현재 Runtime) 간 **Secret Drift·Certificate Drift·Role Drift·Scope Drift·Runtime Drift**(스펙 §26) 불일치를 탐지하는 축. Part 3-1 Role Drift의 비인간 대응.

- **순신규**: Drift 탐지 로직 grep 0(전수조사 §10).
- **정직 판정**: `SystemMetrics`의 unknown/critical 표시는 **cron 잡 상태 모니터링**이며 identity 신뢰등급·Drift와 무관(오탐 배제 — EXISTING_IMPLEMENTATION §9 재확인).

## 2. Canonical 필드

`SERVICE_DRIFT` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift_id | 드리프트 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | service_identity_ref | 대상 Service Identity 참조 |
| 4 | drift_type | Secret/Certificate/Role/Scope/Runtime Drift(③) |
| 5 | baseline_snapshot_ref | 비교 기준 Service Snapshot 참조 |
| 6 | current_state_ref | 현재 Runtime 실측 참조 |
| 7 | detected_at | 탐지 시각 |
| 8 | severity | 심각도(설계 예약) |
| 9 | drift_detail | 필드별 diff 상세 |

## 3. 열거형 / 타입

- **drift_type**: Secret Drift · Certificate Drift · Role Drift · Scope Drift · Runtime Drift(스펙 §26 원문)
- **severity**: 설계 예약(Trust Level Unknown~Critical과 정합 가능성 — 실 결합은 후속)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Drift 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| Secret Drift | api_key `expires_at` 만료 검사(단순 게이트·diff 비교 아님) | **ABSENT**(만료체크≠drift) | `index.php:518-520` |
| Certificate Drift | — | **ABSENT** | grep 0(cert_expires grep 0) |
| Role Drift | — | **ABSENT** | grep 0(비인간 role 값 자체가 ABSENT) |
| Scope Drift | — | **ABSENT** | grep 0 |
| Runtime Drift | `SystemMetrics` unknown/critical(cron 잡 상태 모니터링) | **ABSENT(오탐 배제)** — identity 신뢰등급 무관 | `SystemMetrics:376,393,397-417` |
| baseline snapshot 비교 자체 | — | **BLOCKED_PREREQUISITE**(별편 Snapshot 선행) | — |

## 5. 설계 원칙

- **SystemMetrics 오등록 금지**: cron 잡 헬스 모니터링을 Service Drift로 오등록하지 않는다(정직 판정, ADR/전수조사 §9 재확인).
- **Drift ≠ Warning**: Drift는 Snapshot 대비 diff 산출이지, 임계값 알람(Warning Contract §33 "Runtime Drift")과는 별개 계층 — Warning은 Drift 산출 결과를 소비할 수 있으나 Drift 자체를 대체하지 않는다.
- **Baseline 의존**: 최근 Service Snapshot이 없으면 Drift 계산 자체가 성립하지 않는다(BLOCKED).

## 6. Gap / BLOCKED_PREREQUISITE

- Secret/Certificate/Role/Scope/Runtime 5축 Drift 탐지 로직 = **전량 ABSENT**.
- baseline_snapshot_ref = **BLOCKED_PREREQUISITE**(별편 Service Snapshot 선행 신설 필요).
- 실 Drift 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
