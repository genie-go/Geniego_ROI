# DSAR — Authorization Relationship Graph (Part 3-21 §4·§5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §4·§5 — Relationship Entity)

`APPROVAL_RELATIONSHIP`은 온톨로지(§5)의 **관계 엔티티(relationship entity)** 를 실체화하는 계약이다. 인가 지식 그래프에서 노드(주체·역할·스코프·자원·정책) 간 **엣지(edge)** 를 1급 시민으로 정의한다: `HAS_ROLE`(주체→역할), `GRANTS`(역할→권한), `SCOPED_BY`(권한→데이터스코프), `INHERITS`(역할↔역할 위계), `MAPS_FROM`(외부그룹→역할). 각 관계는 방향·카디널리티·제약을 갖는다. 목표는 인가 관계를 **암묵 산출 로직**에서 **명시적·질의가능한 그래프 엣지**로 승격.

## 2. Substrate 매핑 — 관계의 원천(산출 로직으로 실재)

관계 그래프 엔진은 부재하나, 각 관계의 의미는 아래 산출 로직에 **실재**한다. 관계 엔티티는 이를 엣지로 형식화할 뿐 로직을 대체하지 않는다.

| 관계 엣지 | 현행 SOURCE (산출 로직) | file:line | 성격 |
|---|---|---|---|
| `GRANTS` / `SCOPED_BY` | 유효권한 산출 (역할→권한·스코프) | `TeamPermissions.php:393-421` | 런타임 산출 |
| 스코프 포함(상한) | `scopeWithinCap` 집합 포함 판정 | `TeamPermissions.php:356-373` | 집합 연산 |
| `INHERITS`(위계) | 역할 위계 해석 | `UserAuth.php:186-188` | 위계 판정 |
| `MAPS_FROM`(federation) | group→role 매핑 | `EnterpriseAuth.php:70` | 매핑 |
| 관계 앵커/감사 | append-only 해시체인 | `SecurityAudit.php:25-31`·`:63-64` | 무결성 |

`effectiveForUser`(`TeamPermissions.php:393-421`)는 주체의 유효 관계를 **런타임 계산**하나 그래프로 영속화·질의하지 않는다. `scopeWithinCap`(`:356-373`)은 상한 포함관계를 판정하나 엣지로 저장하지 않는다. 위계(`UserAuth.php:186-188`)·group→role(`EnterpriseAuth.php:70`)도 산출 시점 로직이지 관계 그래프가 아니다.

## 3. 설계 계약 (신설 — 코드 0)

- **RelationshipStore(개념)**: 인가 노드 간 엣지를 방향·카디널리티·제약과 함께 영속·질의. SOURCE 산출 로직(`TeamPermissions.php:393-421`·`:356-373`·`UserAuth.php:186-188`·`EnterpriseAuth.php:70`)을 SoT로 존중하며 엣지는 이를 **투영(projection)** 한다(역전·이중정본 금지).
- **무후퇴**: 관계 그래프는 기존 런타임 산출을 대체하지 않고 병렬 표현. 결정 경로는 현행 유지.
- **무결성**: 관계 변경은 SecurityAudit append-only 해시체인(`SecurityAudit.php:25-31`·`:63-64`)으로 앵커.

## 4. KEEP_SEPARATE (혼입·중복 금지)

- **마케팅 graph_node / graph_edge**: `Db.php:815-839`(및 `:126-127`·`:942-955`)의 `graph_node`/`graph_edge` 테이블과 `GraphScore.php:12-30`·`:57`은 **마케팅 어트리뷰션/영향력 그래프**다. 인가 관계 그래프와 테이블·도메인·목적이 전혀 다르다. "graph/edge" 명명 동일성으로 인한 재사용·통합 절대 금지 — 별개 스키마·별개 SoT로 순신설.

## 5. 판정

**ABSENT-엔진** — Relationship Graph 엔진(영속·질의 가능한 인가 엣지)은 grep 0(현행 부재). 관계 의미는 SOURCE 산출 로직으로 실재하나(effectiveForUser `TeamPermissions.php:393-421`·scopeWithinCap `:356-373`·위계 `UserAuth.php:186-188`·group→role `EnterpriseAuth.php:70`) 런타임 계산일 뿐 그래프 엔티티가 아니다. 본 DSAR는 **순신설 설계 명세**(코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE). 마케팅 `graph_node`/`graph_edge`(`Db.php:815-839`·`GraphScore.php:12-30`·`:57`)는 KEEP_SEPARATE.
