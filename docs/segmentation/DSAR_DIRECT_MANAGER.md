# DSAR — Direct Manager (§18)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §18(929-952줄) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Direct Manager 관계 | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id` **backend/src grep 0** | `ABSENT` |
| Manager Resolver | `resolveApprover`·`approval_chain`·`routeApproval` **grep 0** — 승인자 **후보를 계산하는 코드가 레포에 없다** | `ABSENT` |
| `app_user.parent_user_id` | 정의 `UserAuth.php:167`(ALTER) · **테넌트 소속 포인터** | `NOT_APPLICABLE`(축 상이) |
| `team.manager_user_id` | DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite) · **팀당 1칸 INT NULL** | `NOT_APPLICABLE`(축 상이) |
| `app_user.team_role='manager'` | `UserAuth.php:168` `VARCHAR(40)` · 값 `owner|manager|member` | `NAME_ONLY`(롤 라벨 · 관계 아님) |
| Effective Period | `effective_to`·`valid_to`·`valid_from` **grep 0** | `ABSENT` |
| Position 개념 | `position_idx` = **PM 태스크 정렬순서** · Position 엔터티 0 | `ABSENT` |

**★축 주의 ① — `parent_user_id` 를 Direct Manager 로 계산하면 역산이다.**
이름이 "부모"라서가 아니라 **능력**으로 판정한다(규율 규칙 7). `parent_user_id` **전 54개소를 전수 열거**한 결과 소비처는 4종뿐이다:
- **테넌트 해석**(`UserAuth.php:207-217` `resolveTenantId` — 하위계정이 상위 owner 의 `tenant_id` 를 상속 · **단일 홉** · 재귀 없음) · 동형 반복 `Rollup.php:56`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`·`AgencyPortal.php:478`
- **롤 정규화 폴백**(`UserAuth.php:296`,`:993`,`:1113`,`:3736` · `UserAdmin.php:522` · `TeamPermissions.php:129` — `parent_user_id` 비어 있으면 `owner`, 있으면 `member`)
- **owner 행 선별**(`UserAuth.php:41` · `AdAdapters.php:45` · `KakaoChannel.php:356` · `SmsMarketing.php:359` · `PlanLimits.php:37` — 플랜/에이전트모드 조회용 `ORDER BY`)
- **sub-admin 소유 검증**(`UserAuth.php:1483`,`:1607` — `admin_level='sub'` 의 마스터 확인)

🔴 **감독·승인·보고선 술어로 읽는 곳이 0개다.** 게다가 전 생성경로가 **owner 직속 2단으로 봉인**되어 있다(`UserAuth.php:1226-1227` — manager 가 계정을 만들어도 `parentId` 는 **자신이 아니라 자신의 owner**) · `EnterpriseAuth.php:500` · `UserAuth.php:1574/1581`. **3단 경로가 존재하지 않으므로 보고선 트리 자체를 담을 수 없다.**

**★축 주의 ② — 금지 5항목을 "준수"로 계산하면 갭이 정의상 소멸한다(규칙 10 최대 적중 지점).**
현행이 §18 금지 5개를 **위반하지 않는다.** 그러나 그것은 **금지를 구현해서가 아니라 Direct Manager 개념 자체가 없어서**다. 위반할 관계가 0개면 위반 건수도 0이다. 이를 `VALIDATED_LEGACY` 로 계산하면 **분모가 통째로 사라지고 §18 은 자동으로 "충족"이 된다** — 5-3-1 이 축을 날조한 것과 정반대 방향의 같은 오류다. **전 10항목 `ABSENT`.**

**★축 주의 ③ — `git` 이력상 삭제된 적도 없다.** `manager_id`·`reports_to`·`acting_manager`·`supervisor_id` **삭제 이력 0** → **팬텀도 유물도 아니다. 존재한 적이 없다.**

## 1. 원문 전사 + 판정 — **원문 10종**(기본 Resolution 순서 5 + 기본 불허 5)

### 1-1. 기본 Resolution 순서 (원문 번호목록 5)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Explicit Active Direct Manager Subject Binding | **부재** — Subject↔Manager 바인딩 테이블·컬럼 0. 🔴`parent_user_id` 는 **테넌트 소속 포인터**(54개소 전량 tenant/role/plan 술어 · 감독 판독 0) · `Active` 를 표현할 기간축도 0 | `ABSENT` |
| 2 | Position-to-position Supervisory Binding의 Active Incumbent | **부재** — Position 엔터티 0 · Incumbent 개념 0 · `position_idx` 는 **PM 태스크 정렬순서**(동명이축) | `ABSENT` |
| 3 | Primary Organization의 Administrative Manager | **부재** — §19 Administrative Manager 축 자체가 없다(→ [DSAR_ADMINISTRATIVE_MANAGER.md](DSAR_ADMINISTRATIVE_MANAGER.md)) · `app_user.team_id` **단일 컬럼 = 1인 1팀** → `Primary` 여부를 표현할 대상 자체가 없다(규칙 10) | `ABSENT` |
| 4 | Tenant-configured Fallback | **부재** — 해석 실패 시 대체 매니저를 지정하는 테넌트 설정 슬롯 0. `sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯뿐** | `ABSENT` |
| 5 | Missing Manager Policy | **부재** — 미해석 시 정책(차단/에스컬레이션/무시) 0. 🔴**현행 유사물은 fail-open** — `team_role` 미설정은 `owner` 로 정규화(`UserAuth.php:296` · `TeamPermissions.php:129`) → **미지가 자동으로 최고권한** | `ABSENT` |

### 1-2. 기본적으로 허용하지 않는 것 (원문 불릿 5)

🔴 **아래 5행의 `ABSENT` 는 "금지가 없다"는 뜻이다 — "금지를 지킨다"가 아니다.** 인접 코드는 **참고 선례**일 뿐 커버가 아니다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 6 | 동일 기간 여러 Primary Direct Manager | **부재** — `Primary` 플래그 0 · 기간축 0. ⚠️`team.manager_user_id` 가 **1개인 것은 금지의 결과가 아니라 여러 개를 담을 칸이 없어서**다(단일 `INT NULL` `TeamPermissions.php:148`) — 규칙 10 | `ABSENT` |
| 7 | 자기 자신을 Direct Manager로 지정 | **부재** — 🔴**인접 축조차 자기지정을 막지 않는다**: `createTeam:463-469` · `updateTeam:492-495` 모두 `$mgr === $c['id']` 검사 **없음** → 호출자가 자신을 팀관리자로 지정 가능. 자기승인 차단 선례는 **다른 도메인**(`Mapping.php:268-271` 승인 actor) | `ABSENT` |
| 8 | 종료된 Subject를 Direct Manager로 지정 | **부재** — 🔴**고용 종료 개념이 전역 0**(`terminated`·`deleted_at`·`on_leave` 0 · `is_active` 는 **계정 상태이지 고용 상태가 아니다** — base DDL `Db.php:1106` · 소비처 전부 인증 게이트). ⚠️`memberRow:759` SELECT 에 **`is_active` 술어 없음** → 비활성 계정도 팀관리자 지정 가능 | `ABSENT` |
| 9 | 다른 Tenant Subject를 일반 Direct Manager로 지정 | **부재**(Direct Manager 축). ⚠️**인접 선례는 REAL**: `createTeam:464` · `updateTeam:494` 가 `memberInTenant()` 로 **테넌트 소속 검증 → 422**. 🔴**단 이는 `team.manager_user_id` 의 게이트이지 Direct Manager 금지가 아니다** — 커버로 계산 금지 · **교차테넌트 가드의 이식 가능 선례로만 인용** | `ABSENT` |
| 10 | Effective Period가 겹치는 중복 Binding | **부재** — `effective_to`·`valid_from`·`valid_to` **grep 0** · Binding 테이블 0 → **겹칠 기간도 중복될 행도 없다**. 기간축 유일 선례 = `kr_fee_rule.effective_from`(`Db.php:898`)이나 **질의 0**(`WHERE effective_from <= :as_of` 전역 0) | `ABSENT` |

**실측 개수: 10 / 10 전사.**
- **측정기 분모 10**(불릿 5 + 번호목록 5) · **원문 대조 10** · **전사 10** — **일치.**
- ★**번호목록 5(Resolution 순서)를 놓치면 분모가 5로 과소 계상된다.** 원문 933-939줄이 `1.`~`5.` 번호목록이다.
- 커버리지 = **`ABSENT` 10 · 커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **`app_user.parent_user_id` 를 Direct Manager Binding 으로 재해석 금지.** 테넌트 격리 경계(`resolveTenantId`)가 이 컬럼에 걸려 있다 — 의미를 보고선으로 덧씌우면 **286차 `platform_growth` 하이재킹과 동형 사고**가 재발한다.
- 🔴 **`parent_user_id` 3단 허용 금지(선결 조건).** `resolveTenantId:200-217` 은 **단일 홉 + `LIMIT 1`** 가정 위에 서 있다. Direct Manager 체인을 이 컬럼으로 구현하면 **테넌트 해석이 조용히 깨진다.** Direct Manager 는 **별도 관계 엔터티**로 신설한다.
- 🔴 **금지 5항목(#6~#10)을 "현행 준수"로 보고 금지 로직을 생략 금지.** 관계 엔터티를 신설하는 순간 5개 위반이 **전부 즉시 가능해진다.** 금지는 **관계와 동시에** 구현되어야 한다.
- **Resolution 순서는 Tenant별 Versioned Policy** — 원문 941줄. 🔴**`version` 선례를 그대로 믿지 마라**: 엔터티 `version` 은 `menu_defaults.version` **1건**이며 **유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**. **정책 버전은 신규 설계**이며 이 선례를 복제하면 §18 순서 변경이 불가능해진다.
- **#5 Missing Manager Policy 는 fail-closed 로 설계한다.** 현행 롤 폴백은 **fail-open**(미설정→`owner`)이며, 이 패턴을 매니저 해석에 이식하면 **미해석 Subject 가 자동으로 승인권을 얻는다.**
- **#9 의 교차테넌트 가드는 `memberInTenant`(`TeamPermissions.php:464`,`:494` 422) 를 알고리즘 선례로 이식한다** — 신규 검증기 작성 금지(중복 금지). 단 **`is_active` 술어가 없다**는 결함(#8)은 물려받지 말 것.
- 🔴 **`team.manager_user_id` 스키마 복제 금지** — Type/Priority/Responsibility Scope 표현 불가(§4.6) · nullable · **effective date 0 · 이력 0**. 이 형태를 물려받으면 §19·§20·§21 이 **설계 시점에 이미 불가능**해진다.
- 🔴 **10종 "있다고 가정"하고 배선 금지.**
