# DSAR — Supervisory Hierarchy Type (§9)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §9 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

본 문서는 §9 의 **Hierarchy Type 13종** 축을 전사한다. §9 의 **필수 필드 23개**는 [DSAR_SUPERVISORY_HIERARCHY.md](DSAR_SUPERVISORY_HIERARCHY.md) 를 보라.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Hierarchy Type 축 | **`hierarchy` backend 전역 grep 0** — 타입은커녕 **계층 엔터티가 없다** | `ABSENT` |
| 타입 구분 수단 | 감독 계층에 **타입 컬럼이 존재하지 않는다** | `ABSENT` |
| 인접 "타입" 컬럼 | `team.team_type VARCHAR(48)` — 🔴**무검증 대입**(`createTeam:461` · ENUM/CHECK/`in_array` **0**) | `NAME_ONLY` |

**★규칙 10 적중** — 현행이 "감독 계층 타입을 1종만 쓴다"가 **아니다.** 계층 엔터티 자체가 없으므로 **13종 중 0종을 표현할 수 있다.** "타입 분화 불필요"로 읽으면 갭이 정의상 소멸한다.

**★규칙 11 주의** — `team_type` 을 근거로 *"열거에 `ENTERPRISE_SUPERVISORY` 가 없다"* 고 논증하지 마라. **`VARCHAR(48)` 자유 문자열이며 코드로 강제되는 열거가 존재하지 않는다**(5-3-3-2 ⓑ `group_type` 오독과 동형 — 주석은 열거가 아니라 관례다). **능력축으로만 논증하라.**

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ENTERPRISE_SUPERVISORY | 전사 감독 계층 부재 · `app_user.parent_user_id` = **테넌트 소속 포인터**(보고선 아님 · owner 직속 2단 봉인 `UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`) | `ABSENT` |
| 2 | LEGAL_ENTITY_SUPERVISORY | `legal_entity` **grep 0** · `ceo_name` = 프로필 평문 문자열(`UserAuth.php:306-307`) | `ABSENT` |
| 3 | BUSINESS_UNIT_SUPERVISORY | 🔴트랩 **`business_unit_id` = Trustpilot 자격증명**(`ChannelSync.php:2576`·`ChannelRegistry.php:126`) — 조직 단위 아님 | `ABSENT` |
| 4 | FUNCTIONAL_SUPERVISORY | 기능 보고선 개념 0 · `ORG_PRESET` 15팀(`TeamPermissions.php:718` 부근)은 **열거+시딩이며 계층 링크 0** | `ABSENT` |
| 5 | REGIONAL_SUPERVISORY | 🔴트랩 `region` 3축 전부 무관 — 광고 인구통계(`Db.php:681`,`:690`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 6 | COUNTRY_SUPERVISORY | 🔴트랩 `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용**(탐지이지 명부 아님) | `ABSENT` |
| 7 | PROJECT_SUPERVISORY | `pm_projects.owner_user_id` 실재하나 **판독 술어 0**(`WHERE owner_user_id` grep 0) → **감독 효과 없음** · **계층 아님**(프로젝트 트리 0) | `PARTIAL` |
| 8 | PROGRAM_SUPERVISORY | 🔴**규칙 8 적중** — `Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐). **주석을 근거로 삼지 마라** | `ABSENT` |
| 9 | BRAND_SUPERVISORY | `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at` · **관리자 필드 없음 · 계층 없음**. 🔴**명부는 REAL·감독은 ABSENT**(규칙 9) | `ABSENT` |
| 10 | COST_CENTER_SUPERVISORY | `cost_center` **grep 0** · `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 원가센터 아님 | `ABSENT` |
| 11 | PROFIT_CENTER_SUPERVISORY | `profit_center` **grep 0** · P&L 은 **집계**이지 조직 단위 아님 | `ABSENT` |
| 12 | MATRIX_SUPERVISORY | 🔴트랩 `matrix` 히트 전부 무관 — `Rollup::productChannelMatrix:378` · `Mmm::buildControlMatrix:476`. ★**매트릭스 보고선은 §11 `MATRIX_MANAGER`·`DOTTED_LINE_MANAGER` 와 짝이며 양쪽 다 부재** | `ABSENT` |
| 13 | CUSTOM | 확장 슬롯 부재 — 타입 컬럼이 없으므로 **CUSTOM 을 담을 곳도 없다** | `ABSENT` |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재 12 · 부분 1(`PROJECT_SUPERVISORY`).
★원문 Hierarchy Type 목록은 **`CUSTOM` 으로 끝난다**(`:626`) — **`evidence` 로 끝나지 않으므로 추가하지 않았다**(규칙 4 반대 편향 방지).

## 2. 규칙

1. 🔴 **`team_type`(`VARCHAR(48)` 무검증)에 Hierarchy Type 을 얹지 마라.** 값 오염이 이미 가능한 자유 문자열이며, 팀 축(`parent_team_id` 없음 = 트리 없음)은 감독 계층 축이 아니다.
2. 🔴 **13종을 "있다고 가정"하고 배선 금지.** 12종이 완전 부재이고 1종이 판독 술어 0 이다.
3. 🔴 **이름 함정을 타입 커버로 계산 금지**: `business_unit_id`(Trustpilot 자격증명) · `region`(광고/Amazon/WMS 3축) · `matrix`(SKU×채널·MMM) · `pm_portfolio` 주석의 "프로그램"(팬텀).
4. **`PROJECT_SUPERVISORY` 를 `pm_projects.owner_user_id` 로 닫지 마라.** 판독 술어가 0 이면 **저장된 라벨**이지 감독 관계가 아니며, 단일값이라 Direct/Functional/Project 병존을 표현할 수 없다(규칙 10).
5. **Hierarchy Type 은 §11 Manager Relationship Type 27종과 직교축이다.** 한쪽을 다른 쪽으로 대체하면 §4.6 이 표현 불가가 된다 — **두 축을 하나의 컬럼으로 합치지 마라.**
6. **타입 제약은 코드로 강제하라**(ENUM/CHECK/`in_array` 화이트리스트). 주석 열거는 **관례이지 제약이 아니며**, 5-3-3-2 ⓑ 에서 실값 `support` 가 주석에 누락된 stale 사례가 이미 확인됐다(규칙 11).
