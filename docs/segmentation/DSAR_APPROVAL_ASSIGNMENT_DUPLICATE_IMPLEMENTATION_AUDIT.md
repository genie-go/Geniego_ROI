# DSAR — Duplicate Implementation Audit (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§66 DUPLICATE_IMPLEMENTATION_AUDIT 점검 항목(원문 전사):

1. 여러 Task / Assignment / Queue Table 난립
2. Workflow ↔ Approval 중복
3. ERP Inbox ↔ Platform Queue 중복
4. Candidate User 오용
5. 하드코딩 / Email / Manager 이름 Assignee
6. Delegation ↔ Reassignment 혼용
7. History / Lease / Snapshot 없음
8. 영구 Claim
9. Fencing 없는 Lock
10. Version 없는 Queue
11. Cross-Tenant Membership
12. 중복 Active (assignment/claim)
13. Stale
14. Orphan
15. Loop (reassignment/routing/fallback)
16. Capacity 미적용
17. Decision-time Revalidation 없음
18. Current State 과거 재해석
19. Mandatory Control 제거

## 2. 기존 구현 대조 — 실존 중복후보 정직 열거

§GROUND_TRUTH §65 태그 기준. "중복(CONSOLIDATION_REQUIRED)"과 "중복 아님(KEEP_SEPARATE)"을 정직히 구분한다.

### 2.1 CONSOLIDATION_REQUIRED (통합 대상 — Assignment/Queue 도메인 중복후보)

- **`catalog_writeback_job`** `Catalog.php:75-84` — 실 승인큐(Approval Queue). 상태 `pending_approval→queued→processing→done/failed`(`Catalog.php:396,2383-2407`). 승인자=임의 `requirePro`(`Catalog.php:2385`, 권한 세분화 없음). CAS claim(`Catalog.php:1721-1731`)+600s 회수(`Catalog.php:1699-1702`). approvalCreate SSOT(`Catalog.php:2301-2319`). §66-2(Workflow↔Approval)·§66-7(Snapshot 없음)·§66-9(Fencing 없는 Lock)·§66-16(Capacity 미적용)에 해당 → **VALIDATED_LEGACY(Approval Queue) + CONSOLIDATION_REQUIRED**.
- **`pm_task_assignees`** `PM/Assignees.php:14,32,17-72` — M:N 수동 배정·role(owner/contributor/reviewer/observer). capacity/workload=`PM/Enterprise.php:371-400`(읽기전용·미환류 → §66-16 Capacity 미적용). §66-1(Task/Assignment Table)에 해당 → **VALIDATED_LEGACY(수동 Work Item+Assignee) + CONSOLIDATION_REQUIRED**.
- **`omni_outbox`** `Omnichannel.php:95-99,405,425-448` — claim_id/claimed_at·`FOR UPDATE SKIP LOCKED`·CAS fallback. 발송용·fencing 없음(§66-9). claim/lease 패턴의 **CANONICAL** substrate. 발송 도메인이므로 Assignment 로 흡수하지 않되, claim/lease 구현 참조 정본으로 채택.

### 2.2 BLOCKED_NO_PRODUCER

- **`action_request`** — 테이블 `Db.php:592`·소비자 `Alerting.php:582-598 decide`·`Alerting.php:601-665 executeAction` 실재. **생산자 INSERT 0 = BLOCKED_NO_PRODUCER**. 죽은 스켈레톤이므로 Assignment 중복으로 카운트 금지(오탐 방지).

### 2.3 KEEP_SEPARATE_WITH_REASON (중복 아님 — 도메인 분리 유지)

- **`admin_growth_approval`** `AdminGrowth.php:142,1289-1298,1313` — 1인 admin 승인. 조직/위임/큐 개념 없는 단일 관리자 게이트 → **KEEP_SEPARATE_WITH_REASON**.
- **`agency_client_link`** `AgencyPortal.php:80,365-384,414-427` — 대행사 접근권 승인. 접근권(access grant) 도메인이지 Work Item Assignment 아님 → **KEEP_SEPARATE_WITH_REASON**.
- **`TeamPermissions DELEGATION_EXCEEDED`** `TeamPermissions.php:627-647` — RBAC 부여상한 monotonicity. §66-6(Delegation↔Reassignment 혼용) 오해 소지 있으나, 이는 위임 assignment 가 아니라 ACL 상한 검증 → **KEEP_SEPARATE_WITH_REASON**(Approval Delegation 과 의미 상이·혼용 금지).
- **`Mapping maker-checker`** `Mapping.php:267-271` (change_request 정족수2 `Mapping.php:273`) — 도메인 정족수 승인 → **KEEP_SEPARATE_WITH_REASON**.

## 3. 판정

- Verdict: **PARTIAL** — 중복후보(§2.1) 실존·통합 대상 존재. Assignment Engine 정본은 여전히 ABSENT.
- 선행 의존: 통합의 정본 SoT(Work Item·Assignment·Queue·Claim·Lease·Lock)가 부재 → **BLOCKED_PREREQUISITE**(선행 4축·§11~§44 신설 후에만 통합 가능).
- cover: `catalog_writeback_job`·`pm_task_assignees`·`omni_outbox` (VALIDATED_LEGACY/CANONICAL) / 정본 엔진 cover **0**.

## 4. 확장/구현 방향 (설계)

- 통합 원칙(Golden Rule = Replace 아니라 Extend): `catalog_writeback_job` 승인큐·`pm_task_assignees` 수동배정을 신규 정본 Work Item/Assignment 로 **점진 매핑**(즉시 치환·삭제 금지 → 무후퇴). claim/lease 는 `omni_outbox` CANONICAL 패턴을 참조 구현으로 채택하되 **fencing token 추가**(§66-9 해소).
- KEEP_SEPARATE 4자산(admin_growth_approval·agency·DELEGATION_EXCEEDED·Mapping maker-checker)은 통합 대상에서 **명시 제외** — 도메인 상이. 특히 DELEGATION_EXCEEDED(ACL 상한)를 Approval Delegation 으로 혼용 금지(§66-6 재현 방지).
- `action_request` 는 생산자 부재이므로 통합/재구현 전 생산자 설계 선행 필요(라이브검증 후) — 블라인드 배선 금지.
- Mandatory Control 유지: 통합 과정에서 Decision-time Revalidation(§66-17)·History/Lease/Snapshot(§66-7)·Capacity 적용(§66-16)을 신규 정본에서 충족.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
