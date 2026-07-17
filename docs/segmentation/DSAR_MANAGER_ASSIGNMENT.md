# DSAR — Manager Assignment (§33)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §33 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**축 주의 — §33 은 두 축이다.** 필수 필드 21 + Assignment Type 14 = **측정기 분모 35**. 본 문서는 **필수 필드 21** 만 전사한다. Assignment Type 14 = [DSAR_MANAGER_ASSIGNMENT_TYPE.md](DSAR_MANAGER_ASSIGNMENT_TYPE.md).

| 항목 | 실측 | 판정 |
|---|---|---|
| Manager Relationship 축 | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id`·`head_id` **전역 grep 0** · `rebate` **전역 0** | `ABSENT` |
| git 삭제 이력 | `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` **삭제 이력 0** | **팬텀도 유물도 아니다 — 존재한 적이 없다** |
| `team.manager_user_id` | **팀당 1칸** DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite) · **`parent_team_id` 없음 → 팀 트리 자체가 없다** · 시드 `seedOrg:739` INSERT 8컬럼에 부재 → **ORG_PRESET 15팀 전부 manager NULL** · ★**쓰기경로는 REAL**(`createTeam:463-469` 소속검증 `:464` 422 → INSERT `:466` → `promoteManager:469`) | `PARTIAL`(팀 축 한정) |
| `app_user.parent_user_id` | **테넌트 소속 포인터**(보고선 아님) `UserAuth.php:156-167` · 전 생성경로 **owner 직속 2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`) · 순회 = **단일 홉**(`resolveTenantId:200-217`) | `KEEP_SEPARATE_WITH_REASON` |
| `team_role='manager'` | **롤 라벨**(관계 아님) `UserAuth.php:168` — 이 **문자열 하나에 승인 권한이 걸려 있다**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `NAME_ONLY` |

🔴 **규칙 10 적중** — 현행이 "매니저 1명"인 것은 정책이 아니라 **여러 명을 표현할 칸이 없어서**다. `primary`/`co-manager`/`matrix` 를 "미사용"으로 계산하면 역산이다.

## 1. 원문 전사 + 판정 — **원문 21종**(필수 필드 축)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_assignment_id | Assignment 엔티티 자체 부재 · 식별자 없음 | `ABSENT` |
| 2 | manager relationship id | `manager_id`/`reports_to`/`supervisor_id` **전역 0** · 삭제이력 0 | `ABSENT` |
| 3 | assignment type | 표현 수단 0 → [DSAR_MANAGER_ASSIGNMENT_TYPE.md](DSAR_MANAGER_ASSIGNMENT_TYPE.md) | `ABSENT` |
| 4 | subordinate reference | 🔴 `app_user.parent_user_id`(`UserAuth.php:156-167`)를 부하 참조로 계산 금지 — **테넌트 소속 포인터**이며 owner 직속 2단 봉인 · `app_user.team_id` = **1인 1팀 단일 컬럼**(`TeamPermissions.php:175`) | `ABSENT` |
| 5 | manager reference | `team.manager_user_id`(`:148`/`:168`) — **팀당 1칸** · 쓰기경로 REAL(`createTeam:463-469`) · **FK 0 · nullable** | `PARTIAL` |
| 6 | position reference | Position 축 **전역 0** · 🔴 `position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 7 | organization reference | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 **18/18 `CONTRACT_ONLY`**(5-3-3-1 산출 문서 · 실 코드·테이블·노드 0) | `CONTRACT_ONLY` |
| 8 | relationship type | Direct/Functional/Dotted-line 구분 수단 0 · `team_role ∈ {owner,manager,member}`(`UserAuth.php:168`) = **롤이지 관계 유형 아님** | `ABSENT` |
| 9 | responsibility scope | `data_scope`(`TeamPermissions.php:160-165`) — **실 소비 차원 4개**(`warehouse` `Wms.php:1291` · `channel`/`product`/`brand` `OrderHub.php:261`) · 🔴**`UNIQUE(tenant_id,subject_type,subject_id)` `:164` = 단일행 스키마 강제** → §34 참조 | `PARTIAL` |
| 10 | approval routing scope | 🔴 **승인자 후보 계산 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **grep 0** · `approver` 2건 = **에러 메시지 문자열**(`Mapping.php:248`,`:280`) | `ABSENT` |
| 11 | manager chain priority | 🔴 대응물 = **`required_approvals` 리터럴 `2`**(`Mapping.php:210`) — **우선순위가 아니라 정족수 상수** → §35 참조 | `ABSENT` |
| 12 | source priority | ★**정렬할 대상이 0개** — manager 데이터를 싣는 소스 **0개**(HRIS/ERP/Directory `ABSENT` · SCIM `manager` 전역 0 · `sso_config` = `email_attr`·`name_attr` 2슬롯뿐 `EnterpriseAuth.php:45-54`) · `VACUOUS` 이전에 **무대상** | `ABSENT` |
| 13 | primary 여부 | 🔴**규칙 10** — `manager_user_id` **1칸**이라 primary/secondary 구분 자체가 성립 불가 | `ABSENT` |
| 14 | acting 여부 | `acting` **전역 0** · 🔴 `UserAdmin::impersonate:466-525` 를 Acting 으로 계산 **금지**(주석이 "대행" 6회이나 **권한 대행이 아니라 신원 위장 열람** — 기간부 Assignment·original manager 참조·covered scope **전무**) · `대행` 한글 히트 전량 **비즈니스 도메인**(배송/구매/광고대행사/PG) | `ABSENT` |
| 15 | temporary 여부 | **전역 0** · 유효기간 축 부재(§38) | `ABSENT` |
| 16 | interim 여부 | 🔴 `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) — 무관 | `ABSENT` |
| 17 | co-manager group | **팀당 1칸**(`:148`) → 복수 매니저 표현 불가 · 🔴 `group_type`(`ChannelRegistry.php:36`,`:46`)은 **채널 그룹**이며 **자유 VARCHAR**(무관) | `ABSENT` |
| 18 | valid_from | `valid_from` **grep 0** · `team`/`app_user` 에 effective date **0** · 유일 유사 선례 `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0) | `ABSENT` |
| 19 | valid_to | `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 20 | status | 🔴 `team.status`(`:148`) = **팀 상태**이지 Assignment 상태 아님 · Assignment 엔티티 부재로 상태를 걸 대상 없음 | `ABSENT` |
| 21 | evidence | Assignment evidence **0** · 이식 가능 선례: `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219`) · `pm_audit_log`(migration `20260526_168_008:7` `tenant_id NOT NULL`+`diff_json :13`+3인덱스) | `LEGACY_ADAPTER` |

**실측 개수: 21 / 21 전사.** (측정기 분모 35 = 필수 필드 21 + Assignment Type 14 — **불일치 아님 · 축 분할**)
커버리지 = `ABSENT` 18 · `PARTIAL` 1 · `CONTRACT_ONLY` 1 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **`app_user.parent_user_id` 를 보고선으로 확장 금지.** 3단 허용 시 `resolveTenantId:200-217` **단일 홉 가정이 붕괴** → **286차 Growth Center tenant 하이재킹과 동형 사고**. 일반화가 **선결**이며 본 블록 범위 밖이다.
- 🔴 **`team.manager_user_id` 를 Assignment 로 승격 금지.** Type/Priority/Responsibility Scope 표현 불가 · effective date 0 · 이력 0. **1:1 컬럼을 N:N Assignment 로 바꾸는 것은 스키마 변경이지 확장이 아니다.**
- ★**`promoteManager:768-776` 의 비대칭을 상속하지 마라** — 승격은 `app_user.team_role='manager'`+`team_id` 를 UPDATE(`:774`)하나 **강등 경로가 0개**다. `manager_user_id=NULL` 로 바꿔도 **전임자의 `team_role='manager'` 가 잔존**해 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`)을 계속 보유한다(§76 실재 항목 2).
- ★**`createTeam:492-501` 매니저 교체 = 전임자 강등 없음**(§76 실재 항목 1). Assignment 신설 시 **전임 Assignment 의 `valid_to` 마감이 동일 트랜잭션**이어야 한다.
- 🔴 **`evidence` 를 `menu_audit_log` **스키마 복제**로 구현 금지** — 해당 테이블에 **`tenant_id` 가 없고** `lastHash()` 에도 tenant 술어가 없다. **알고리즘만 이식**하고 `WHERE tenant_id=?` 필수.
- 🔴 **신규 스키마는 마이그레이션 파일 경로가 없다** — `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`). `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 이며 **MySQL/SQLite 두 방언 수기 중복 작성 의무**.
- 21종 **"있다고 가정"하고 배선 금지**.
