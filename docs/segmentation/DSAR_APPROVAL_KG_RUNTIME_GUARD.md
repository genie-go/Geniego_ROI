# DSAR — Authorization Knowledge Graph Runtime Guard (Part 3-21 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §25)

Authorization Knowledge Graph(권한 지식 그래프)의 **런타임 방어벽**이다. 그래프 노드(주체·역할·권한·리소스·테넌트)와 엣지(assignment·grant·scope·delegation) 상태를 변경하거나 조회·추론할 때, 다음 6종 위협을 실시간으로 차단해야 한다.

| # | 위협 | 계약 요구 |
|---|---|---|
| G1 | Unauthorized Graph Update | 인가되지 않은 노드/엣지 생성·수정·삭제 차단 |
| G2 | Ontology Corruption | 온톨로지(노드 타입·엣지 타입 스키마) 위반 쓰기 거부 |
| G3 | Relationship Forgery | 존재하지 않았던 관계를 사후 위조·삽입하는 행위 탐지 |
| G4 | Cross-Tenant Graph Leakage | 테넌트 A의 그래프 조회/추론이 테넌트 B 노드에 도달 차단 |
| G5 | Invalid Inference | 근거 엣지 없는 추론 결론(권한 유추) 생성 거부 |
| G6 | Graph Poisoning | 대량·반복 저품질 엣지 주입으로 추론을 오염시키는 공격 차단 |

## 2. Substrate 매핑 (현행 실측 → 재사용 baseline)

| 위협 | 현행 substrate | 등급 |
|---|---|---|
| G1 Unauthorized Update | `putTeamPermissions` 쓰기 게이트(`TeamPermissions.php:599-621`)가 권한 변경의 유일 인가 관문 — **KG 노드/엣지 쓰기는 이 게이트 밖** | `PARTIAL`(baseline 있음·그래프 미적용) |
| G3 Relationship Forgery | append-only 해시체인 검증 `SecurityAudit.php:63-64`(verify) — 관계 변경 이력의 tamper-evident 원천 | `PARTIAL`(감사 원천 존재·엣지 미기록) |
| G4 Cross-Tenant Leakage | `acl_permission` tenant_id 격리(`TeamPermissions.php:152-159`) — 조회 경로의 테넌트 baseline | `PARTIAL`(테이블 격리·그래프 탐색 미적용) |
| G2·G5·G6 | 온톨로지 스키마·추론 근거·주입 레이트 방어 = **grep 0** | `ABSENT` |

## 3. 설계 계약 (신설)

- **KGRuntimeGuard**는 순신설이다. 그래프 mutation API(§29) 앞단에서 6종을 인터셉트한다.
- G1: 모든 노드/엣지 write는 `putTeamPermissions`(`TeamPermissions.php:599-621`)가 확립한 actor·scope 게이트 규약을 **재사용**하여 통과시킨다 — 병렬 인가 엔진 신설 금지.
- G2: 온톨로지 정의(허용 노드 타입·엣지 타입·cardinality)를 SSOT로 두고 위반 write는 `ONTOLOGY_CONFLICT`(§27)로 거부.
- G3: 모든 엣지 mutation은 `SecurityAudit`(`:63-64` verify) 해시체인에 append. 위조 탐지 = 체인 재계산 불일치. 장식 체인 금지(288차 교훈: 쓰기만 하고 verify 0은 tamper-evident 아님).
- G4: 그래프 탐색(traversal)의 매 홉에서 `tenant_id`(`TeamPermissions.php:152-159` 격리 규약)를 술어로 강제 — 홉이 테넌트 경계를 넘으면 즉시 절단.
- G5: 추론 결론은 근거 엣지 집합(evidence path)을 필수 첨부, 근거 부재 시 `INVALID_INFERENCE` 계열로 거부(Explainable — Volume 4 원칙).
- G6: 엣지 주입 레이트·중복·저품질 신호를 Data Trust(V3 READY/WARNING/BLOCKED) 기준으로 게이팅, BLOCKED 소스 엣지는 추론 제외.

## 4. 판정

- **KG Runtime Guard = ABSENT** (전용 가드·온톨로지·추론 근거 검증 grep 0).
- 재사용 가능 baseline 3종은 `PARTIAL`: 쓰기 게이트(`:599-621`)·해시체인 verify(`:63-64`)·tenant_id 격리(`:152-159`). **셋 다 그래프 자료구조에 적용된 사실이 없다** — "테이블이 격리되어 있으니 그래프도 안전"으로 읽으면 오판.
- 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(온톨로지 SSOT·그래프 저장소 선행 부재).
- ★`graph_node`/`graph_edge` 명명은 마케팅 도메인 자산으로 PRESENT — 본 권한 KG의 substrate로 오인 금지.
