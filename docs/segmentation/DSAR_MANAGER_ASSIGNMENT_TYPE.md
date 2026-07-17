# DSAR — Manager Assignment Type (§33)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §33 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**축 주의** — 본 문서는 §33 의 **Assignment Type 14종**만 전사한다. 필수 필드 21 = [DSAR_MANAGER_ASSIGNMENT.md](DSAR_MANAGER_ASSIGNMENT.md). 측정기 분모 35 = 21 + 14.

| 항목 | 실측 | 판정 |
|---|---|---|
| `assignment type` 컬럼 | **부재** — Assignment 엔티티 자체가 없다 | `ABSENT` |
| 유형을 담을 수 있는 인접 컬럼 | `team.team_type VARCHAR(48)`(`TeamPermissions.php:148`) — **팀 유형**이며 **무검증 대입**(`createTeam:461`) · `TEAM_TYPES`(`:44-49`) 는 **카탈로그 안내**이지 강제 아님(주석 `:43` *"자유 입력도 허용"*) | `KEEP_SEPARATE_WITH_REASON` |
| `data_scope.scope_type` | ★**대조군** — `DATA_SCOPES`(`:41` 9값)가 **`in_array` 로 실제 강제**(`:342` 미일치 시 `'own'` 강등). **열거가 코드로 강제되는 유일 선례** | `PARTIAL`(§34) |

🔴 **규칙 11 — 열거 강제 여부를 먼저 확인하라.** `team_type`(무검증 VARCHAR)과 `scope_type`(`in_array` 강제)은 **표면이 같고 강제력이 정반대**다. Assignment Type 을 `team_type` 방식으로 얹으면 **14종 열거가 문서상 약속에 그친다**(5-3-3-2 ⓑ `group_type` 오독과 동형).

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PERMANENT | 유형 구분 수단 0 · `team.manager_user_id`(`:148`)는 **무기한 단일값**이나 이는 PERMANENT **선언이 아니라 대안 부재** | `ABSENT` |
| 2 | POSITION_BASED | Position 축 **전역 0** · `position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 3 | SUBJECT_BASED | Subject 축 부재 · 🔴 **DSAR "Data Subject" = 고객**(직원 아님) — 이름 함정 | `ABSENT` |
| 4 | ORGANIZATION_BASED | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 **18/18 `CONTRACT_ONLY`** · `ORG_PRESET`(`TeamPermissions.php:708-721`) = **열거+시딩 · 계층 링크 0** | `CONTRACT_ONLY` |
| 5 | ACTING | `acting` **전역 0** · 🔴 `UserAdmin::impersonate:466-525` 로 계산 **금지** — **권한 대행이 아니라 신원 위장 열람**(관리자 2시간 토큰 `:492` · 관리자 계정 대행 차단 `:487`) · 기간부 Assignment·original manager 참조·covered scope **전무** | `ABSENT` |
| 6 | TEMPORARY | **전역 0** · 유효기간 축 부재(§38 Business/System 이중 시간축 **전례 0**) | `ABSENT` |
| 7 | INTERIM | 🔴 `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) — 무관 · `vacan`·`deputy`·`substitute`·`stand_in` **전부 0** | `ABSENT` |
| 8 | PROJECT | `pm_projects.owner_user_id`(migration `20260526_168_001:13` · `KEY idx_pm_proj_owner :21` · 쓰기 `Projects.php:58`,`:66`,`:113`) — **PARTIAL**. 🔴**4결격**: ① **`WHERE owner_user_id` grep 0 = 판독 술어 0**(인가·승인라우팅 효과 없음 → **저장된 라벨**) ② **무검증 자유문자열**(`Projects.php:112-117` `validId()` 없음 · `app_user` FK 없음) ③ **기본값이 생성자**(`:66` `?? $g['user_id']`) → 미설정 행과 **구분 불가** ④ **단일값** | `PARTIAL` |
| 9 | PROGRAM | 🔴 **`pm_portfolio` "프로그램" = 주석 팬텀** — `Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐). **규칙 8** | `ABSENT` |
| 10 | REGIONAL | 🔴 `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`)를 Regional Manager 로 오독 **금지** — **`region`·`country` 와 같은 테이블에 공존**하나 **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** · `region` 3축 전부 무관(광고 인구통계 `Db.php:681` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0** | `NAME_ONLY` |
| 11 | FINANCIAL | 🔴 `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 매니저 권한 아님 · Cost/Profit Center 축 **0** | `ABSENT` |
| 12 | MATRIX | **단일값 강제**(`manager_user_id` 1칸 `:148`) → Direct/Functional 병존 표현 불가. 🔴**규칙 10** — "매트릭스 없음"은 정책이 아니라 **표현 수단 부재** | `ABSENT` |
| 13 | MANUAL_GOVERNED | 수동 거버넌스 큐 선례 실재 = `catalog_writeback_job` status=`pending_approval`(`approvalCreate:2275` → `approveQueue:2341` → 집행 `processWritebackQueue:2362` · 정책 게이트 `evaluatePolicy`→`requires_approval` `:2247`) — **승인 도메인 REAL이나 Manager 축 아님** | `LEGACY_ADAPTER` |
| 14 | CUSTOM | 확장 슬롯 0 · 🔴 `team_type` 식 **무검증 자유문자열을 CUSTOM 근거로 계산 금지**(규칙 11) | `ABSENT` |

**실측 개수: 14 / 14 전사.** 커버리지 = `ABSENT` 10 · `PARTIAL` 1 · `NAME_ONLY` 1 · `CONTRACT_ONLY` 1 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **14종 열거는 `in_array` 로 강제하라** — `data_scope.scope_type`(`DATA_SCOPES :41` + `:342`)이 **본 레포의 유일한 강제 열거 선례**다. `team_type`(`createTeam:461` 무검증) 방식을 따르면 **열거가 관례로 전락**한다.
- ★**단 `:342` 의 폴백을 그대로 베끼지 마라** — 미일치 값을 **조용히 `'own'` 으로 강등**한다. Assignment Type 에서 무음 강등은 **가짜 녹색**(알 수 없는 유형이 자동으로 유효 유형이 됨)이다. **422 fail-closed** 가 맞다(`createTeam:464` 선례).
- 🔴 **PROJECT 를 `pm_projects.owner_user_id` 로 구현 금지.** 4결격(판독 술어 0 · 무검증 · 기본값=생성자 · 단일값)을 물려받으면 **설계 시점에 이미 라벨**이다. 특히 ③ **기본값이 생성자**는 "미설정"과 "명시적 자기 배정"을 **영구히 구분 불가**하게 만든다.
- 🔴 **ACTING 을 `impersonate` 위에 세우지 마라** — 신원 위장 열람과 권한 대행은 **감사 의미가 정반대**다(전자는 "관리자가 본 것", 후자는 "대리인이 승인한 것").
- ★**MANUAL_GOVERNED 의 참조 구현은 `Mapping::approve` 이지 `Catalog::approveQueue` 가 아니다** — 후자는 🔴**행위자를 읽지도 않고**(`:2343` `requirePro` **구독 플랜** 게이트) maker-checker(actor·정족수·자기승인차단)를 **전혀 갖지 않는다**(규칙 9).
- 14종 **"있다고 가정"하고 배선 금지**.
