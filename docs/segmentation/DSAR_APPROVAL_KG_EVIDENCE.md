# DSAR — Authorization Knowledge Graph Evidence (Part 3-21 §18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §18·§30 — APPROVAL_GRAPH_EVIDENCE)

Graph Evidence는 인가 판정·영향분석·추론 결과가 "어떤 정점·간선을 근거로 도출되었는가"를 재현 가능하고 위조 불가능하게 봉인한 증거 계층이다. 정규 필드:

- **Relationship** — 판정에 관여한 정점 간 관계(간선) 집합.
- **Dependency Proof** — 특정 인가가 의존한 상위/하위 정점 경로 증거.
- **Impact Analysis** — 정점/간선 변경 시 영향 받는 인가 집합.
- **Reasoning Result** — 시맨틱 추론(§ 상위)이 산출한 결론과 그 근거 경로.
- **Graph Integrity** — 위 근거가 스냅샷(§17) 상태와 무결하게 일치함을 증명.

## 2. 실존 substrate 매핑

| Evidence 요소 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| Graph Integrity(위조불가 봉인) | 감사 해시체인 append-only | `SecurityAudit.php:25-31`·`:63-64` | PARTIAL-substrate |
| 무결성 verify | 체인 검증 | `SecurityAudit.php:51` | PARTIAL-substrate |
| 권한변경 행위 증거 | 팀 권한 감사 로그 | `TeamPermissions.php:714-731` | PARTIAL-substrate |
| 감사 조회 표면 | 팀 감사 조회 | `TeamPermissions.php:737-753` | PARTIAL-substrate |
| Relationship/Dependency Proof | 그래프 간선 근거 | grep 0 | **ABSENT** |
| Impact Analysis/Reasoning Result | 그래프 추론 근거 | grep 0 | **ABSENT** |
| **그래프 증거 스토어(native)** | (부재) | grep 0 | **ABSENT-엔진** |

Ground-Truth 판정: **PARTIAL-substrate**. 위조불가 봉인·검증은 감사 해시체인(`SecurityAudit.php:25-31`·`:63-64` verify)과 팀 권한 감사(`TeamPermissions.php:714-731`)를 graph evidence로 **확장** 가능하나, graph 정점·간선 기반 native evidence(Relationship/Dependency/Impact/Reasoning)는 순신설이다.

## 3. 설계 계약 (규칙)

- **R-EVD-1 봉인 확장**: Graph Integrity는 감사 해시체인(`SecurityAudit.php:25-31`·`:63-64`)을 Replace하지 않고 Extend한다. 그래프 근거 다이제스트를 체인 페이로드로 봉인.
- **R-EVD-2 재현성**: 모든 Reasoning Result는 참조 Graph Version(§17)과 근거 경로를 함께 봉인해 재현 가능해야 한다(근거없는 결론 금지).
- **R-EVD-3 감사 승격**: 권한변경 evidence는 `TeamPermissions.php:714-731` 기록을 정점-간선 근거로 승격 매핑하되 원천 write 금지(무후퇴).
- **R-EVD-4 검증 준용**: 무결성 검증은 `SecurityAudit.php:51` verify 계약을 준용. 검증 실패 시 evidence BLOCKED 처리(fail-closed).
- **R-EVD-5 테넌트 격리**: evidence는 tenantId 스코프. 크로스테넌트 근거 병합 금지.

## 4. KEEP_SEPARATE

마케팅 GraphScore(`GraphScore.php:429-460`) 지표는 인가 evidence가 아니다. 마케팅 그래프 근거를 인가 Graph Evidence로 겸용 금지·완전 분리.

## 5. 판정

**PARTIAL-substrate · graph snapshot 순신설 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 위조불가 봉인·무결성 검증 substrate는 감사 해시체인(`SecurityAudit.php:25-31`·`:63-64`·verify `:51`)과 팀 권한 감사(`TeamPermissions.php:714-731`·조회 `:737-753`)로 존재해 evidence 확장이 가능하나, Relationship/Dependency Proof/Impact Analysis/Reasoning Result 등 native graph evidence는 ABSENT(grep 0)로 순신설이다. 선행 Snapshot(§17)·Node/Edge Model 미착수로 실행 인증 불가.
