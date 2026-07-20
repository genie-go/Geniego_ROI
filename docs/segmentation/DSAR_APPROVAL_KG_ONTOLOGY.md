# DSAR — Authorization Ontology Manager (Part 3-21 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §5 — Ontology Manager)

`APPROVAL_ONTOLOGY`는 인가(authorization) 도메인의 **개념 스키마(conceptual schema)** 를 관장하는 거버넌스 계약이다. 산출 대상은 6종: **Entity Type**(개념 노드 유형), **Attribute Definition**(엔티티 속성 정의), **Relationship Type**(개념 간 관계 유형), **Cardinality**(관계 다중성 제약), **Semantic Constraint**(의미론적 무결성 규칙), **Version**(온톨로지 버전·진화 이력). 이 계약은 인가 개념을 **코드 상수 산재**에서 **명시적·버전관리되는 온톨로지**로 승격하는 것을 목표로 한다.

## 2. Substrate 매핑 — SOURCE 어휘(온톨로지 원천)

현행 코드에는 온톨로지 매니저 자체는 없으나, 인가 개념 어휘(vocabulary)는 상수·프리셋으로 **산재하여 실재**한다. 이것이 Entity/Relationship Type의 원천 substrate다.

| 온톨로지 요소 | 현행 SOURCE (substrate) | file:line | 성격 |
|---|---|---|---|
| Entity Type — Action | `ACTIONS` 상수 (권한 동작 어휘) | `TeamPermissions.php:39` | 상수 배열 |
| Entity Type — Data Scope | `DATA_SCOPES` 상수 (데이터 범위 어휘) | `TeamPermissions.php:41` | 상수 배열 |
| Entity Type — Menu/Resource | `MENU_CATALOG` (자원 노드 카탈로그) | `TeamPermissions.php:55-82` | 상수 카탈로그 |
| Entity Type — Role/Org preset | `ORG_PRESET` (조직 역할 프리셋) | `TeamPermissions.php:737-753` | 프리셋 정의 |
| Attribute Definition | 위 상수의 키·값 구조 (동작명·범위명·메뉴속성) | `TeamPermissions.php:39`·`:41`·`:55-82` | 암묵 스키마 |

SOURCE 어휘는 **정적 상수**로서 관계·카디널리티·의미제약·버전을 갖지 않는다. 온톨로지 매니저는 이 어휘를 **읽어들여** Entity Type/Attribute/Relationship Type으로 정규화하되, SOURCE 상수를 정본(SoT)으로 존중한다(파생·역전 금지).

## 3. 설계 계약 (신설 — 코드 0)

- **OntologyRegistry(개념)**: Entity Type·Attribute·Relationship Type·Cardinality·Semantic Constraint를 등록하는 버전관리 레지스트리. SOURCE 어휘(`TeamPermissions.php:39`·`:41`·`:55-82`·`:737-753`)를 seed로 import하되 상수를 SoT로 유지.
- **Version(온톨로지 진화)**: 온톨로지 스키마 변경은 append-only 버전으로만. 파괴적 재정의 금지(무후퇴). 각 버전은 SecurityAudit append-only 해시체인(`SecurityAudit.php:25-31`·`:63-64`)으로 무결성 앵커.
- **Semantic Constraint**: Entity/Relationship 정합 규칙(예: Action은 반드시 Resource에 귀속, Data Scope는 정의된 차원 내). 제약 위반은 등록 거부(fail-closed).
- **판정 앵커**: 본 계약은 순신설이며, 어떤 기존 엔진도 대체하지 않는다.

## 4. KEEP_SEPARATE (혼입·중복 금지)

- **챗봇 지식베이스**: `GeniegoKnowledge.php:11` — 이는 사용자 대면 챗봇 KB(제품 지식)이며, **인가 온톨로지가 아니다**. 명명 유사("knowledge")로 인한 통합·흡수 금지. 별개 도메인·별개 SoT.
- SOURCE 어휘를 온톨로지 매니저가 대체·재작성하지 않는다 — read-only import.

## 5. 판정

**ABSENT** — Ontology Manager 엔진은 grep 0(현행 부재). Entity Type/Attribute/Relationship Type/Cardinality/Semantic Constraint/Version 6종 모두 미구현. SOURCE 어휘(`TeamPermissions.php:39`·`:41`·`:55-82`·`:737-753`)는 온톨로지 원천 substrate로 실재하나 정적 상수에 불과. 본 DSAR는 **순신설 설계 명세**(코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE). 챗봇 KB(`GeniegoKnowledge.php:11`)는 KEEP_SEPARATE.
