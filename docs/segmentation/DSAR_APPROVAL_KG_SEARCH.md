# DSAR — 인가 지식그래프 시맨틱 검색 APPROVAL_GRAPH_SEARCH (Part 3-21 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9)

APPROVAL_GRAPH_SEARCH는 인가 지식그래프에 대한 **의미 기반 검색(semantic search)** 계약이다. 관리자가 "이 역할이 결제 자원에 도달하는 모든 경로", "campaign 자원에 의존하는 권한은?" 같은 질의를 자연어 또는 그래프 질의로 던지면 관련 노드·엣지·경로를 반환한다. 5개 검색 클래스를 규정한다.

- **Natural Language Search(자연어 검색)**: 자연어 질의 → 그래프 질의 변환 → 결과.
- **Graph Query(그래프 질의)**: 패턴·경로 기반 구조 질의.
- **Relationship Search(관계 검색)**: 두 principal/role 간 인가 관계 존재·경로 탐색.
- **Dependency Search(의존 검색)**: 특정 자원/scope에 의존하는 상위 권한 역탐색.
- **Lineage Search(계보 검색)**: 권한 부여 계보(누가→누구에게→언제)를 추적.

검색 결과는 감사 가능해야 하며 테넌트 격리(`Db.php:126-127`)를 절대 위반하지 않는다.

## 2. Substrate 매핑 (현행 실코드 → 검색 원천)

| 검색 클래스 | 현행 substrate (실코드) | 관계 |
|---|---|---|
| Natural Language | `ClaudeAI.php:82`·`:120-322` LLM 대화 라우팅 | 자연어 처리 인프라. authz 검색 인덱스 아님 |
| Graph Query | (일반) SQL 조회 서술부 | 그래프 질의 엔진·인덱스 grep 0 |
| Relationship | `TeamPermissions.php:393-421` effectiveForUser | 유효권한 산출. 그래프 관계 검색 아님(단발 계산) |
| Dependency | `AdminMenu.php:551-566` 메뉴 required_role 게이트 | 자원↔권한 정적 매핑. 역의존 인덱스 아님 |
| Lineage | `SecurityAudit.php:25-31` 이벤트 스키마 | 감사 이벤트 저장. 계보 검색 질의기 아님 |
| 테넌트 격리 | `Db.php:126-127` | 검색 스코프 경계 정본 |

FULLTEXT 인덱스·embedding·벡터검색은 코드베이스 전역 grep 0.

## 3. 설계 계약 (신설 대상)

1. **KG-Search** 서비스는 그래프 인덱스를 읽기전용 뷰로 구성하며 원천 테이블을 변경하지 않는다.
2. 모든 질의는 `Db.php:126-127` 테넌트 스코프를 강제 주입 후 실행(Cross-Tenant 검색 금지·fail-closed).
3. Natural Language Search는 `ClaudeAI.php:82`·`:120-322` LLM을 **질의 변환기(NL→그래프쿼리)로만** 사용하고, LLM이 직접 인가 결론을 내리지 않는다(결론은 그래프 사실에서만).
4. Relationship/Dependency 결과는 `effectiveForUser`(`TeamPermissions.php:393-421`)·`AdminMenu.php:551-566` 게이트 의미론과 정합해야 한다.
5. Lineage Search는 `SecurityAudit.php:25-31` 감사 이벤트를 원천으로 하며 결과 자체도 감사 로그를 남긴다.

## 4. KEEP_SEPARATE

- **챗봇 지식베이스(KB)** `GeniegoKnowledge.php:11`·`ClaudeAI.php:282-287` = 제품/도움말 지식 검색. 인가 그래프 검색과 인덱스·목적 전면 분리. 통합·중복 인덱스 금지.
- **LLM 대화 라우팅** `ClaudeAI.php:82`·`:120-322` = 자연어 인프라로만 재사용. authz 검색 인덱스로 오인 금지.

## 5. 판정

**ABSENT** — 인가 그래프 시맨틱 검색(Natural Language/Graph Query/Relationship/Dependency/Lineage) 전용 엔진 grep 0. FULLTEXT/embedding/벡터 인덱스 전역 grep 0. 자연어 인프라는 `ClaudeAI.php:82`·`:120-322` LLM 챗봇으로 존재하나 챗봇 KB(`GeniegoKnowledge.php:11`·`ClaudeAI.php:282-287`)는 KEEP_SEPARATE 대상이지 authz 검색이 아니다. 관계/의존의 원자 진실은 `effectiveForUser`(`:393-421`)·`AdminMenu.php:551-566`에 산재하나 검색 인덱스로 구성되어 있지 않다. → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
