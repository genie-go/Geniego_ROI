# DSAR — Authorization Knowledge Graph API Surface (Part 3-21 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §29)

권한 지식 그래프 거버넌스의 **외부 API 표면 8종**이다. 모두 §25 Runtime Guard 하위에서 실행되고, 실패는 §27 에러코드로, 건강도는 §28 경고로 표면화된다.

| # | 엔드포인트(개념) | 책무 |
|---|---|---|
| A1 | Build Knowledge Graph | 권한 노드/엣지 적재·그래프 구축 |
| A2 | Query Graph | 노드/서브그래프 조회 |
| A3 | Query Relationship | 특정 (source,type,target) 관계 조회 |
| A4 | Execute Semantic Search | 의미 기반 노드/관계 검색 |
| A5 | Run Impact Analysis | 변경 파급(영향도) 분석 |
| A6 | Execute Graph Reasoning | 근거 경로 기반 권한 추론 |
| A7 | Query Analytics | 그래프 지표(density·degree·chain) 집계 |
| A8 | Run Graph Simulation | 가상 변경 시나리오 시뮬레이션 |

## 2. Substrate 매핑 (현행 실측)

| API | 현행 substrate | 등급 |
|---|---|---|
| A4·A6 (Search·Reasoning) | LLM 추론 인프라 `ClaudeAI.php:70`·`:82` — 자연어/의미 추론 호출 원천(재사용 대상) | `PARTIAL`(추론 인프라 존재·그래프 미연결) |
| A2·A3 (Query·Relationship) | 권한 조회 baseline `acl_permission` tenant_id 격리(`TeamPermissions.php:152-159`) + 역할/권한 조회 경로(`:234`·`:393-421`·`:642-692`) | `PARTIAL`(관계형 조회·그래프 API 아님) |
| A1·A5·A7·A8 (Build·Impact·Analytics·Simulation) | 그래프 구축/영향도/지표/시뮬레이션 = **grep 0** | `ABSENT` |

## 3. 설계 계약 (신설)

- **8종 API 전부 순신규**다. 신규 엔드포인트는 `/api` 접두를 사용하고 라우트 등록 파일에 핸들러 `$register` 배선을 추가한다(nginx SPA HTML 폴백 착시 회피 — 실배선 검증 필수).
- A4/A6: LLM 추론 인프라(`ClaudeAI.php:70`·`:82`)를 **재사용**한다 — 추론 엔진 병렬 신설 금지. 단 모든 추론 결론은 근거 엣지 경로(evidence path)를 첨부해야 하며(Explainable, Volume 4), 근거 부재는 §27 `GRAPH_REASONING_FAILED`로 거부.
- A2/A3: 조회는 매 홉 `tenant_id`(`TeamPermissions.php:152-159`) 격리를 강제 — Cross-Tenant Graph Leakage(§25 G4) 차단. 기존 역할/권한 조회 경로(`:234`·`:393-421`·`:642-692`)의 테넌트 술어 규약을 그래프 traversal로 승격.
- A1: 그래프 구축 write는 `putTeamPermissions` 쓰기 게이트(`TeamPermissions.php:599-621`)의 인가 규약을 재사용하고, 매 엣지 mutation을 `SecurityAudit`(`:63-64`) 체인에 append.
- A5/A8(Impact·Simulation): 실제 그래프를 변경하지 않는 읽기 전용 파생 — 결과는 §28 경고(density·chain·explosion)를 동반 산출.
- A7 Query Analytics: §28 경고가 참조하는 지표의 조회 표면.

## 4. KEEP_SEPARATE

- `GraphScore.php:12-30`·`:57`(그래프 스코어)·`AttributionEngine.php:242`(어트리뷰션 그래프)는 **마케팅 도메인**이다. 권한 KG API가 이들을 substrate로 흡수 금지 — 명명 유사("graph")로 인한 오판 방지. Reasoning 인프라는 `ClaudeAI.php`만 공유하고, 마케팅 그래프 자산은 축을 분리한다.

## 5. 판정

- **KG API Surface = ABSENT** (8종 그래프 거버넌스 API grep 0).
- A4/A6가 재사용할 추론 인프라(`ClaudeAI.php:70`·`:82`), A2/A3가 재사용할 조회·테넌트 격리(`:152-159`·`:234`·`:393-421`·`:642-692`), A1이 재사용할 쓰기 게이트·감사(`:599-621`·`SecurityAudit.php:63-64`)만 `PARTIAL`.
- 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(그래프 저장소·온톨로지 SSOT·§25 가드 선행 부재).
- ★`GraphScore`/`AttributionEngine`(마케팅)을 권한 KG API substrate로 오판 금지(KEEP_SEPARATE).
