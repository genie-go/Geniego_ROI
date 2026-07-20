# DSAR — Authorization Knowledge Graph Snapshot (Part 3-21 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §17·§30 — APPROVAL_GRAPH_SNAPSHOT / Immutable Graph Version)

Graph Snapshot은 특정 시점의 인가 KG 전체를 불변(immutable)·버전 고정된 단일 판(version)으로 봉인한 것이다. 스냅샷은 이후 Evidence(§18)·Digest(§19)·Analytics(§20)가 참조하는 재현 가능한 기준선이며, 감사·롤백·영향분석의 앵커 역할을 한다. 정규 필드:

- **Graph Version** — 단조 증가 버전 식별자(불변, 재사용 금지).
- **Node Count / Edge Count** — 봉인 시점의 정점·간선 수(집계값, 이후 재계산 금지).
- **Schema Version** — 노드/간선 스키마 계약 버전(§30 스키마 매니저 소유).
- **Timestamp** — 봉인 시각(단조·위조 불가 원천 필요).

## 2. 실존 substrate 매핑

| 스냅샷 요소 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| Immutable 봉인(불변성) | 감사 해시체인(append-only) | `SecurityAudit.php:25-31`·`:63-64` | PARTIAL-substrate |
| 봉인 무결성 검증 | 체인 verify | `SecurityAudit.php:51` | PARTIAL-substrate |
| Graph Version/Node Count/Edge Count | 그래프 판 카운트 | grep 0 | **ABSENT** |
| Schema Version | 스키마 매니저(§30) | grep 0 | **ABSENT** |
| Timestamp 봉인원천 | 감사 이벤트 ts | `SecurityAudit.php:25-31` | PARTIAL-substrate |
| **그래프 스냅샷 스토어** | (부재) | grep 0 | **ABSENT-엔진** |

Ground-Truth 판정: **graph snapshot 부재(grep 0)**. Immutable 성질만 감사 해시체인(`SecurityAudit.php:25-31`)이 substrate로 제공하며, 정점·간선을 봉인하는 스냅샷 스토어 자체는 실존하지 않는다.

## 3. 설계 계약 (규칙)

- **R-SNAP-1 불변**: 봉인된 스냅샷은 write-once. Graph Version은 단조 증가·재사용 금지. 무결성 앵커는 감사 해시체인(`SecurityAudit.php:25-31`·`:63-64`)을 **확장**한 순신설 계층이 담당한다(Replace 금지·Extend).
- **R-SNAP-2 재현성**: 동일 Graph Version 조회는 동일 Node/Edge Count·Schema Version을 결정론적으로 반환. 봉인 후 재계산 금지.
- **R-SNAP-3 검증**: 스냅샷 무결성은 `SecurityAudit.php:51` verify 계약을 준용하되 그래프 판 다이제스트(§19)를 별도 봉인.
- **R-SNAP-4 테넌트 격리**: 스냅샷은 tenantId 스코프로 봉인하며 크로스테넌트 정점 혼입 금지(격리 절대).
- **R-SNAP-5 무후퇴**: 스냅샷 계층은 감사 원장을 read-only 참조만 하고 원천 write·회귀 금지.

## 4. KEEP_SEPARATE

마케팅 GraphScore 지표(`GraphScore.php:429-460`)는 인가 그래프 스냅샷이 아니다. 마케팅 그래프 버전/카운트를 인가 Snapshot으로 겸용 금지·물리·논리·명명 완전 분리.

## 5. 판정

**ABSENT(graph snapshot 없음, grep 0) · NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Immutable 봉인 substrate는 감사 해시체인(`SecurityAudit.php:25-31`·`:63-64`·verify `:51`)이 PARTIAL로 제공하나, 그래프 정점·간선을 봉인하는 스냅샷 스토어·Graph Version·Schema Version은 전부 부재로 순신설 대상이다. 선행 스키마 매니저(§30)·Node/Edge Model 미착수로 실행 인증 불가.
