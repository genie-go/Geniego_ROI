# DSAR — Authorization Mesh Reconciliation (Part 3-24 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_MESH_RECONCILIATION(§24)은 §22 Drift 감지 결과를 받아 이탈한 노드/리전 상태를 정본으로 **수렴(reconcile)** 시키는 계약이다. 비교 대상은 계층별 상태다.

- **Global Mesh** — 전역 정본 상태.
- **Regional Mesh** — 리전 집계 상태.
- **Local Mesh** — 개별 노드 로컬 상태.
- **Snapshot** — 특정 시점 고정 스냅샷.
- **Runtime** — 실행 시점 유효 상태.

Reconciliation은 (기준-대상) 델타를 산출하고, 수렴 방향(정본→노드)과 충돌 해소 규칙을 명세한다. 자동 집행은 사용자 승인 정책을 존중하며, 미확정 상태에서 파괴적 수렴을 하지 않는다.

## 2. Substrate 매핑

| 비교 계층 | 요구 substrate | 현행 실재 | 판정 |
|---|---|---|---|
| Global/Regional/Local Mesh | 다중 노드/리전 상태 저장 | 부재·단일노드 `Db.php:63-87` | ABSENT(비교 대상 미형성) |
| Snapshot | 시점 고정 스냅샷 | 부재(grep 0) | ABSENT-greenfield |
| Runtime | 실행 시점 유효 상태 | 단일노드 로컬만 존재 | 비교쌍 미완 |

## 3. 설계 계약 (greenfield)

- Reconciliation 엔진은 §22 Drift 이벤트를 입력으로 받아 (baseline, node) 상태쌍 델타를 산출하는 것으로 설계한다. 실 배선은 후속 승인 세션.
- 단일노드(`Db.php:63-87`) 현실상 Global≠Regional≠Local 계층이 물리적으로 분리되지 않아 **비교 대상 자체가 미완**이다. 다중 노드 형성 전까지 계층 비교는 정의만 두고 no-op으로 명세한다.
- Snapshot/Runtime 비교는 §18 Version(불변 스냅샷) 확립을 선행 조건으로 의존한다.

## 4. KEEP_SEPARATE

- **정산 reconciliation은 별개다.** `PgSettlement.php`와 `Connectors.php:896-902`의 결제/정산 대사(reconciliation)는 금액 정산 도메인으로, 권한 메시 상태 수렴과 개념·데이터·주기가 전혀 다르다. 명칭이 같은 "reconciliation"이라도 흡수·통합 금지 — 독립 유지.
- 죽은 terraform(`infra/aws/terraform/autoscaling.tf`)을 다중노드 근거로 오인 금지.

## 5. 판정

**ABSENT.** Mesh/Snapshot 부재로 비교 대상이 미완이며 관련 코드 전무(grep 0). 순신설이고 코드 변경 0·NOT_CERTIFIED. 단일노드(`Db.php:63-87`)에서 계층 비교는 no-op 정의만. 정산 reconciliation(`PgSettlement.php`·`Connectors.php:896-902`)과 영구 분리. §22 Drift·§18 Version 선행. 실 구현은 선행 Mesh Foundation 이후 별도 승인 세션.
