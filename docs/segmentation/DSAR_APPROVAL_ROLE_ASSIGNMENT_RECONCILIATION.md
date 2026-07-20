# DSAR — Approval Role Assignment Reconciliation (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Reconciliation · 스펙 §31)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Snapshot/Digest(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Simulation은 실제 변경 없음 · "인가 실소비 role에만 적용"(ADR §D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §31 Assignment Reconciliation은 **Current Assignment · Effective Assignment · Snapshot · Audit · Digest** 5개 소스 간 정합성을 비교하는 절차다. §29 Drift가 "배포 상태 vs 현재 상태"의 단일 축 비교인 반면, Reconciliation은 5개 서로 다른 소스가 서로 일치하는지 정기/트리거 비교한다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation id | Reconciliation PK |
| 2 | assignment id / subject id | 대상 |
| 3 | compared at | 비교 시각 |
| 4 | current assignment reference | 스펙 §31 원문 |
| 5 | effective assignment reference | 스펙 §31 원문(§38 Effective Assignment Resolution 결과) |
| 6 | snapshot reference | 스펙 §31 원문(§26) |
| 7 | audit reference | 스펙 §31 원문 |
| 8 | digest reference | 스펙 §31 원문(§28) |
| 9 | discrepancy found | 불일치 발견 여부 |
| 10 | discrepancy detail | 불일치 상세 |
| 11 | resolution action | 해소 조치 |
| 12 | status | Reconciliation 상태 |

## 3. 열거형 / 타입

스펙 §31 원문에는 전용 열거형이 없다. 5개 비교축(Current Assignment · Effective Assignment · Snapshot · Audit · Digest) 자체가 비교 대상 축이다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 비교축 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Current Assignment | `app_user.team_role` 현재값(직접 컬럼) | `UserAuth.php:1334,1392` | **PARTIAL** — "현재" 값 자체는 조회 가능하나 Assignment 엔티티로 구조화되지 않음(3분산 write — ADR §D-1) |
| Effective Assignment | `effectiveForUser`(라이브 재계산) | `TeamPermissions.php:366-394` | 근접(EXISTING_IMPLEMENTATION §7)이나 assignment version 무참조·캐시 없음 |
| Snapshot | — | — | **ABSENT**(본 wave §26 결과와 동일) |
| Audit | `auth_audit_log`(mutable) | `UserAuth.php:4165,4174-4197` | 근접이나 mutable·구조화 diff 아님 |
| Digest | — | — | **ABSENT**(본 wave §28 결과와 동일) |
| Reconciliation 절차(5축 비교·discrepancy 산출) 전체 | — | — | **ABSENT** |

## 5. 설계 원칙

- Reconciliation은 5개 서로 다른 소스가 일치하는지 정기/트리거 비교하는 절차다 — Drift(§29·단일 Version 대비 비교)와 달리 "여러 소스 간 정합성"이 목적.
- Current Assignment 소스는 team_role 직접 컬럼값(3분산 write 대상 — ADR §D-1)이며, Assignment Registry 도입 전에는 이 값 자체가 이미 5경로(team_role 3핸들러+api_key 2경로) 병렬 수정으로 소스가 흩어져 있어, Reconciliation 설계상 "Current"의 정의 자체를 Registry 신설과 함께 명확히 해야 한다.
- Effective Assignment 축은 `effectiveForUser`를 version 기준으로 승격한 결과(ADR §D-1 EFFECTIVE_RESOLUTION_SUBSTRATE)를 참조하되, 현재는 라이브 재계산이라 "저장된 Effective"와 비교할 스냅샷이 없다(선행 필요).

## 6. Gap / BLOCKED_PREREQUISITE

- Snapshot/Digest 축 = **ABSENT**(선행 §26/§28 신설 필요).
- Effective Assignment 축 = version 기준 승격 전(BLOCKED_PREREQUISITE).
- Current Assignment 축조차 3분산 write로 Registry 통합 전에는 단일 SSOT가 아님(ADR §D-1).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
