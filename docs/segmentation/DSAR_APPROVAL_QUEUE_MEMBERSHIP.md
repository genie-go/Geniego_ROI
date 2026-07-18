# DSAR — Approval Queue Membership (§24) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §24 QUEUE_MEMBERSHIP 필수 필드 (원문 전사)
1. membership_id
2. queue_version_id
3. membership type
4. subject id
5. role id
6. role assignment id
7. position id
8. position incumbency id
9. group id
10. organization id
11. legal entity id
12. geography
13. membership priority
14. claim eligibility
15. assignment eligibility
16. capacity profile
17. availability profile
18. valid_from / valid_to
19. status
20. evidence

### §24 MEMBERSHIP_TYPE enum (원문 전사)
1. SUBJECT
2. ROLE
3. POSITION
4. GROUP
5. ORGANIZATION
6. LEGAL_ENTITY_FUNCTION
7. DYNAMIC_RULE
8. CUSTOM

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 **큐 멤버십 개념이 전무**하다(Queue Membership=ABSENT).

- "어떤 유저가 이 승인 큐에 속하는가"를 표현하는 테이블/로직이 없다. `catalog_writeback_job` 의 `approveQueue`(`Catalog.php:2385`) 는 테넌트 내 임의 requirePro 통과자를 승인자로 허용 — 멤버 집합이 아니라 게이트다. `admin_growth_approval` 은 admin 1인(`AdminGrowth.php:1313`).
- 가장 근접한 인접 자산은 **작업 배정 M:N** 이나 승인 큐 멤버십이 아니다: `pm_task_assignees`(task_id·user_id·role owner/contributor/reviewer/observer `PM/Assignees.php:14,32`, 수동 add/remove `PM/Assignees.php:17-72`) 는 개별 태스크에 사람을 붙이는 것이지, 큐에 대한 멤버 자격이 아니다.
- ROLE/POSITION/ORGANIZATION/LEGAL_ENTITY_FUNCTION 멤버십 유형은 선행 3축 Identity/Org(ABSENT) 에 막힌다: `parent_user_id` 는 owner/tenant 상속으로 붕괴(`UserAuth.php:156-157,1225-1227`)하고 team_role 은 flat 3값이라 position/incumbency 를 표현하지 못한다.
- claim eligibility / capacity profile / availability profile 은 멤버 단위로 존재하지 않는다(capacity 는 배정 미환류 읽기전용 리포트 `PM/Enterprise.php:371-400`).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Membership 은 Queue Version(§23·ABSENT)에 딸리며, ROLE/POSITION/ORGANIZATION/LEGAL_ENTITY_FUNCTION 유형은 선행 축3 Identity/Org(ABSENT — role assignment·position incumbency·org_unit·legal_entity 전무) 에 전면 막혀 `BLOCKED_PREREQUISITE`. SUBJECT 직접 멤버십조차 큐 컨테이너에 멤버 테이블이 없어 부재.
- cover: 0 (큐 멤버 집합·membership type·claim/assignment eligibility 어느 것도 없음)

## 4. 확장/구현 방향 (설계)

- Membership 은 **순신규**다. 다만 M:N assignee+role 모델(`pm_task_assignees` `PM/Assignees.php:14,32,17-72`)의 관계 shape 를 **확장·재사용**(§65 VALIDATED_LEGACY + CONSOLIDATION_REQUIRED) — 새 멤버십 테이블을 무에서 만들지 말고 role(owner/contributor/reviewer/observer) 개념을 승인 큐 멤버십 role 로 일반화.
- ROLE/POSITION/ORGANIZATION/LEGAL_ENTITY_FUNCTION 유형은 선행 3축 신설 전 사용 금지 — role assignment id·position incumbency id·organization id·legal entity id 를 참조할 SoT 가 없는데 멤버십을 문자열로 채우면 §65 "Role 이름 문자열 판정"·"Cross-Tenant Membership" gap 을 구조적으로 유발.
- Mandatory Control: 멤버십은 반드시 queue_version_id 에 바인딩(불변 스냅샷)되어야 하며, claim 시 §41 검증("Candidate Queue Member") 이 멤버십 활성을 재확인 — 멤버십 없는 claim 은 §58 High gap.
- 무후퇴: `pm_task_assignees` 수동 배정 경로는 통합 후에도 SUBJECT 직접 멤버십으로 보존(§70 Regression).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
