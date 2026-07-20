# DSAR — Authorization Knowledge Graph Analytics (Part 3-21 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §20 — APPROVAL_GRAPH_ANALYTICS)

Graph Analytics는 봉인된 스냅샷(§17) 위에서 인가 KG의 구조적 지표를 산출해 정책 복잡도·과대권한·고립 정점·거버넌스 위험을 정량화한다. 정규 지표:

- **Node Count / Edge Count** — 정점·간선 규모.
- **Relationship Density** — 간선 밀도(과결합·과대권한 신호).
- **Connected Components** — 연결 요소(고립 정점·단절 도메인 탐지).
- **Centrality** — 중심성(핵심 Role/Permission 병목·단일장애점 식별).
- **Policy Complexity** — 정책 복잡도(간소화 후보).
- **Graph Growth** — 판 간 성장 추이(권한 팽창 감시).

## 2. 실존 substrate 매핑

| 지표 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| Node/Edge Count | Snapshot(§17) 카운트 | grep 0 (선행부재) | **ABSENT** |
| Relationship Density | 간선 밀도 계산 | grep 0 | **ABSENT** |
| Connected Components | 연결 요소 알고리즘 | grep 0 | **ABSENT** |
| Centrality | 중심성 알고리즘 | grep 0 | **ABSENT** |
| Policy Complexity | 정책 복잡도 지표 | grep 0 | **ABSENT** |
| Graph Growth | 판 간 성장 추이 | grep 0 | **ABSENT** |
| **그래프 분석 엔진** | (부재) | grep 0 | **ABSENT-엔진** |

Ground-Truth 판정: **centrality grep 0 · connectedComponents grep 0**. 인가 KG용 구조 분석 지표·알고리즘은 전부 부재로 순신설이다. 입력원인 Snapshot(§17)도 선행 부재.

## 3. 설계 계약 (규칙)

- **R-ANL-1 스냅샷 입력**: 모든 지표는 봉인된 Snapshot(§17) Graph Version을 유일 입력으로 삼는다. 라이브 그래프 즉석 계산 금지(재현성).
- **R-ANL-2 결정론**: 동일 Graph Version 재분석은 동일 지표를 반환. 비결정 순회 순서 제거.
- **R-ANL-3 XAI 근거**: Centrality·Policy Complexity 기반 거버넌스 경고는 근거 정점·경로를 함께 제시(근거없는 결론 금지).
- **R-ANL-4 안전 권고**: 과대권한/병목 탐지는 권고(recommendation)로 산출하되 자동 권한 회수 금지 — 승인정책 존중(안전한 자동화).
- **R-ANL-5 테넌트 격리**: 지표는 tenantId 스코프로 산출. 크로스테넌트 그래프 통합 분석 금지.

## 4. KEEP_SEPARATE

★ **마케팅 격리**: `GraphScore.php:429-460`의 그래프 지표는 **마케팅 인플루언서/어트리뷰션 스코어**이며 인가 그래프 분석이 아니다. 데이터 자산(`DataPlatform.php:281`)·어트리뷰션(`AttributionEngine.php:242`)의 그래프성 지표도 인가 Analytics와 물리·논리·명명 완전 분리. 마케팅 centrality/density를 인가 지표로 겸용·재사용 금지.

## 5. 판정

**ABSENT(centrality grep 0·connectedComponents grep 0) · NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 인가 KG용 Node/Edge Count·Relationship Density·Connected Components·Centrality·Policy Complexity·Graph Growth 지표와 분석 엔진은 전부 부재로 순신설이다. 마케팅 GraphScore(`GraphScore.php:429-460`)·DataPlatform(`DataPlatform.php:281`)·AttributionEngine(`AttributionEngine.php:242`)은 KEEP_SEPARATE(오판·재사용 금지). 선행 Snapshot(§17) 미착수로 실행 인증 불가.
