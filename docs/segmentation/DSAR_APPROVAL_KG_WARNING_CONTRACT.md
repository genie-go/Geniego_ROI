# DSAR — Authorization Knowledge Graph Warning Contract (Part 3-21 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §28)

에러(§27, 연산 실패)와 달리 **연산은 성공하되 그래프 건강도 저하를 예고**하는 비차단 경고 5종이다. 경고는 연산을 막지 않으나 운영자·거버넌스에 신호를 남긴다(무후퇴·조기경보 목적).

| # | 경고 | 신호 조건 |
|---|---|---|
| W1 | Graph Density Increasing | 엣지/노드 비율이 임계 초과로 증가(과결합) |
| W2 | Dependency Chain Too Long | delegation·role 상속 체인 길이가 권장 한계 초과 |
| W3 | Ontology Drift | 실제 사용 타입 분포가 온톨로지 정의에서 이탈 |
| W4 | Relationship Explosion | 단일 노드의 차수(degree)가 급증(fan-out 폭발) |
| W5 | Semantic Conflict Detected | 의미상 모순된 관계 공존(예: grant ↔ deny 동일 대상) |

## 2. Substrate 매핑 (현행 실측)

| 경고 | 현행 substrate | 등급 |
|---|---|---|
| W2 Dependency Chain | 체인 길이/순환 인접 개념 = 메뉴 트리 깊이 방어 `AdminMenu.php:551-566`(wouldCycle) — 길이 임계가 아니라 순환 차단 목적 | `PARTIAL`(인접 패턴·경고 아님) |
| W1·W3·W4·W5 | density·drift·degree·semantic-conflict 계측 = **grep 0** | `ABSENT` |

## 3. 설계 계약 (신설)

- **5종 경고 전부 순신규**다. 경고는 그래프 연산 성공 응답에 부가되는 비차단 신호 채널로 설계한다.
- W2: `AdminMenu.php:551-566`의 순환 탐지 DFS가 체인을 이미 순회하므로, 순회 중 깊이를 부산물로 계측하여 임계 초과 시 W2 발신 — 별도 체인 워커 신설 금지, 기존 순회 확장.
- W3 Ontology Drift: §26 Static Lint의 온톨로지 SSOT와 실사용 타입 분포를 비교한 결과를 경고로 표면화(린트는 배포 정적, 경고는 런타임 누적).
- W5 Semantic Conflict: 동일 (subject,resource)에 대한 상충 관계(grant/deny·include/exclude)를 탐지 — Explainable(근거 엣지 쌍 첨부, Volume 4).
- 경고는 연산을 **차단하지 않는다**(에러 §27과 축 분리). 다만 W1/W4가 Graph Poisoning(§25 G6)의 조기신호일 수 있어 런타임 가드와 신호를 공유.

## 4. 판정

- **KG Warning Contract = ABSENT** (5종 경고·density/drift/degree/semantic 계측 grep 0).
- W2가 확장 재사용할 순환 탐지(`AdminMenu.php:551-566`)만 `PARTIAL` — 이는 **순환 차단**이지 **체인 길이 경고**가 아니므로 커버로 계산 금지.
- 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(온톨로지 SSOT·그래프 저장소 선행 부재).
- ★경고 채널 부재를 "그래프가 건강하다"로 읽지 마라 — 계측 대상 그래프 자체가 부재.
