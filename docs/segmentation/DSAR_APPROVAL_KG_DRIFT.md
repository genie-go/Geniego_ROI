# DSAR — Authorization Knowledge Graph Drift Detection (Part 3-21 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

APPROVAL_GRAPH_DRIFT는 인가 지식그래프(Authorization Knowledge Graph)의 **선언된 기준 형상(baseline ontology/graph)과 실제 관찰 형상 사이의 이탈(drift)을 탐지**하는 읽기전용 감시 계약이다. 계약 대상 5개 drift 축:

- **Ontology Drift** — 인가 온톨로지(개념·클래스 정의)가 기준 스키마에서 이탈.
- **Relationship Drift** — 역할↔권한↔정책 관계 엣지가 선언 관계와 불일치.
- **Dependency Drift** — 정책·결정의 의존 노드가 기준 의존 그래프에서 누락/추가.
- **Schema Drift** — 그래프 노드/엣지 스키마 형상이 canonical 정의에서 이탈.
- **Graph Growth Drift** — 노드·엣지 증가율이 기준 성장 곡선에서 이탈(무통제 팽창 감시).

Drift 탐지는 **어떤 인가 상태도 변경하지 않는다**(read-only, side-effect 0). Drift 판정은 §24 Reconciliation 비교 결과를 소비하여 산출한다(SPEC §21 — drift는 reconciliation 델타의 해석 계층).

## 2. Substrate 매핑 표

| Drift 축 | 현행 substrate(기준 형상 원천) | file:line | drift 엔진 존재? |
|---|---|---|---|
| 관계/권한 기준 형상 | 유효권한 해석(effective authz) SOURCE | `TeamPermissions.php:393-421` | ABSENT |
| 온톨로지/위계 파생 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| 스키마 기준(테이블 형상) | 순수 MySQL 스키마 정의 | `Db.php:126-127` | ABSENT |
| 기준 변경 앵커 | append-only 해시체인 기록 | `SecurityAudit.php:25-31` | ABSENT |
| 그래프 drift 그래프화 | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **Reconciliation 파생**: Drift 판정은 §24 Reconciliation(Live↔Snapshot↔Version↔Source 비교)이 산출한 델타를 입력으로 소비하며, 자체 독립 그래프 스캔 경로를 신설하지 않는다. Drift는 reconciliation 결과의 **해석**이다.
2. **기준 앵커링**: 기준 형상(baseline)은 유효권한 SOURCE(`TeamPermissions.php:393-421`)·위계 파생(`UserAuth.php:186-188`)·스키마(`Db.php:126-127`)를 원천으로 하며, drift 엔진은 이들을 읽기만 한다(무후퇴 — 기준을 재해석하되 개작 금지).
3. **Growth Drift 무통제 감시**: 노드/엣지 증가는 `SecurityAudit.php:25-31` 감사 원천 이벤트 수를 앵커로 하여 성장률을 도출하되, 성장 곡선 그래프는 순신설이다.
4. **Explainable drift**: 각 drift 항목은 근거 델타·근거 감사 이벤트를 인용해야 하며, 근거 없는 이탈 경보를 금지한다(V4 Explainable 정합·오탐 방지).

## 4. KEEP_SEPARATE

- **authz drift ≠ 마케팅 drift/attribution**: 마케팅 귀속·모델 drift(`AttributionEngine.php:242`)는 전환 귀속 도메인의 신호 이탈이며, 본 §21 인가 온톨로지 drift와 무관 — 재사용·병합 금지.
- **authz drift ≠ 정산 reconciliation drift**: 정산 대사(`PgSettlement.php:294-295`·`KrChannel.php:415-419`)의 금액 대사 델타는 재무 도메인이다. §24가 참조하는 KEEP_SEPARATE 경계를 drift 계층도 동일하게 준수한다.

## 5. 판정

**ABSENT (authz graph drift grep 0)**. 인가 온톨로지·관계·의존·스키마·성장의 기준 이탈을 탐지하는 drift 엔진은 코드베이스에 존재하지 않는다. 기준 형상 substrate만 실재하며(`TeamPermissions.php:393-421`·`UserAuth.php:186-188`·`Db.php:126-127`), 이를 §24 Reconciliation 델타와 비교해 drift로 그래프화하는 계층은 **순신설**이다. 마케팅(`AttributionEngine.php:242`)·정산(`PgSettlement.php:294-295`·`KrChannel.php:415-419`)과 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §24 Reconciliation·KG substrate 부재).
