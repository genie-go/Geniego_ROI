# DSAR — Authorization Knowledge Graph Revalidation (Part 3-21 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §23)

APPROVAL_GRAPH_REVALIDATION은 인가 지식그래프의 노드·엣지·추론 결과가 **소스 변경 이후에도 여전히 유효한지 재검증**하는 읽기전용 계약이다. 재검증은 이벤트 트리거 기반이며, 계약 대상 5개 트리거:

- **Ontology 변경 트리거** — 인가 온톨로지(개념·클래스) 정의 변경.
- **Policy 변경 트리거** — 정책 규칙 신설/개정/폐기.
- **Role 변경 트리거** — 역할 정의·합성·상속 변경.
- **Assignment 변경 트리거** — 사용자↔역할 할당 갱신.
- **Resource 변경 트리거** — 보호 리소스(메뉴/객체) 형상 변경.

트리거 발생 시 관련 서브그래프의 추론 결과를 **재계산 검증**하되, 인가 상태를 변경하지 않는다(read-only). 재검증 실패 노드는 stale로 마킹되어 §24 Reconciliation·§21 Drift 입력으로 전달된다(SPEC §23 파이프라인 계약).

## 2. Substrate 매핑 표

| 재검증 트리거 | 현행 substrate(변경 원천) | file:line | 재검증 엔진 존재? |
|---|---|---|---|
| Policy/Role 변경 원천 | 권한 변경 판정·기록 경로 | `TeamPermissions.php:599-621` | ABSENT |
| Assignment 변경 원천 | 유효권한 재해석 SOURCE | `TeamPermissions.php:393-421` | ABSENT |
| Role/Ontology 위계 원천 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| Resource 변경 원천 | 메뉴 required_role 형상 | `AdminMenu.php:551-566` | ABSENT |
| 재검증 그래프화(추론 재계산) | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **트리거 원천 앵커링**: Policy/Role 변경 트리거는 권한 변경 경로(`TeamPermissions.php:599-621`)를, Assignment 트리거는 유효권한 SOURCE(`TeamPermissions.php:393-421`)를, Resource 트리거는 메뉴 형상(`AdminMenu.php:551-566`)을 재검증 시작점으로 소비한다. 재검증 엔진은 이들을 읽기만 하며 쓰기 경로를 신설하지 않는다.
2. **부분 재검증(무전면 재빌드)**: 변경 트리거는 영향받는 서브그래프만 재계산 대상으로 지정하며, 전체 그래프 무조건 재구축을 금지한다(성능·무후퇴).
3. **위계 정합**: Role/Ontology 재검증은 위계 파생(`UserAuth.php:186-188`)을 SOURCE로 하되, 위계 substrate는 재검증 결과를 생산하지 않으므로 stale 판정·재계산 계층은 순신설이다.
4. **Explainable 재검증**: 각 stale 마킹은 트리거 이벤트와 실패 근거를 인용해야 하며(V4 Explainable), 근거 없는 무효화를 금지한다(오탐 방지·기존 권한 임의 박탈 금지).

## 4. KEEP_SEPARATE

- **authz 재검증 ≠ 데이터 품질 재검증**: 데이터 신뢰·품질 재검증(`DataPlatform.php:313-345`)은 데이터셋 도메인의 Trust/Quality Gate이며, 본 §23 인가 추론 재검증과 무관 — 재사용·병합 금지.
- 마케팅 귀속 재계산(`AttributionEngine.php:242`)은 전환 귀속 도메인으로 authz 재검증 계층과 통합하지 않는다.

## 5. 판정

**ABSENT (authz graph 재검증 grep 0)**. 온톨로지·정책·역할·할당·리소스 변경을 트리거로 인가 추론을 재검증하는 엔진은 존재하지 않는다. 변경 트리거의 SOURCE만 실재하며(`TeamPermissions.php:599-621`·`:393-421`·`AdminMenu.php:551-566`·`UserAuth.php:186-188`), 이를 stale 판정·부분 재계산으로 그래프화하는 계층은 **순신설**이다. 데이터 품질 재검증(`DataPlatform.php:313-345`)·마케팅(`AttributionEngine.php:242`)과 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 KG substrate 부재).
