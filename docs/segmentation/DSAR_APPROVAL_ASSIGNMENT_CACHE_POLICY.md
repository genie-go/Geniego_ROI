# DSAR — Cache Policy (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§69 CACHE_POLICY — Resolution Cache Key 구성(원문 전사):

1. `tenant`
2. `work_item`
3. `request version`
4. `case version`
5. `chain version`
6. `resolution level`
7. `definition version`
8. `policy version`
9. `strategy version`
10. `queue version`
11. `candidate set hash`
12. `authority version set hash`
13. `delegation version set hash`
14. `org version`
15. `legal entity version`
16. `resource`
17. `action`
18. `amount`
19. `currency`
20. `capacity snapshot hash`
21. `workload snapshot hash`
22. `availability snapshot hash`
23. `effective ts`

### 1.1 캐시 원칙 (§69 원문)

1. Version-aware · Tenant-aware · Queue-aware · Candidate-aware · Authority-aware · Delegation-aware · Capacity-aware · Availability-aware
2. 전 이벤트 Invalidation (모든 lifecycle 이벤트에서 무효화)
3. Critical Conflict 시 캐시 차단
4. 과거 Snapshot 재생성 금지

## 2. 기존 구현 대조

§GROUND_TRUTH 기준: Resolution 엔티티(§18) 자체가 ABSENT 이므로 Resolution Cache 는 **ABSENT**. Cache Key 를 구성하는 23개 요소 중 대다수(request/case/chain version·authority/delegation version set hash·capacity/workload/availability snapshot hash)가 선행 4축·Snapshot(§54) 부재로 산출 불가.

인접 실존 자산: `catalog_writeback_job`·`omni_outbox`·`pm_task_assignees` 모두 결정론적 Resolution 캐시 개념을 갖지 않는다(직접 상태 테이블 조회 기반). Determinism(§21)의 deterministic cursor·candidate set hash·replay seed 도 부재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: **BLOCKED_PREREQUISITE** — Cache Key 요소 11~15·20~22(candidate/authority/delegation set hash·capacity/workload/availability snapshot hash)는 Candidate(§15)·Authority(축2)·Delegation·Snapshot(§54) 부재에 막힘. 캐시 대상인 Resolution(§18) 자체가 없음.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Resolution(§18) 신설 후에만 캐시 도입. Cache Key 는 §69 23요소 전체를 결합해야 하며, 일부 요소 누락 시 캐시 금지(fail-closed) — 부분키로 잘못된 Resolution 재사용 방지.
- Mandatory Control: 전 lifecycle 이벤트(§14 EVENT_TYPE)에서 Invalidation. Critical Conflict(§52) 발생 시 캐시 경로 차단. 과거 Effective Time 의 Snapshot 은 재생성 금지(§58 과거 재작성 금지와 일치) — 캐시 미스 시에도 당시 Snapshot 을 재조립하지 않고 저장된 Evidence(§63)로 재구성.
- 무후퇴: 신규 캐시는 기존 job/outbox 조회 경로에 개입하지 않음.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
