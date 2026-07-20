# DSAR — Authorization Knowledge Graph Performance (Part 3-21 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Knowledge Graph의 **성능 SLO**를 정의한다. (a) Graph Build ≤ 10분(전체 재구축). (b) Incremental Update ≤ 5초(증분 반영). (c) Semantic Search ≤ 300ms(의미 검색 p95). (d) Reasoning ≤ 1초(추론 질의 p95). (e) Impact Analysis ≤ 2초(영향 분석 p95). (f) Availability ≥ 99.999%(five-nines). 모든 지표는 tenant 격리 하에서 측정한다.

## 2. Substrate 매핑

| SPEC SLO | 측정 대상 substrate | 근거 file:line | 판정 |
|---|---|---|---|
| Graph Build ≤10분 | — (빌드 대상 graph 부재) | — | ABSENT |
| Incremental ≤5초 | — | — | ABSENT |
| Semantic Search ≤300ms | — (시맨틱 검색 엔진 부재) | — | ABSENT |
| Reasoning ≤1초 | ClaudeAI 추론 게이트(간접) | `ClaudeAI.php:70` | ABSENT(KG 미배선) |
| Impact Analysis ≤2초 | — | — | ABSENT |
| (현 권한 조회 원천) | acl_permission SOURCE 조회 | `TeamPermissions.php:393-421` | 참고 substrate |
| Availability ≥99.999% | — (KG 서비스 부재) | — | ABSENT |

## 3. 설계 계약
- **Graph Build**: 전체 재구축 대상 = authz 노드/엣지 집합. 현 원천은 acl_permission SOURCE 조회(`TeamPermissions.php:393-421`)로부터 노드/엣지를 파생해야 하나 그래프 물질화(materialization) 계층 자체가 부재 — 측정 대상 없음.
- **Incremental Update**: 권한 변경 이벤트 → 증분 엣지 갱신. 트리거 원천은 acl_permission 쓰기 경로(`TeamPermissions.php:737-753`)이나 그래프 반영 파이프라인 순신설.
- **Semantic Search / Reasoning**: 의미 검색·추론은 ClaudeAI(`ClaudeAI.php:70`) 확장 기반이 후보이나 현재 KG와 미배선 — 추론 대상 그래프 부재로 SLO 측정 불가.
- **Impact Analysis**: 노드 변경의 하류 영향 순회 — Edge 인덱스(§31) 종속. 인덱스 부재로 성능 측정 불가.
- **Availability**: five-nines는 KG 서비스가 운영 배포된 후에만 측정 가능. 현재 서비스 부재.

## 4. KEEP_SEPARATE
- 마케팅 GraphScore(`GraphScore.php:12-30`·`:57`, `AttributionEngine.php:242`)의 성능 특성은 authz KG SLO와 무관 — 측정·비교 대상 아님.

## 5. 판정
**ABSENT**. 성능 SLO 6종의 **측정 대상 graph 자체가 부재**하다. 현 substrate는 acl_permission SOURCE 조회(`TeamPermissions.php:393-421`)와 ClaudeAI 추론 게이트(`ClaudeAI.php:70`)뿐이며 KG 파이프라인과 미배선. SLO는 §30 스키마·§31 인덱스·빌드 계층 실현 후에만 측정 가능 — **RP-track(Reference Platform) 조건부**. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
