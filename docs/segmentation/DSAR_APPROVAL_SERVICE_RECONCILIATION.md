# DSAR — Service Reconciliation (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Reconciliation은 Drift 탐지 결과를 소비하는 후속 프로세스(Drift와 별개 계층) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. omni_outbox claim_id를 Assignment identity로 오등록 금지. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Reconciliation = Runtime 실측 상태와 마지막 기록(Snapshot·Assignment·Credential)을 정기 비교해 불일치를 확정하는 축 — **Runtime·Snapshot·Assignment·Credential 비교**(스펙 §28). Drift가 "탐지"라면 Reconciliation은 "정합화 프로세스".

- **순신규**: 정기 비교 로직 grep 0(전수조사 §10).
- cron/batch는 `Db::pdo()` 시스템 공유 자격증명 직접(`Db.php:122-123`)이며, RBAC를 경유하지 않는 별도 경로 — 비교 대상 "Assignment" 구조 자체가 부재.

## 2. Canonical 필드

`SERVICE_RECONCILIATION` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation_id | 정합화 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | service_identity_ref | 대상 Service Identity 참조 |
| 4 | compared_at | 비교 실행 시각 |
| 5 | runtime_actual_ref | Runtime 실측 참조 |
| 6 | snapshot_expected_ref | 기대값=최근 Service Snapshot 참조 |
| 7 | assignment_expected_ref | 기대값=Service Role Assignment 참조 |
| 8 | credential_expected_ref | 기대값=Credential(Secret/Certificate) 참조 |
| 9 | mismatch_count | 불일치 건수 |
| 10 | reconciliation_status | 정합화 상태(③) |

## 3. 열거형 / 타입

- **compare_target**: Runtime · Snapshot · Assignment · Credential(스펙 §28 원문)
- **reconciliation_status**: 설계 예약(`MATCHED` · `MISMATCHED` · `UNVERIFIABLE` 등)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Reconciliation 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| Runtime 비교 | — | **ABSENT** | grep 0 |
| Snapshot 비교 | — | **BLOCKED_PREREQUISITE**(별편 Service Snapshot 선행) | — |
| Assignment 비교 | cron/batch=`Db::pdo()` 시스템 공유 자격증명 직접(RBAC 미경유) | **ABSENT**(비교 대상 Assignment 구조 부재) | `Db.php:122-123`·`writeback_cron.php:37` |
| Credential 비교 | api_key rotate/revoke 이력(row 단위·정기 비교 로직 없음) | **ABSENT**(정기 비교 없음) | `Keys.php:150-187,135-148` |

## 5. 설계 원칙

- **Reconciliation은 Drift의 후속 소비자**: Drift가 산출한 diff를 정본으로 정합화하는 별개 계층 — 겸용 금지.
- **omni_outbox claim_id 오등록 금지**: `claim_id`(`Omnichannel.php:95-97,390-446`)는 동시성 락 토큰이지 identity/Assignment가 아니다(전수조사 §8·§10 정직 판정 재확인). Reconciliation 대상 Assignment로 오흡수 금지.
- **cron/batch 실측 소스 한정**: 시스템 공유 자격증명은 Reconciliation의 "Runtime 실측" 소스가 될 수 있으나, 그 자체가 identity로 승격되지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- Runtime/Snapshot/Assignment/Credential 4축 비교 로직 = **전량 ABSENT**.
- Snapshot 비교 = **BLOCKED_PREREQUISITE**(별편 Service Snapshot 선행 신설 필요).
- Assignment 비교 = **BLOCKED_PREREQUISITE**(Part 3-3 Role Assignment Governance 실구현 부재 — Service Role Assignment 자체가 순신규).
- 실 Reconciliation 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
