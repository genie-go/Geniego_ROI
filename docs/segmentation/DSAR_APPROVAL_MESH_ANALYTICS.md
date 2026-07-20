# DSAR — Approval Mesh Analytics (Part 3-24 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

`APPROVAL_MESH_ANALYTICS`는 메시의 운영 지표를 집계하는 계층이다. 지표 계약:

- **Node Availability**: 노드별 가용성 비율.
- **Sync Success**: 정책 동기화 성공률.
- **Consensus Latency**: 다노드 합의 도달 지연.
- **Policy Distribution Time**: 정책 배포 소요 시간.
- **Regional Availability**: 지역 단위 가용성.
- **Mesh Health Score**: 위 지표를 종합한 메시 건전성 점수.

이 지표들은 §18 스냅샷·§19 evidence를 시계열로 집계하여 산출된다.

## 2. Substrate 매핑

| SPEC 요구 | 기존 substrate | 상태 | 근거 |
|---|---|---|---|
| Mesh 다노드 지표 집계 | 없음 (grep 0) | ABSENT-greenfield | 코드/스키마 부재 |
| 단일 노드 시스템 metrics | 존재 | baseline(비-mesh) | `SystemMetrics.php:32` |
| Node/Regional Availability | 없음 (mesh 차원) | ABSENT-greenfield | 코드/스키마 부재 |
| Consensus Latency / Sync Success | 없음 | ABSENT-greenfield | 코드/스키마 부재 |
| Mesh Health Score | 없음 | ABSENT-greenfield | 코드/스키마 부재 |

## 3. 설계 계약

- Node Availability·Sync Success·Consensus Latency·Policy Distribution Time·Regional Availability·Mesh Health Score는 mesh 다노드 차원 집계로, 기존에 부재하므로 **순신설**한다.
- 단일 인스턴스 관측치는 `SystemMetrics.php:32`을 **baseline**으로 참조하되, 이는 단일 노드 metrics이지 mesh 집계가 아니다. mesh analytics는 이를 노드별 입력의 한 소스로 취급할 수 있으나 그 자체로 mesh 지표를 대체하지 못한다.
- analytics 지표는 §18 Snapshot·§19 Evidence 시계열을 상위 집계원으로 삼는 read-model이며, 원천 부재 시 산출 불가(BLOCKED_PREREQUISITE).
- Mesh Health Score는 하위 5지표의 가중 종합으로 정의하되 구체 가중식은 원천 지표 실재 후 별도 세션에서 확정한다.

## 4. KEEP_SEPARATE

- **ML 모델 모니터링 지표(`ModelMonitor.php:42`)** 는 모델 drift/성능 관측으로 authorization mesh 건전성과 의미가 다름 — mesh analytics에 흡수 금지.
- **정산 지표(`PgSettlement.php`)** 는 금융 트랜잭션 도메인 — mesh 지표와 경계 분리.

## 5. 판정

**ABSENT-greenfield**. Node/Regional Availability·Sync Success·Consensus Latency·Policy Distribution Time·Mesh Health Score는 mesh 차원 집계로 grep 0 부재(순신설). 단일 노드 `SystemMetrics.php:32`은 baseline 참조일 뿐 mesh 집계가 아니다. KEEP_SEPARATE: `ModelMonitor.php:42`·`PgSettlement.php`. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
