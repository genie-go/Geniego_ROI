# DSAR — Approval Assignment Candidate (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`CANDIDATE`(§15) — 하나의 Work Item 을 배정받을 **자격 후보 1건**의 도출·검증 결과 스냅샷.

### 필수 필드 (원문)

1. candidate_id
2. work_item_id
3. candidate type
4. subject id
5. role assignment id
6. position incumbency id
7. group id
8. queue id
9. original participant subject id
10. delegator subject id
11. delegation version id
12. authority definition / version / resolution id
13. legal entity / organization / geography / resource / action / amount / currency / availability / capacity / workload / skill / affinity match
14. SoD result
15. CoI result
16. security result
17. eligibility result
18. candidate score
19. priority
20. exclusion reasons
21. proposed 여부
22. status
23. evidence

(candidate type enum = 별도 명세 [[DSAR_APPROVAL_ASSIGNMENT_CANDIDATE_TYPE]] · source = [[DSAR_APPROVAL_ASSIGNMENT_CANDIDATE_SOURCE]] · exclusion reasons = [[DSAR_APPROVAL_ASSIGNMENT_CANDIDATE_EXCLUSION_REASON]].)

## 2. 기존 구현 대조

"이 Work Item 을 배정받을 자격자 집합"을 계산하는 후보 도출(Candidate) 파이프라인이 **통째로 부재**하다(개념별 판정: Candidate=ABSENT). 실존 승인 경로(`catalog_writeback_job`·`admin_growth_approval`·`mapping_change_request`)는 후보 도출 없이 **진입 게이트 통과자를 그대로 승인자로 사용**한다.

| 필드군 | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| candidate 파이프라인 자체 | 부재 — 자격 후보 집합 계산 코드 0 | ABSENT |
| subject id (인접 신원) | `pm_task_assignees`(`PM/Assignees.php:14,32,17-72`) 배정 대상 subject 존재하나 후보 도출 산물 아님 · owner 신원 = `UserAuth.php:156-157,1225-1227`(parent_user_id=owner) | LEGACY_ADAPTER |
| authority/delegation 필드군 | 선행 축2 Authority·위임 정본 ABSENT | BLOCKED_PREREQUISITE |
| legal entity/organization/geography match | 선행 축3 Identity/Org ABSENT(org_unit/reporting_line/legal_entity 0) | BLOCKED_PREREQUISITE |
| SoD result / CoI result | 선행 축4 Security/Authz 의 SoD hook·CoI foundation **부재** | BLOCKED_PREREQUISITE |
| capacity/workload match | 인접 = `PM/Enterprise.php:371-400` capacity/workload(읽기전용·미환류) | PARTIAL(읽기전용) |
| eligibility result | 실존 = RBAC 게이트만(Queue Eligibility=PARTIAL(RBAC만)) — 후보 자격 판정 아님 | PARTIAL |
| exclusion reasons | 도출 로직 0 · 별도 명세 [[DSAR_APPROVAL_ASSIGNMENT_CANDIDATE_EXCLUSION_REASON]] | ABSENT |
| evidence | 정본 = `SecurityAudit.php:56-68` verify() | LEGACY_ADAPTER |

## 3. 판정

- Verdict: **ABSENT** — Candidate 엔티티·후보 도출 파이프라인 통째 부재. 어떤 필드도 VALIDATED_LEGACY 아님.
- 선행 의존: authority/delegation·legal entity/org·SoD/CoI match 필드군은 **선행 4축(Approval Chain·Authority·Org/SoD) 부재**에 막힌 `BLOCKED_PREREQUISITE`. capacity/workload/eligibility 는 `PARTIAL`(읽기전용·RBAC만).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Candidate 파이프라인은 순신설이나 **인접 선례를 재구현하지 마라** — subject=`pm_task_assignees`/`UserAuth`(parent_user_id) 판독 확장(의미 변경 시 tenant 해석 전역 붕괴 위험 → 재사용 금지), capacity/workload=`PM/Enterprise.php:371-400` 읽기 지표를 **환류 가능하도록** 확장, evidence=`SecurityAudit::verify()` 확장.
- **subject id 를 owner/team_role 로 직접 채우지 마라** — 선행 축3(Identity/Org)에서 `parent_user_id=owner` 붕괴(`UserAuth.php:156-157,1225-1227`)와 team_role flat 3값의 한계가 확인됐다. 후보 자격축은 Authority 판독축 신설을 선결한다.
- **authority/delegation/legal entity/SoD 필드를 상수·NULL 로 봉인 금지** — 선행 4축 신설 전 후보를 먼저 세우면 §58 Critical Gap("Authority/Delegation 미검증"·"SoD/CoI 우회")을 구조적으로 재현한다.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
