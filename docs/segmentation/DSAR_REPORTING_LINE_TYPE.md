# DSAR — Reporting Line Type (§7)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §7 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 대전제 — **타입을 담을 컬럼이 없다. 15종 중 0종이 표현 가능하다**

`team.manager_user_id INT NULL`(`TeamPermissions.php:148`/`:168`)이 매니저 관계의 **유일한 저장소**이며, **타입 컬럼이 없다**. 즉 15종 중 **어느 하나를 고를 수단도, 두 종을 병존시킬 수단도 없다**.

★**규칙 10 적중** — 현행에 "EMPLOYMENT 보고선만 있다"고 말하면 **거짓**이다. 현행에는 **타입이 없는 관계 1칸**이 있을 뿐이고, 그것조차 시드는 비어 있다(`seedOrg:739` INSERT 8컬럼에 `manager_user_id` 부재 → **`ORG_PRESET` 15팀 전부 manager NULL**).

### 타입 열거의 선례 — **본 레포에 ENUM 강제 선례는 2건뿐이며 둘 다 도메인 상이**

| 선례 | 실측 | 본 축 적용성 |
|---|---|---|
| `pm_task_assignees.role ENUM('owner','contributor','reviewer','observer')` | migration `20260526_168_005` | **태스크 역할이지 매니저 아님** |
| `pm_task_dependencies.dep_type ENUM('FS','SS','FF','SF')` | 일정 선후행 | 🔴**`Dependencies.php:90-91` 이 `dep_type` 을 순회 술어에 안 넣어 전 타입 무차별** — **형식만 ENUM, 소비는 무타입** |

🔴 **그 외 "타입" 컬럼은 전부 무검증 자유문자열이다**(규칙 11 — 열거가 실재할 때만 "열거에 없다"가 유효):
- `team.team_type VARCHAR(48)` — `createTeam:461` **무검증 대입**
- `ChannelRegistry.php:36`,`:38`/`:46`,`:47` `group_type` — **`VARCHAR(40)`/`VARCHAR(20)` · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** · 주석(`:12`·`:79`)은 **열거가 아니라 관례**이며 실값 `support` 가 **주석에 누락된 stale**
- `data_scope.scope_type VARCHAR(30) DEFAULT 'own'`(`TeamPermissions.php:163`)

→ **타입 축을 신설할 때 "관례 주석"으로 열거를 대신하지 마라**(규칙 8·11 재적중 — 5-3-3-2 ⓑ 의 `group_type` 오독이 바로 이 실수였다).

### `MATRIX` 축의 구조적 봉인

`app_user.team_id` **단일 컬럼 = 1인 1팀**(이력·유효기간 0) · `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`:164`) = **단일행이 스키마로 강제**.
→ Direct/Functional/Project 병존은 **정책으로 금지된 게 아니라 UNIQUE 와 단일 컬럼이 금지**한다.

## 1. 원문 전사 + 판정 — **원문 15종**

원문 §7 `Reporting Line Type:` (spec `:510-526`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EMPLOYMENT | 고용 축 부재 — 🔴**`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 **인증 게이트** `UserAuth.php:248`,`:805`,`:2455`·`routes.php:2776`) · `Leave Status`/`Termination Status`/`Work Location` **전역 0**(`on_leave`·`terminated`·`deleted_at`·`work_location` 0) · 🔴`locked_until` ≠ 고용 정지(무차별 대입 스로틀 `UserAuth.php:3335`) · 🔴`suspend` grep = **말장난 1건**("belt-and-suspenders" `WorkspaceState.php:12`) | `ABSENT` |
| 2 | ADMINISTRATIVE | 행정 보고선 부재. 🔴**함정**: `admin_level`(master\|sub `UserAuth.php:171`) = **콘솔 특권**이지 Executive Level 아님 | `ABSENT` |
| 3 | FUNCTIONAL | 기능 보고선 부재 — 병존 표현 불가(`manager_user_id` 단일 칸 · `team_id` 단일 컬럼) | `ABSENT` |
| 4 | POSITION | Position 개념 0. 🔴**함정**: `position_idx` = **PM 태스크 정렬순서** | `ABSENT` |
| 5 | PROJECT | 유일 인접 = `pm_projects.owner_user_id`(migration `20260526_168_001:13` · `KEY idx_pm_proj_owner :21` · 쓰기 `Projects.php:58`,`:66`,`:113`). 🔴**4결격**: ① **판독 술어 0**(`WHERE owner_user_id` grep 0) → **저장된 라벨** ② 무검증 자유문자열(`:112-117`) ③ 기본값이 생성자(`:66` `?? $g['user_id']`) → 미설정 행과 **구분 불가** ④ 단일값. §22 Project Manager **10요구 중 7 부재**(project organization·role·resource scope·legal entity·**sponsor**(grep 0)·approval routing eligibility·valid period) | `NAME_ONLY` |
| 6 | PROGRAM | 🔴**주석 팬텀** — `Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**. `\bprogram\b` **backend/src 유일 히트 = LiveCommerce WebRTC 스트림명**(`LiveCommerce.php:856-857`,`:887-891`). ★**규칙 8 재적중 — 주석을 근거로 삼지 마라** | `ABSENT` |
| 7 | REGIONAL | **탐지·라우팅·세그먼트이지 명부 아님**. `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0**. 🔴**최대 함정**: `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`)가 **`region`·`country` 와 같은 테이블에 공존** — **시설 담당자 자유텍스트 · FK 0 · 판독 술어 0** | `ABSENT`(인접 `wms_warehouses.manager` = `NAME_ONLY`) |
| 8 | COUNTRY | 국가 보고선 부재 — `Geo.php` alpha-2 는 **언어 결정용**. 🔴`ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅·시점 **전무** | `ABSENT` |
| 9 | BRAND | `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at` · `UNIQUE(tenant_id,name)`. **관리자 필드 없음**. 🔴**규칙 9 — 명부는 REAL · 매니저는 `ABSENT`** | `ABSENT` |
| 10 | COST_CENTER | `cost_center` **backend/src grep 0**(289차 실측) | `ABSENT` |
| 11 | PROFIT_CENTER | `profit_center` **backend/src grep 0**(289차 실측). 🔴**함정**: P&L 도메인(`Pnl.php`)은 **손익 집계**이지 조직 단위 아님 | `ABSENT` |
| 12 | SHARED_SERVICE | `shared_service` **backend/src grep 0**(289차 실측). ⚠️`ORG_PRESET` `'외부 대행사'`(`TeamPermissions.php:718`) = **팀 프리셋 문자열**이지 공유서비스 조직 아님 | `ABSENT` |
| 13 | MATRIX | `matrix_manager` **grep 0**. 🔴**구조적 봉인** — `manager_user_id` 단일 칸 · `app_user.team_id` **1인 1팀** · `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`:164`). ★**규칙 10**: 매트릭스가 0건인 것은 **금지해서가 아니라 표현 수단이 없어서** | `ABSENT` |
| 14 | APPROVAL_REFERENCE | 🔴**참조할 승인 도메인 쪽에 Resolver 가 없다** — `resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열**(`Mapping.php:248`,`:280`). 승인 4경로 전량 **"호출자가 곧 승인자"**. ★§76 실재 결함 3 = **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `ABSENT`(활성 결함 동반) |
| 15 | CUSTOM | 확장 슬롯 부재 — 타입 컬럼 자체가 없다 | `ABSENT` |

**측정기 분모: 40(§7 전체) / 원문 대조: 필수 필드 25 + Reporting Line Type 15 = 40 / 본 편 전사: 15.** 잔여 25는 [DSAR_REPORTING_LINE_DEFINITION.md](DSAR_REPORTING_LINE_DEFINITION.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 14 · `NAME_ONLY` 1.

## 2. 규칙

- 🔴 **15종을 `team_type VARCHAR(48)` 에 얹지 마라.** 그것은 **팀 분류**이지 보고선 타입이 아니며, `createTeam:461` 이 **무검증 대입**한다. 얹는 순간 팀 도메인과 보고선 도메인이 한 컬럼에서 영구 결합되고, 검증 없는 자유문자열이 타입 축의 정본이 된다.
- 🔴 **타입 열거를 주석으로 선언 금지.** `group_type`(`ChannelRegistry.php:12`·`:79`)이 정확히 그 실패 사례다 — 주석은 **관례일 뿐** 코드가 강제하지 않아 실값 `support` 가 **주석에 없는 채로** 존재한다. 열거는 **ENUM/CHECK 또는 `in_array` 화이트리스트로 강제**하라.
- 🔴 **`APPROVAL_REFERENCE`(#14)는 "참조"이지 상속이 아니다.** 현행에 **Approval Manager Resolver 가 없으므로**, 이 타입을 배선하면 **없던 자동 권한 상속이 신설**된다. §4.1(Manager ≠ Approver)과 §76-3(Manager 라는 이유만으로 Authority 자동 부여 = 실재 결함)을 **동시에 위반**하는 최단 경로다.
- 🔴 **`PROGRAM`(#6)을 `pm_portfolio` 로 커버 계산 절대 금지** — 주석 팬텀이다. `\bprogram\b` 의 유일 히트는 **LiveCommerce WebRTC 스트림명**이다.
- 🔴 **`MATRIX`(#13)를 "나중에 추가"로 미루지 마라.** 단일 칸(`manager_user_id`)·단일 컬럼(`team_id`)·`UNIQUE` 제약이 **스키마 차원에서 매트릭스를 봉인**하고 있다. 타입 축을 N:N 관계 테이블로 설계하지 않으면 **#3·#13 이 설계 시점에 이미 불가능**해진다.
- 🔴 **`pm_task_dependencies` 를 타입 소비의 참조 구현으로 삼지 마라** — `Dependencies.php:90-91` 이 `dep_type` 을 술어에 안 넣어 **ENUM 이 선언만 되고 소비는 무타입**이다. §11 Manager Type 27종별 정책이 필요하다면 **타입 술어가 순회·판정 양쪽에 들어가야** 한다.
- ★**`'manager'` 롤 리터럴 함정 재확인** — `team_role ∈ {owner,manager,member}` 의 **값**이며 `sso_group_role_map.role`·`sso_config.default_role` 이 담는 것도 이 문자열이다. **타입 15종 중 어느 것도 아니다.**
