# DSAR — Approval Assignment Snapshot (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`SNAPSHOT`(§54) — 배정 수명주기의 각 이벤트 시점에 **당시 유효했던 배정 결정 문맥 전체를 불변으로 동결**한 감사·재구성·재현용 레코드. Assignment/History 가 "지금 상태"라면 Snapshot 은 "그 순간의 상태"다.

### 필수 필드 (원문)

1. snapshot_id
2. snapshot type (enum → [[DSAR_APPROVAL_ASSIGNMENT_SNAPSHOT_TYPE]])
3. work_item_id
4. assignment_id
5. request / case / chain version
6. chain resolution
7. chain level
8. definition / policy / strategy / queue version
9. candidate set
10. winning candidate
11. assignee identity / role assignment / position incumbency
12. organization
13. legal entity
14. authority
15. delegation
16. resource
17. action
18. monetary
19. currency
20. capacity
21. workload
22. availability
23. skill
24. affinity
25. claim
26. lease
27. lock snapshot
28. conflict result
29. effective_at
30. captured_at
31. immutable_hash
32. status
33. evidence

(원칙: Snapshot 은 이벤트 시점 값을 **재계산 없이 동결**하며 과거 재생성 금지. 동결 무결성은 immutable_hash 로 봉인.)

## 2. 기존 구현 대조

Approval Assignment 엔티티 자체가 **ABSENT**(§GROUND_TRUTH 개념별 판정: Snapshot=ABSENT). 따라서 배정 시점 문맥을 동결하는 Snapshot 저장계층은 실존하지 않는다. Snapshot 은 상위 필드 대부분이 **선행 4축(Approval Chain·Authority·Org·SoD)** 의 값을 참조하는데, 그 축들이 부재하므로 동결할 원본 값 자체가 없다.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Snapshot 저장계층 자체 | 부재 — 배정 시점 문맥 동결 레코드 0 | ABSENT |
| assignee identity / role assignment / position incumbency | 축3 Identity/Org **ABSENT**(`org_unit/reporting_line/incumbency` 0 · `UserAuth.php:156-157,1225-1227` parent_user_id=owner 붕괴·team_role flat 3값) | BLOCKED_PREREQUISITE |
| authority / delegation | 축2 Authority Matrix **ABSENT** · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED=ACL 부여상한(인접상이) | BLOCKED_PREREQUISITE |
| legal entity / organization | 축3 부재(legal_entity 0) | BLOCKED_PREREQUISITE |
| candidate set / winning candidate | Candidate(§15)·Resolution(§18) ABSENT — 동결할 후보 집합 없음 | ABSENT |
| definition / policy / strategy / queue version | Assignment Definition/Policy/Strategy ABSENT · 인접 큐 `catalog_writeback_job`(`Catalog.php:75-84`)에 불변 버전 없음 | ABSENT |
| claim / lease / lock snapshot | 인접 = `catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` claim/lease(`Omnichannel.php:95-99,425-448`) — 동시성 claim은 실재하나 **동결 Snapshot 아님** | PARTIAL(job/발송용·동결 부재) |
| immutable_hash | 불변 해시 정본 = `SecurityAudit.php:56-68` verify()(재계산+prev 교차) — 확장 대상 인접자산 실재 · 🔴 `menu_audit_log.hash_chain` 인용 금지 | LEGACY_ADAPTER(해시 정본) |
| evidence | 동상 = `SecurityAudit.php:56-68` | LEGACY_ADAPTER |

## 3. 판정

- Verdict: **ABSENT** — 배정 시점 문맥 동결 Snapshot 저장계층 통째 부재.
- 선행 의존: assignee identity/authority/delegation/legal entity/organization 필드는 **선행 4축(Authority·Org·SoD) 부재**로 `BLOCKED_PREREQUISITE`. candidate/definition/policy/strategy 는 상위 엔티티 ABSENT 의존. claim/lease/lock 은 인접 자산 `PARTIAL`. immutable_hash/evidence 는 `SecurityAudit::verify()` 인접 정본으로 `LEGACY_ADAPTER`.
- cover: **0** (엔티티 부재. `SecurityAudit::verify()` 는 확장 대상이지 커버가 아니다.)

## 4. 확장/구현 방향 (설계)

- Snapshot 은 순신설이며 **Assignment(§13)·Candidate(§15)·Resolution(§18)·선행 4축이 모두 선행**되어야 동결할 원본이 생긴다. 원본 없는 Snapshot 은 빈 값을 봉인하는 장식이다.
- immutable_hash 는 **새 해시엔진을 만들지 말고 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)를 확장**하라 — tenant 포함 해시 + prev 교차 정본 재사용(중복 엔진 금지). 🔴 `menu_audit_log.hash_chain` 은 verify() 0·preimage ts 소실로 검증 불가능한 장식 → **인용 금지**([[reference_menu_audit_log_not_tamper_evident]]).
- Snapshot 은 **재계산 없이 이벤트 시점 값을 동결**하고 **과거 재생성 절대 금지**(§58 Critical Gap "과거 재작성"). captured_at≠effective_at 을 분리 저장해 as-of 재구성을 정직하게.
- claim/lease/lock snapshot 은 현행 동시성 claim(`Catalog.php:1721-1731`·`Omnichannel.php:425-448`)을 **동결 Snapshot 과 혼동하지 마라** — 동시성 claim 은 CANONICAL 패턴이나 시점 동결과는 별개 계층.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
