# DSAR — Critical Gap 후보 (§68)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §68 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 오독 방지 — **"갭 0 = 양호"로 읽지 마라**

아래 표의 판정은 26종 중 **23종이 `ABSENT`/`NOT_APPLICABLE`** 로 나온다. 이것은 **양호의 증거가 아니라 판정 대상 개념 자체가 부재한다는 뜻**이다.

- `manager_id` **0** · `reports_to` **0** · `supervisor_id` **0** · `team_lead_id` **0** · `department_head_id` **0** · `acting` **0** · `vacan` **0** · `deputy`/`substitute`/`stand_in` **0** · `rebate` **전역 0**(스펙 표제 도메인 자체가 없다).
- git 이력에 `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` **삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다.**
- 🔴 **Manager Relationship 축을 신설하는 순간 26종이 즉시 활성화된다.** 현재의 `ABSENT` 는 "위험 없음"이 아니라 **"아직 위험을 만들지 않았음"**이다. 신설 설계는 26종 전부를 **탐지 대상으로 선반영**해야 한다(규칙 10 — 현행이 "0건"인 것은 여러 개를 표현할 수단이 없어서다).

### ★단 26종 중 **3건은 현행 사실이다**(`PARTIAL`)

| # | 원문 항목 | 현행 사실 | 증거 |
|---|---|---|---|
| 10 | **공석 Position이 Active Manager로 사용됨** | `promoteManager` 가 **승격만 하고 강등 경로가 0** → `team.manager_user_id=NULL` 로 바꿔도 전임자의 `app_user.team_role='manager'` **잔존** → 위임 권한 계속 보유 | `TeamPermissions.php:768-776`(`:774` UPDATE 는 `team_role='manager'` 만 · `:773` owner 강등 차단) · **`SET team_role` 쓰기 전역 2개소뿐**(`TeamPermissions.php:774` 승격 · `EnterpriseAuth.php:489` SCIM 그룹→롤 매핑) → **강등 술어 0 확정** · 잔존 권한 소비처 `TeamPermissions.php:136`·`:618` |
| 15 | **Manager Relationship Version 없음** | 사실 — 엔티티 `version` grep = `menu_defaults.version` 1건이며 그마저 리터럴 `'baseline'` 고정(라벨) · optimistic lock `version` **0** | 5-3-3-2 ⓑ §11 |
| 17 | **Historical Snapshot 없음** | 사실 — `effective_to`/`valid_from`/`valid_to` **grep 0** · `AgencyPortal.php:304`·`:381` 은 오히려 `revoked_at=NULL` 로 **이력을 물리 소거** | 5-3-3-2 ⓑ §11 |

추가로 **§76 실재 3건 중 하나**인 *"Manager라는 이유만으로 Approval Authority 자동 부여"* 는 §68 표제에는 없으나 **동일 근본원인**이다: `UserAuth.php:1064`(`in_array($role, ['owner','manager'])` → 팀원 관리 권한) · `TeamPermissions.php:136`(`isManagerAdmin`). **§68 #19(다른 Legal Entity Manager에게 Financial Authority 자동 부여)의 국내판 선례**로 취급하라.

## 1. 원문 전사 + 판정 — **원문 26종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Cross-Tenant Direct Manager | Manager 관계 축 0 → 교차 대상 없음. 단 `resolveTenantId:200-217` **단일 홉 가정** 존재 | `NOT_APPLICABLE` |
| 2 | Cross-Tenant Position Supervisor | Position·Supervisor 양축 0 | `NOT_APPLICABLE` |
| 3 | Self-reporting | 보고관계 0 → 자기참조 불가 | `NOT_APPLICABLE` |
| 4 | Circular Reporting | 보고관계 0. 순환탐지 자산은 **PM 도메인**(`Handlers/PM/Dependencies.php:79-100`)이며 manager 무관 | `NOT_APPLICABLE` |
| 5 | 동일 기간 여러 Primary Direct Manager | **기간 축 자체가 0**(effective period 0) · `team.manager_user_id` = 팀당 1칸 → **우연한 1개**(규칙 10) | `NOT_APPLICABLE` |
| 6 | 동일 기간 여러 Primary Position Supervisor | Position 축 0 | `NOT_APPLICABLE` |
| 7 | 종료된 Subject가 Active Manager | 고용 종료 개념 0(`terminated`·`deleted_at` 0) · `is_active` = **계정 상태이지 고용 상태 아님**(`Db.php:1106`) | `ABSENT` |
| 8 | Terminated Manager의 Active Approval Task | Task 축 0 · Termination 축 0 | `NOT_APPLICABLE` |
| 9 | Security Suspended Manager의 Active Task | **Suspension 개념 전역 0**(`suspend` grep = `WorkspaceState.php:12` "belt-and-suspenders" 말장난 1건) · `locked_until` = 무차별 대입 스로틀이지 정지 아님 | `ABSENT` |
| 10 | **공석 Position이 Active Manager로 사용됨** | 🔴 **현행 사실** — `promoteManager:768-776` 강등 경로 0 → 전임자 `team_role='manager'` 잔존 | **`PARTIAL`** |
| 11 | Acting Manager가 원래 Manager 없이 등록됨 | `acting` grep **0** — Acting 개념 부재 | `ABSENT` |
| 12 | 무기한 Temporary Manager | Temporary·종료일 양축 0 | `ABSENT` |
| 13 | Interim Manager가 Vacancy 없이 등록됨 | `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) · `vacan` 0 | `ABSENT` |
| 14 | Co-manager Policy 없음 | Co-manager 축 0 · `manager_user_id` **단일 컬럼**이라 복수 표현 수단 없음 | `NOT_APPLICABLE` |
| 15 | **Manager Relationship Version 없음** | 🔴 **현행 사실** — 엔티티 version 0 · `menu_defaults.version` 은 리터럴 `'baseline'` 라벨 | **`PARTIAL`** |
| 16 | Reporting Line Version 없음 | Reporting Line 축 자체가 0 → 버전 부재 이전에 **대상 부재** | `NOT_APPLICABLE` |
| 17 | **Historical Snapshot 없음** | 🔴 **현행 사실** — `effective_to`/`valid_from`/`valid_to` 0 · `AgencyPortal.php:304`,`:381` 이력 물리 소거 | **`PARTIAL`** |
| 18 | Approval Task에 사용된 Manager 근거 없음 | 승인 경로 4개 전량 **"호출자가 곧 승인자"** → Manager 근거를 **참조한 적이 없다** · `Actor Authorization Snapshot` 0 | `NOT_APPLICABLE` |
| 19 | 다른 Legal Entity Manager에게 Financial Authority 자동 부여 | **Legal Entity 축 0**(`ceo_name` = `app_user` 프로필 평문 문자열 `UserAuth.php:306-307`) · Financial Authority 축 0. ⚠️단 **롤만으로 권한 자동부여 패턴은 실재**(`UserAuth.php:1064`·`TeamPermissions.php:136`) — 법인 축이 없을 뿐 **동일 근본원인** | `NOT_APPLICABLE`(법인 축) |
| 20 | Source Priority 충돌 미해결 | **정렬할 대상이 0개** — manager 데이터를 싣는 소스 0(HRIS/ERP/Directory/SCIM manager 전부 `ABSENT`) | `NOT_APPLICABLE` |
| 21 | Manager Chain이 Root 전에 단절 | Chain 축 0. `parent_user_id` 순회는 **단일 홉**(`UserAuth.php:200-217` · `LIMIT 1` 1회 · 재귀 없음) → chain 아님 | `NOT_APPLICABLE` |
| 22 | Manager Chain Maximum Depth 초과 | Chain 0. ★`Dependencies.php:84` `$depth<10000` 은 **깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 pop 마다) → Maximum Depth 선례로 계산 금지 | `NOT_APPLICABLE` |
| 23 | Manager Change 후 Candidate Cache 미갱신 | **Candidate 계산 코드 자체가 없다**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) → 캐시 이전에 무대상 | `ABSENT` |
| 24 | HRIS와 Canonical Direct Manager 불일치 | 🔴 **이중 공허** — 좌변(HRIS) 0 · 우변(Canonical) 0 → **양변 부재 시 자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형) | `NOT_APPLICABLE` |
| 25 | Task Assignee와 Manager Snapshot 불일치 | `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` = **태스크 역할이지 매니저 아님** · Snapshot 0 | `NOT_APPLICABLE` |
| 26 | Current Relationship으로 과거 Approval Evidence 재작성 | Relationship·Evidence 양축 0. ⚠️단 **이력 덮어쓰기 성향은 실재**(`AgencyPortal.php:304`,`:381` `revoked_at=NULL` 소거) → **신설 시 재현 위험 High** | `NOT_APPLICABLE` |

**실측 개수: 26 / 26 전사.**
측정기 분모 **26** · 원문 대조 **26** · 전사 **26** — **3자 일치.**
판정 분포: `PARTIAL` **3**(#10·#15·#17) · `ABSENT` **5**(#7·#9·#11·#12·#13·#23 중 이름·능력 양쪽 확인분) · `NOT_APPLICABLE` **18**.

## 2. 규칙

- 🔴 **`NOT_APPLICABLE` 18종을 "갭 없음"으로 보고 금지.** 전부 **판정 대상 개념이 부재**해서 나온 값이다. Manager Relationship 축 신설 = **26종 동시 활성화** → 신설 설계서에 26종 탐지를 **동시 반영**하지 않으면 첫 커밋부터 Critical Gap 26종 보유 상태가 된다.
- 🔴 **#10·#15·#17 3건은 오늘 존재하는 결함이다.** 특히 **#10 은 보안 결함**: `team.manager_user_id` 를 NULL 로 만들어도 전임자가 `team_role='manager'` 를 유지하며 `isManagerAdmin`(`TeamPermissions.php:136`)·`putMemberPermissions`(`:618`) 위임 권한을 **계속 행사**한다. **"팀관리자 해임"이 UI 상 성공하나 권한은 남는다 = 가짜 녹색.**
  - 교정 방향 = **`promoteManager` 의 짝(demote)을 만드는 것**이지 새 Manager 테이블을 먼저 만드는 것이 아니다. 단 강등은 **owner 보호(`:773`)를 반드시 승계**하고, **다른 팀의 manager 를 겸직 중인 경우**를 고려해야 한다(`app_user.team_id` **단일 컬럼 = 1인 1팀** → 겸직 표현 불가 → **강등 안전**하나 이는 **우연한 안전**이다).
- 🔴 **#24 Reconciliation 은 "source 측만 만들면 된다"로 읽지 마라.** 좌·우변 양쪽이 없다. **Canonical 선언이 §66 에 선행**한다(5-3-3-1 D-14 동형).
- 🔴 **#19 를 "법인 축 없으니 무관"으로 닫지 마라.** 자동 권한부여 패턴(`UserAuth.php:1064`)은 실재하며, Legal Entity 축을 신설하는 순간 **그 패턴이 법인 경계를 넘는다**. #19 는 **법인 축 신설의 선결 조건**으로 관리하라.
- **#22 Maximum Depth 선례 계산 금지**: `Dependencies.php:84` 는 노드 예산이며, `ChannelSync.php:955-962` 는 **순환 검출기가 아니다**(`$visited` 없이 깊이만 자름 → 순환 시 탐지 없이 조용히 절단).
- 🔴 **본 문서는 코드변경 0.** 실 교정(#10 강등 경로 포함)은 **별도 승인세션**(Golden Rule + verify + 배포승인).
