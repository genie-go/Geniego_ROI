# DSAR — Manager Relationship Category (§12)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §12 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

**★원문 형태 주의(전사자 실측)** — §12 는 **`지원 Category` 15항목만**으로 구성된다. 다른 절과 달리 **백틱 엔터티명(`MANAGER_RELATIONSHIP_CATEGORY`)이 원문에 없고 · `필수 필드` 목록도 없고 · `evidence` 항목도 없다**(원문 `:715-733`). **없는 것을 형식 통일 명목으로 보충하지 마라**(규칙 1·4 양방향).

| 항목 | 실측 | 판정 |
|---|---|---|
| Category 축 | **관계 엔터티 자체가 부재** → 카테고리 컬럼 **0** | `ABSENT` |
| `relationship category` 필드(§11 #4) | 부재 | `ABSENT` |
| 인접 분류 컬럼 | `team.team_type VARCHAR(48)` — 🔴**무검증 대입**(`createTeam:461`) · ENUM/CHECK/`in_array` **0** | `NAME_ONLY` |
| 유일 실재 롤 분류 | `app_user.team_role ∈ {owner, manager, member}`(`UserAuth.php:168`) — **3값 롤 라벨**이지 관계 카테고리 아님 | `NAME_ONLY` |

**★규칙 10 적중** — 현행이 15종을 "1개 카테고리로 통합 운영"하는 것이 **아니다.** 카테고리를 담을 **컬럼이 없어서 0종**이다. **"분류 불필요"로 읽으면 갭이 정의상 소멸한다.**

**★규칙 11 주의** — `team_role` 3값을 근거로 *"열거에 `MATRIX` 가 없다"* 고 논증하지 마라. `team_role` 은 **다른 축(롤 라벨)의 열거**이며, 관계 카테고리 열거는 **애초에 존재하지 않는다**. **부재는 능력축(카테고리 컬럼 0 · 판독 술어 0)으로 논증하라.**

## 1. 원문 전사 + 판정 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EMPLOYMENT | 🔴**고용 축 부재** — `app_user` **ALTER 5개소 전량에 고용 컬럼 0** · **`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 **인증 게이트** `UserAuth.php:248`,`:805`,`:2455`) · `Leave`/`Termination`/`Work Location` **전역 0** · **`contractor` grep 0** | `ABSENT` |
| 2 | ADMINISTRATIVE | 부재 · 🔴트랩 **`admin_level`(master\|sub `UserAuth.php:171`) = 콘솔 특권**이지 행정 보고선 아님 | `ABSENT` |
| 3 | FUNCTIONAL | 부재 · `ORG_PRESET` 15팀 = **열거+시딩이며 계층 링크 0** · ★**시드 15팀 전부 manager NULL**(`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재) | `ABSENT` |
| 4 | MATRIX | 부재 · 🔴트랩 `matrix` = `Rollup::productChannelMatrix:378`(SKU×채널 순이익) · `Mmm::buildControlMatrix:476`(계절성 통제행렬) | `ABSENT` |
| 5 | PROJECT | `pm_projects.owner_user_id` 실재하나 **판독 술어 0**(`WHERE owner_user_id` grep 0) → 감독 효과 없음 · **카테고리 분류 아님** | `PARTIAL` |
| 6 | PROGRAM | 🔴**규칙 8 적중** — `Enterprise.php:13` 주석의 *"프로그램"* 은 **팬텀**(코드에 program 개념 0 · `\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | `ABSENT` |
| 7 | REGIONAL | 🔴트랩 `region` 3축 전부 무관(광고 인구통계 `Db.php:681`,`:690` / Amazon Ads na·eu·fe `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 8 | FINANCIAL | `cost_center`·`profit_center` **grep 0** · 🔴트랩 `budget_amount`(`…168_001:14-15`) = **프로젝트 예산액** · 🔴트랩 **`DATA_SCOPES 'company'` = 무제한 센티넬**(`effectiveScope():258`)이지 법인 아님 | `ABSENT` |
| 9 | BRAND | `catalog_brand`(`Catalog.php:151-169`) **명부는 REAL · 관리자 필드 없음**(규칙 9) | `ABSENT` |
| 10 | RESOURCE | 부재 · 🔴트랩 `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(`…168_005`) = **태스크 역할**이지 자원 관리 관계 아님 | `ABSENT` |
| 11 | TEMPORARY | 부재 — **유효기간 컬럼 0**(`valid_from`/`valid_to`/`effective_to` grep 0) · **§38 Business/System 이중 시간축 전례 0** | `ABSENT` |
| 12 | ACTING | **`acting` grep 0** · 🔴**`UserAdmin::impersonate:466-525` 를 계산하면 심각한 오판** — 주석 "대행" 6회에도 **권한 대행이 아니라 신원 위장 열람**(2시간 토큰 `:492`) · 🔴**`대행` 한글 대량 히트 전부 비즈니스 도메인**(배송/구매대행 · 광고**대행사** `TeamPermissions.php:718` · 결제**대행** PG) — **직무대리 0건** | `ABSENT` |
| 13 | EXECUTIVE | **`sponsor` grep 0** · 🔴트랩 `admin_level` ≠ Executive Level · **`grade` 45+건 전량 무관**(고객등급·리드등급·모델품질) · `ceo_name` = **프로필 평문 문자열**(`UserAuth.php:306-307`) | `ABSENT` |
| 14 | EXTERNAL | 부재 · 🔴트랩 `TeamPermissions.php:718` `'외부 대행사'` = **팀 프리셋 이름** · ⚠️`ORG_PRESET` `partner` scope 소비처 **0**(영원히 무제한 · 등급 미부여) · **외부 소스 42항목 전부 부재**(HRIS/ERP/Directory) | `ABSENT` |
| 15 | CUSTOM | 확장 슬롯 부재 — **카테고리 컬럼이 없으므로 CUSTOM 을 담을 곳도 없다** | `ABSENT` |

**실측 개수: 15 / 15 전사.** 측정기 §12 = **15** — **불일치 없음.** 커버리지 = 부재 14 · 부분 1(`PROJECT`) — **`VALIDATED_LEGACY` 0종.**
★원문이 **`CUSTOM` 으로 끝난다**(`:733`) — **`evidence` 로 끝나지 않으므로 추가하지 않았다**(규칙 4 반대 편향 방지).

## 2. 규칙

1. 🔴 **Category(§12)를 Type(§11)으로 대체 금지.** §11 필수 필드 #4 가 **`relationship category` 를 Type 의 속성으로 요구**한다 — 즉 **27 Type 각각이 15 Category 중 하나를 참조**하는 2단 구조다. 한 컬럼으로 합치면 §4.6 이 표현 불가가 된다.
2. 🔴 **`team_role`(3값)·`team_type`(무검증 `VARCHAR(48)`)에 Category 를 얹지 마라.** 전자는 롤 라벨 축이고 후자는 **이미 값 오염이 가능한 자유 문자열**이다.
3. 🔴 **Category 제약은 코드로 강제하라**(ENUM/CHECK/`in_array` 화이트리스트). 주석 열거는 **관례이지 제약이 아니다** — 5-3-3-2 ⓑ 에서 `group_type` 주석을 스키마 제약으로 오독한 사례(`ChannelRegistry.php:36`,`:38` = 자유 `VARCHAR`)가 확정됐다(규칙 11·8).
4. 🔴 **15종을 "있다고 가정"하고 배선 금지.** `VALIDATED_LEGACY` 가 **0종**이며, 유일한 `PARTIAL`(`PROJECT`)조차 **판독 술어 0 = 저장된 라벨**이다.
5. 🔴 **`EMPLOYMENT` 을 `is_active` 로 닫지 마라.** 2값(1/0)이라 **§41 지원 상태 8종 중 2종만 표현 가능**하며 **`UNKNOWN` 조차 표현 불가**(`NOT NULL DEFAULT 1` → **미지가 자동 "가용" = fail-open**). 사유·시각·이력 컬럼도 0 이고, `is_active=0` 이 **3경로 혼재**(`UserAuth.php:1380` 팀원삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글)라 **원인 구분이 불가능**하다.
   - ✅ **단 집행은 REAL**(무후퇴 대상): 로그인 차단(`:805`) · 재활성화 우회 방어(`:854-856`) · 비활성 시 **세션 즉시 폐기**(`:1381`·`EnterpriseAuth.php:400`,`:413`) · owner 잠금 방지(`:398`,`:411`). **`EMPLOYMENT` 신설이 이 집행을 약화시키면 후퇴다.**
   - ★**확장 지점**: SCIM `active` 인입 경로는 **REAL**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — §41 Termination/Suspended 의 **유일한 확장 지점**.
6. 🔴 **`locked_until` 을 `TEMPORARY`/`ACTING` 근거로 삼지 마라** — `login_attempt`(`UserAuth.php:3335`)·`agency_login_attempt`(`AgencyPortal.php:179`) = **무차별 대입 스로틀** · 키가 `ident`(**user_id 아님**) · 분 단위 자동 해제. **Suspension 개념은 전역 0**이며 `suspend` grep 은 **말장난 1건**(`WorkspaceState.php:12` "belt-and-suspenders").
7. **이름 함정 9종을 커버로 계산 금지**: `admin_level` · `grade` · `matrix` · `region` · `budget_amount` · `DATA_SCOPES 'company'` · `impersonate`/`대행` · `pm_task_assignees.role` · `'외부 대행사'` 프리셋.
