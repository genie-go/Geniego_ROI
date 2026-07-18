# DSAR — Approval Work Item (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 WORK_ITEM 필수 필드 (원문 전사):

1. approval_work_item_id
2. tenant_id
3. approval_request_id
4. request_version_id
5. case_id
6. case_version_id
7. item_id
8. requirement_id
9. workflow_id
10. workflow_version_id
11. chain_id
12. chain_version_id
13. chain_resolution_id
14. chain_resolution_level_id
15. stage id
16. level id
17. work item type
18. subject resource type
19. subject resource id
20. action type
21. organization id
22. legal entity id
23. geography
24. amount
25. currency
26. priority
27. risk reference
28. due date reference
29. assignment policy version id
30. current assignment id
31. work item status
32. created_at
33. activated_at
34. completed_at
35. cancelled_at
36. immutable origin hash
37. status
38. evidence

WORK_ITEM_TYPE (enum): APPROVAL · REVIEW · VALIDATION · FINANCIAL_APPROVAL · LEGAL_APPROVAL · COMPLIANCE_APPROVAL · SECURITY_APPROVAL · REBATE_APPROVAL · CLAIM_APPROVAL · SETTLEMENT_APPROVAL · PAYMENT_APPROVAL · CONTRACT_APPROVAL · EXCEPTION_REVIEW · MANUAL_REVIEW · CUSTOM.

## 2. 기존 구현 대조

- **통합 "approval work item" 추상은 부재하나, work-item substrate 2종이 실존한다** — 이것이 PARTIAL 판정의 근거다:
  - **`catalog_writeback_job`**(`Catalog.php:75-84`) — job 단위 승인 큐 아이템. lifecycle pending_approval→queued→processing→done/failed(`Catalog.php:396`). approvalCreate 가 SSOT job 테이블에 기록(`Catalog.php:2301-2319`). CAS claim(`Catalog.php:1721-1731`)+600s 회수(`Catalog.php:1699-1702`). 승인자=임의 requirePro(`Catalog.php:2385`, `Catalog.php:2383-2407`). → **VALIDATED_LEGACY(Approval Queue 아이템) + CONSOLIDATION_REQUIRED**.
  - **`pm_task_assignees` + pm_tasks**(`PM/Assignees.php:14`, `PM/Assignees.php:32`, `PM/Assignees.php:17-72`) — 수동 work item + M:N assignee(role owner/contributor/reviewer/observer). capacity/workload 읽기전용 신호(`PM/Enterprise.php:371-400`). → **VALIDATED_LEGACY(수동 Work Item) + CONSOLIDATION_REQUIRED**.
- **부재한 필드 축(대부분)**: chain_id/chain_version_id/chain_resolution_id/chain_resolution_level_id(선행 축1 Chain ABSENT) · organization id/legal entity id(선행 축3 Org ABSENT) · assignment policy version id/current assignment id(정책·배정 부재) · amount/currency(금액축·통화 저장계층 부재) · immutable origin hash(불변 해시 정본=`SecurityAudit.php:56-68`만).
- **request/case/requirement/workflow 참조**: 통합 approval request↔work item 배선 부재. 인접 승인 티켓(`catalog_writeback_approval` `Catalog.php:86`·`admin_growth_approval` `AdminGrowth.php:142`·`mapping_change_request` `Mapping.php:273`)은 work item 추상으로 통합돼 있지 않다.

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: substrate(catalog_writeback_job job·pm_tasks/pm_task_assignees 수동)는 실재하나, 통합 approval work item 추상은 축1(Chain)·축3(Org) 부재로 chain/stage/level·organization/legal entity 필드를 채울 수 없어 BLOCKED. 금액/통화·정책 version·assignment id 축도 부재.
- cover: substrate 2종 = 아이템 lifecycle·claim·수동 assignee/role/workload 신호(위 file:line). 통합 추상·chain/org/금액/정책 축 = 0.

## 4. 확장/구현 방향 (설계)

- **확장(재생성 금지)**: 통합 approval work item 은 `catalog_writeback_job` 의 상태머신+CAS claim(`Catalog.php:1721-1731`)과 `pm_task_assignees` 의 role 모델(`PM/Assignees.php:17-72`)·capacity 신호(`PM/Enterprise.php:371-400`)를 편입해 재사용한다. 새 병렬 task/queue 테이블을 또 만들면 §66 Duplicate Task Table.
- **Mandatory Control**: work item 은 immutable origin hash(§54 Snapshot 계열)로 생성 시점을 봉인 · work item status(§12)는 합법 전이집합으로 강제 · assignment policy version id 없이 배정 확정 금지(§58).
- **무후퇴**: 통합이 기존 catalog 승인 job·PM 태스크 배정 동작을 회귀시키면 안 됨(§70 — catalog_writeback_job 승인큐·pm_task_assignees 무후퇴 명시).
- **선결**: chain/org 축(선행) 필드는 축 신설 후 채움. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
