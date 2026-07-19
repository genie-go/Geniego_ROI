# DSAR — Approval Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 ASSIGNMENT 필수 필드 (원문 전사):

1. approval_assignment_id
2. work_item_id
3. assignment sequence
4. type
5. source
6. policy version id
7. strategy id
8. strategy version
9. queue id
10. queue version id
11. assignee subject id
12. assignee role assignment id
13. assignee position incumbency id
14. original participant subject id
15. delegator subject id
16. delegation definition id
17. delegation version id
18. authority definition id
19. authority version id
20. authority resolution id
21. candidate id
22. resolution id
23. priority
24. score
25. reason
26. assigned_by
27. assigned_at
28. effective_from
29. effective_to
30. claim required
31. claim status
32. current lease id
33. current lock id
34. status
35. evidence

ASSIGNMENT_TYPE (enum): DIRECT · QUEUE · CLAIMED_FROM_QUEUE · AUTO_ASSIGNED · MANUAL_ASSIGNED · DELEGATED · SUBSTITUTE · ACTING · REASSIGNED · TRANSFERRED · FALLBACK · RECOVERED · EMERGENCY · CUSTOM.

## 2. 기존 구현 대조

- **승인을 특정 승인자에게 배정하는 assignment 테이블/핸들러는 0.** 승인은 "특정 승인자에 배정"되지 않고 "임의 자격 보유자"에게 열려 결정된다:
  - catalog 승인 큐: 테넌트 내 **임의 requirePro** 자가 approveQueue(`Catalog.php:2385`, `Catalog.php:2383-2407`) — per-approver 배정 없음.
  - admin growth 승인: admin **1인** 결정(`AdminGrowth.php:1313`, `AdminGrowth.php:1289-1298`) — 후보/전략/라우팅 없음.
  - mapping 변경: 정족수2 maker-checker(`Mapping.php:267-271`, `Mapping.php:273`) — 도메인 국한·assignee 배정 아님.
- **가장 근접한 실 배정 = 수동 PM assignee**(`PM/Assignees.php:14`, `PM/Assignees.php:17-72`): M:N add/remove·role(owner/contributor/reviewer/observer). 그러나 assignment sequence·type(DIRECT/QUEUE/CLAIMED_FROM_QUEUE…)·strategy·candidate/resolution·claim/lease/lock 연결·delegation/authority resolution 참조가 전무 → **엔진이 아니라 수동 M:N 링크**.
- **claim/lease/lock 필드(30~33)**: 실 CAS claim 관용구는 job 처리용으로만 존재(`Catalog.php:1721-1731`·`Omnichannel.php:95-99`·`Omnichannel.php:405`·`Omnichannel.php:425-448`) — 승인 assignment 에 결합돼 있지 않고 fencing token 없음.
- **type enum 대응**: DELEGATED/SUBSTITUTE/ACTING/REASSIGNED/TRANSFERRED/FALLBACK/RECOVERED/EMERGENCY 전부 부재 · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 는 RBAC 부여상한이지 승인 위임 배정 아님(혼동 금지·KEEP_SEPARATE) · `agency_client_link`(`AgencyPortal.php:80`, `AgencyPortal.php:365-384`, `AgencyPortal.php:414-427`)는 크로스테넌트 접근권 승인이지 업무 배정 아님 · `action_request`(`Db.php:592`·소비자 `Alerting.php:582-598`·`Alerting.php:601-665`)는 생산자 부재 VACUOUS(BLOCKED_NO_PRODUCER).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: 승인을 특정 승인자에 배정하는 테이블 없음(EPIC 핵심 엔티티 순부재). 상위 work item(PARTIAL substrate)은 있으나 그것을 후보 풀에서 전략으로 특정 승인자에 배정하는 계층이 전무 · 축1 Chain(참여자 SoT)·축2 Authority(authority resolution)·축3 Org·delegation foundation 부재로 assignee subject/role/position·authority/delegation resolution 필드를 채울 근거 없음.
- cover: **0** (assignment 엔티티 통째 부재 · 수동 PM assignee 는 링크이지 배정 엔진 아님 · claim/lease 는 job 용)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**(EPIC 06-A-02 핵심). 단 하위 관용구는 재사용: claim/lease/lock = `omni_outbox` CANONICAL 패턴(`Omnichannel.php:425-448`)+catalog CAS(`Catalog.php:1721-1731`) 확장하되 **fencing token 필수 추가**(§44) · assignee role 모델 = `pm_task_assignees`(`PM/Assignees.php:17-72`) 확장.
- **Mandatory Control**: assignment 는 문자열/Email/Role Name assignee 금지(§58 하드코딩 Assignee)·assignee 는 subject/role assignment/position incumbency 로 canonical 바인딩 · 배정 시점 decision-time 재검증(authority/delegation active·SoD·capacity)·claim required 이면 lease 없이 결정 확정 금지(§43)·assignment sequence append-only(§48 History 삭제 금지).
- **무후퇴**: 배정 엔진 도입이 기존 catalog approveQueue·admin_growth 승인·PM assignee·agency 접근승인 동작을 회귀시키면 안 됨(§70).
- **선결**: 실 assignment 엔진은 선행 4축(chain·authority·org·SoD) 신설 후 별도 승인세션에서만. 본 문서는 부재 증명·설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
