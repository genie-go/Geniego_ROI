# DSAR — Authorization Graph Synchronization (Part 3-21 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §8)

Graph Synchronization은 SOURCE 인가 상태의 변경을 파생 그래프에 **일관되게·증분적으로** 반영하는 동기화 계약이다. 동기화 대상 축: **Policy / Role / Permission / Assignment / Resource / Context / Decision**. 각 축의 변경 이벤트가 발생하면 관련 노드·엣지만 갱신(add/update/tombstone)하고, 전체 그래프 재구성은 정합성 복구 예외로 제한한다. 동기화는 **단방향**(SOURCE → 그래프)이며 역류(그래프 → SOURCE) 경로는 존재하지 않는다.

## 2. Substrate 매핑 표 (변경 이벤트 → 동기화 축)

| 동기화 축 | SOURCE 변경 지점(정본) | file:line | incremental 반영 |
|---|---|---|---|
| Permission | subjectPerms 조회/변경 | `TeamPermissions.php:202-213` | subject 노드 grants edge 델타 |
| Scope/Context | subjectScope 조회/변경 | `TeamPermissions.php:215-225` | scoped edge 재계산 |
| Role/Assignment | 역할·프리셋 재바인딩 | `TeamPermissions.php:737-753` | role edge 재연결 |
| Decision(파생) | effectiveForUser 재해석 | `TeamPermissions.php:393-421` | effective 노드 재투영 |

## 3. 설계 계약 (Sync 불변식)

- **증분성**: 하나의 subjectPerms/subjectScope 변경은 해당 subject 서브그래프만 재계산한다. 무관 노드 불변(no wide invalidation).
- **순서·멱등**: 동기화 이벤트는 순서 무관하게 최종 SOURCE 상태로 수렴(idempotent). 재적용해도 그래프 상태 동일.
- **Tombstone**: 회수/삭제는 엣지 물리삭제가 아니라 tombstone 마킹 → 감사·재현성 보존(SecurityAudit append-only 원칙과 정합).
- **단방향 불변**: 그래프 동기화는 SOURCE를 절대 수정하지 않는다. 정합성 불일치 발견 시 그래프를 SOURCE에 맞춰 정정할 뿐 그 역은 없다.

## 4. KEEP_SEPARATE

마케팅/어트리뷰션 계열 그래프 동기화(GraphScore·markov·journey)는 인가 동기화와 **별개 파이프라인**이다. 본 §8은 인가 축(Policy/Role/Permission/Assignment/Resource/Context/Decision)에만 적용되며 마케팅 그래프와 코드·스케줄·정본을 공유하지 않는다.

## 5. 판정

**ABSENT**: Graph Synchronization 실체 없음(graph sync grep 0). subjectPerms(`TeamPermissions.php:202-213`)·subjectScope(`TeamPermissions.php:215-225`) 변경 지점은 실재하나 이를 증분 반영하는 동기화 계층은 **순신설**이다. SOURCE 단방향·멱등·tombstone 계약 하에서만 인증 가능. NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행: §7 Builder 파생 뷰 확정).
