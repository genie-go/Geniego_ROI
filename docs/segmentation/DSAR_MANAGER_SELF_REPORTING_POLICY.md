# DSAR — Manager Self-Reporting Policy (§56)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §56 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Manager Relationship 축 | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id`·`head_id` **backend/src grep 0** · git 삭제 이력 **0** | `ABSENT`(팬텀도 유물도 아님 — 존재한 적 없음) |
| Acting/대행 축 | `acting`·`vacan`·`deputy`·`substitute`·`stand_in` **grep 0** · `interim` 1건은 지오리프트 중간결과(`AttributionEngine.php:672`) | `ABSENT` |
| **자기승인 차단** | **`Mapping.php:268-271`** — `requested_by === $actor` → **403 `self-approval is not allowed (maker-checker)`** | **REAL — 단 Self-approval 축** |
| Co-manager 슬롯 | `team.manager_user_id`(`TeamPermissions.php:148`/`:168`) = **팀당 1칸** | `ABSENT`(규칙 10) |
| Position 축 | `position_idx` = **PM 태스크 정렬순서** · 직위 개념 0 | `ABSENT` |

### ★축 주의 ① — **Self-reporting ≠ Self-approval** (원문이 직접 못 박음)

원문 §56 말미: *"Self-reporting과 Self-approval은 다른 개념이므로 **별도 Error·Audit Event로 관리하라**."*

`Mapping::approve:268-271` 의 자기승인 차단은 **REAL 이며 289차 G-01 의 성과**다. 그러나 이것은 **승인 트랜잭션 축**(제안자==승인자)이지 **보고 관계 축**(부하==상사)이 아니다.
🔴 **이를 §56 커버로 계산하면 축 혼동이다.** 원문이 두 축을 분리하라고 명시한 이상, 하나로 다른 하나를 닫으면 **원문 지시 자체를 위반**한다. §56 7항목 중 자기승인이 닿는 것은 **6번 후반부 하나뿐**이며, 그 6번조차 전반부(`Manager Candidate`)가 부재다.

### ★축 주의 ② — 현행은 Self-reporting 을 "차단"하지 않는다 (규칙 10)

🔴 **"현행이 자기보고를 막고 있다"고 적으면 허구다.** 자기보고가 발생하지 않는 이유는 **보고 관계 자체가 없어서**다. 막는 코드가 아니라 **막을 대상이 없다.**
- `team.manager_user_id` 에 **Co-manager 중복이 없는 것도 정책이 아니라 컬럼이 1칸**이라서다(규칙 10 정면 적중).
- 🔴 `Dependencies.php:29-31` 의 self-loop 차단(`$pred === $succ` → 422 `self_dependency`)은 **REAL 이나 태스크 선후행 도메인**이다. §56 커버로 계산 금지 — **형태만 동형**(`X → X`)이며 Subject/Position 이 아니다. 다만 **"자기참조를 쓰기 전에 422 로 거부한다"는 집행 형태의 유일한 레포 선례**이므로 §56 설계 시 **알고리즘 축만** 참조 가능.

## 1. 원문 전사 + 판정 — **원문 7종**

원문 지시: *"다음을 차단하라."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | subordinate subject = manager subject | 보고 관계 축 부재 → 비교할 두 변이 없다. Subject 개념 = `app_user` 뿐(`UserAuth.php:156-168`)이며 상하 관계 미표현 | `ABSENT` |
| 2 | subordinate position = manager position | **Position 축 전역 0**(`position_idx` = PM 정렬순서 · 오염원) | `ABSENT` |
| 3 | Organization Manager가 자기 조직의 유일한 Subject로 자기 자신을 관리 | Organization 축 = **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend grep 0) · `team.manager_user_id` 는 존재하나 **"유일 Subject" 판정 술어 0**(`app_user.team_id` 단일 컬럼 = 1인 1팀 · 팀원수 대비 검사 없음) | `ABSENT` |
| 4 | Acting Manager가 자신을 대행 | **Acting 축 전역 0.** 🔴 `UserAdmin::impersonate:466-525` 를 대입 금지 — 주석이 "대행"을 6회 쓰나 **권한 대행이 아니라 신원 위장 열람**(기간부 Assignment·original manager 참조 전무) | `ABSENT` |
| 5 | Co-manager Group에 동일 Subject 중복 | 🔴 **규칙 10 적중** — `team.manager_user_id` **팀당 1칸**(`TeamPermissions.php:148`/`:168`)이라 중복이 **구조적으로 불가**. 준수가 아니라 **Co-manager Group 을 표현할 수단이 없음** | `ABSENT` |
| 6 | Manager Candidate와 Requester가 같고 Self-approval 금지 | **전반부 `ABSENT`** — 승인자 후보를 계산하는 코드가 레포에 없다(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0** · `approver` 2건은 에러 메시지 문자열 `Mapping.php:248`,`:280`). **후반부 REAL** — `Mapping.php:268-271` 자기승인 403. 후보 축 부재로 **"Manager Candidate == Requester" 판정 불가** | `PARTIAL` |
| 7 | Task Assignee와 Requested For가 같고 Policy 근거 없음 | Assignee 축은 인접 존재 — `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`). 🔴 그러나 **`Requested For`(대리 요청 주체) 전역 0** · **Policy 근거 축 0** → 비교 두 변 중 우변 부재 | `ABSENT` |

**실측 개수: 7 / 7 전사.** (측정기 분모 7 · 원문 대조 7 · 전사 7 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 1 · `ABSENT` 6.

## 2. 규칙

- 🔴 **`Mapping::approve:268-271` 을 §56 커버로 계산 금지.** 원문이 *"별도 Error·Audit Event"* 를 명시했다 → **Self-reporting 전용 에러코드·Audit Event 를 신설**하고, 자기승인 에러(`self-approval is not allowed`)와 **코드·이벤트를 분리**하라. 두 축을 한 에러로 합치면 원문 지시 위반이자, 감사 시 **원인 구분 불가**.
- 🔴 **"현행이 §56 을 우연히 만족한다"는 서술 금지**(규칙 10). 7항목 전부 **비교할 두 변 중 최소 한 변이 부재**해서 위반이 발생하지 않을 뿐이다. 보고 관계를 신설하는 순간 **7항목 전부가 즉시 활성 요구**가 된다.
- **집행 형태 선례 = `Dependencies.php:29-31`**(쓰기 **전** 422 거부). §56 은 **활성화 전 검증**(§61 11번과 짝)이므로 **런타임 탐지가 아니라 쓰기 전 차단**이어야 한다. 🔴 `JourneyBuilder:511-518` 형태(런타임 탐지)를 선례로 삼지 마라 — `:512` 주석이 *"작성자 JSON acyclicity 검증 없음"* 을 **자인**한다.
- **1·2번은 §61 "Subject 존재"·"Position 존재" 검증에 선행 의존**한다. Subject/Position Canonical 선언 없이 §56 을 배선하면 **양변 부재 → 자동 PASS = 가짜녹색**(288차 `ok=>true` 위장과 동형).
- **6번 전반부는 §62 Source Priority 와 무관하게 `Manager Candidate Resolver` 신설이 선결.** Resolver 부재 상태로 6번을 "구현했다"고 표시하면 **VACUOUS**.
- 🔴 **5번을 "이미 1칸이라 안전"으로 닫지 마라.** §4.6 Co-manager 를 표현하려면 `team.manager_user_id` **단일 컬럼 확장이 아니라 관계 테이블**이 필요하며, 그 순간 5번이 **실 요구로 전환**된다.
