# DSAR — Authorization Knowledge Graph Digest (Part 3-21 §19)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §19 — APPROVAL_GRAPH_DIGEST)

Graph Digest는 인가 KG의 4대 입력(Graph 상태 · Snapshot(§17) · Evidence(§18) · Analytics(§20))을 단일 결정론적 축약값으로 압축한 지문(fingerprint)이다. Digest는 스냅샷 간 동일성/변경 탐지, 봉인 무결성 앵커링, 감사 원장 봉인 페이로드로 쓰인다. 정규 입력·산출:

- **입력** — Graph(정점·간선 상태) · Snapshot(Graph Version·Count·Schema Version) · Evidence(근거 경로) · Analytics(집계 지표).
- **산출** — 결정론적 다이제스트(동일 입력→동일 값), 봉인 시각·버전 메타 포함.

## 2. 실존 substrate 매핑

| Digest 요소 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| 다이제스트/해시 참고 패턴 | 감사 체인 다이제스트 계산 | `SecurityAudit.php:35-38` | 참고만(PARTIAL) |
| 봉인 무결성 앵커 | append-only 체인 | `SecurityAudit.php:25-31`·`:63-64` | 참고만(PARTIAL) |
| Graph/Snapshot/Evidence/Analytics 입력 | §17·§18·§20 산출 | grep 0 | **ABSENT(선행부재)** |
| **그래프 다이제스트 엔진** | (부재) | grep 0 | **ABSENT-엔진** |

Ground-Truth 판정: **digest 부재(grep 0)**. 해시 다이제스트 계산 패턴은 감사 체인(`SecurityAudit.php:35-38`)이 **참고 대상**으로 존재하나, 4대 그래프 입력을 축약하는 Digest 엔진 자체와 그 입력원(Snapshot/Evidence/Analytics)이 모두 선행 부재로 순신설이다.

## 3. 설계 계약 (규칙)

- **R-DIG-1 결정론**: 동일 (Graph, Snapshot, Evidence, Analytics) 입력은 항상 동일 Digest를 산출한다. 비결정 요소(임의 순서·타임존 편차) 제거.
- **R-DIG-2 입력 완결성**: Digest는 4대 입력이 모두 봉인된 상태에서만 산출. 하나라도 미봉인이면 BLOCKED(fail-closed).
- **R-DIG-3 해시 준용**: 다이제스트 계산은 감사 체인 다이제스트 패턴(`SecurityAudit.php:35-38`)을 참고·준용하되, 원천 감사 로직을 Replace하지 않는다(Extend).
- **R-DIG-4 봉인 연계**: 산출된 Digest는 스냅샷(§17) Graph Version과 1:1로 봉인·앵커링(`SecurityAudit.php:25-31`·`:63-64` 체인 확장).
- **R-DIG-5 테넌트 격리**: Digest는 tenantId 스코프로 산출. 크로스테넌트 입력 혼합 금지.

## 4. KEEP_SEPARATE

마케팅 GraphScore 지표(`GraphScore.php:429-460`)·데이터 자산(`DataPlatform.php:281`)은 인가 Digest 입력이 아니다. 마케팅 그래프 축약값을 인가 Digest로 겸용 금지·완전 분리.

## 5. 판정

**ABSENT(digest 없음, grep 0) · NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 해시 다이제스트 계산 패턴은 감사 체인(`SecurityAudit.php:35-38`·봉인 `:25-31`·`:63-64`)이 참고 substrate로 제공하나, 4대 그래프 입력(Snapshot·Evidence·Analytics 포함)과 이를 축약하는 Digest 엔진은 전부 선행 부재로 순신설이다. 선행 §17·§18·§20 미착수로 실행 인증 불가.
