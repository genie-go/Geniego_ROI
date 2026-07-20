# DSAR — Authorization Knowledge Graph Static Lint (Part 3-21 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §26)

배포·빌드 시점의 **정적 그래프 검증기**다. 런타임 이전에 권한 지식 그래프 정의(노드·엣지·온톨로지)의 구조적 결함을 차단한다. 6종 린트:

| # | 린트 규칙 | 차단 대상 |
|---|---|---|
| L1 | Missing Relationship | 필수 관계(예: role→permission)가 정의에서 누락 |
| L2 | Orphan Node | 어떤 엣지에도 연결되지 않은 고립 노드 |
| L3 | Invalid Edge | 온톨로지가 허용하지 않는 source·target 타입 조합 |
| L4 | Circular Dependency | 비순환이어야 할 관계(delegation·role 상속)에 순환 |
| L5 | Missing Ontology | 노드/엣지 타입이 온톨로지에 미정의 |
| L6 | Duplicate Relationship | 동일 (source,type,target) 관계 중복 정의 |

## 2. Substrate 매핑 (현행 실측 → baseline)

| 린트 | 현행 substrate | 등급 |
|---|---|---|
| L4 Circular Dependency | 메뉴 트리 순환 방지 `AdminMenu.php:551-566`(wouldCycle) — **레포 유일의 실 circular-lint 원천 패턴**. parent 후보 검증 `:504-505` | `PARTIAL`(패턴 존재·그래프 미적용) |
| L1·L2·L3·L5·L6 | 온톨로지 정의·엣지 타입 스키마·중복 관계 검사 = **grep 0** | `ABSENT` |

## 3. 설계 계약 (신설)

- **KGStaticLint**는 순신설이다. 그래프 정의 산출물(온톨로지 + 노드/엣지 선언)을 입력으로 배포 게이트에서 6종을 검사한다.
- L4: `AdminMenu.php:551-566`의 `wouldCycle` DFS 패턴을 **확장 재사용**한다 — 메뉴 트리 전용 로직을 일반 방향그래프 순환 탐지로 승격하되 별도 순환 검출기 신설 금지. parent 후보 검증(`:504-505`) 규약도 엣지 유효성(L3) 검사의 선례로 인용.
- L1/L5: 온톨로지 SSOT(허용 노드·엣지 타입·필수 관계 cardinality)를 정의하고, 그에 대한 정의 대조로 Missing Relationship/Ontology를 산출.
- L3: 엣지의 (source_type, edge_type, target_type)이 온톨로지 허용 집합에 없으면 Invalid Edge.
- L6: (source,type,target) 정규화 키 중복 검출.
- 린트는 **정적**(§26)이고 런타임 가드(§25)와 축이 다르다 — `AdminMenu.php:551-566`은 메뉴 저장 시점 방어라 정적/런타임 경계에 걸쳐 있으나, KG 린트는 배포 산출물 대상 정적 검사로 명확히 분리한다.

## 4. 판정

- **KG Static Lint = ABSENT** (6종 린트 규칙·온톨로지 정의 대조기 grep 0).
- 유일 재사용 baseline은 L4의 `AdminMenu.php:551-566`(wouldCycle) + `:504-505` — `PARTIAL`. **메뉴 순환 방지가 존재한다는 사실을 "그래프 린트가 있다"로 읽으면 오판**(대상 산출물 자체가 부재).
- 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(온톨로지 SSOT·그래프 정의 포맷 선행 부재).
- ★`graph_node`/`graph_edge`(마케팅)를 린트 대상 산출물로 오인 금지.
