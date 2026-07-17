# DSAR — Organization Vendor Profile (§35)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §35 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`wms_suppliers` DDL | `Wms.php:105-111` — `id·tenant_id·name·code·contact·phone·email·memo·active·created_at·updated_at` + `KEY idx_wms_sup_tenant (tenant_id)`. 주석 `:104` *"212차 #3: 매입처(공급자) registry — 발주 대상·파트너 계정 연결"* | `PARTIAL` |
| ★**parent 컬럼** | **없다** — `wms_suppliers` 는 **완전 평면**. `parent_id`/`parent_supplier_id` 부재 | `ABSENT`(계층축) |
| SSOT 선언 | `SupplyChain.php:243` 주석 *"[257차 통합] 공급업체 SSOT — sc_suppliers 를 wms_suppliers(거래처 마스터)에 wms_id 로 링크"* | 정본 확정 |
| `sc_suppliers.wms_id` 링크 | `SupplyChain.php:244` `ALTER TABLE sc_suppliers ADD COLUMN wms_id INTEGER`(멱등) · 역할 분담 `:86-90` — *"마스터=wms_suppliers … 분석오버레이=sc_suppliers(wms_id 링크). list=wms 마스터 기준 통합뷰 … CRUD=wms+sc 양측 동기"* | 실배선 |
| 강등 정책 | `SupplyChain.php:88-90` — *"★wms(Db::pdo) 접근 실패 시 기존 sc-only 동작으로 graceful 강등(회귀0). id 공간=wms supplier id"* | 무후퇴 장치 |
| `vendor_type` | **grep 0** — 유형 열거 전무 | `ABSENT` |
| `vendor_id`(쿠팡) | `Connectors.php:1263`·`ChannelSync.php:631` = **`channel_credential` KV 값**(`Db.php:976-982`) — **채널 자격증명이지 벤더 마스터 아님** | `KV_ONLY` |
| `organization_unit`/`legal_entity`/`cost_center`/`profit_center`/`position_unit`/`matrix_` | **PM 재확인 grep = 0건** | `ABSENT` |
| ERP/조달 커넥터 | ★**능력축 증명** — `ChannelRegistry.php:12`,`:79` `group_type` = sales/marketing/logistics/pg/messaging + 증설 analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`finance`·`procurement` 값이 열거에 없다**. `backend/migrations/` 전량 grep 0 | `ABSENT` |
| `po_*` | ★**Price Optimization**(`PriceOpt.php:38-146`) — **Purchase Order 아님** | 무관(이름 함정) |

**★축 주의 — `wms_suppliers` 는 실재하는 거래처 마스터이나 조직 프로필이 아니다.**
`wms_suppliers`(`Wms.php:105-111`)는 **§32~§40 중 유일하게 "마스터 행"이 실재**하는 자산이다(테넌트 격리 + CRUD + SSOT 선언 + 발주 경로 연결). 그러나 **평면**이다 — 계층·유형·법인관계·계약·국가/지역 스코프·승인·유효기간이 **전부 없다**. 따라서 `PARTIAL`(vendor id·이름·연락처 축만) 이며 **`VALIDATED_LEGACY` 가 아니다**(규율 9 — 능력 존재 ≠ 요구 충족).

> ⚠️ **기지 실측 정정**: ⓒ 지시 브리핑 및 ⓑ §18 은 `wms_suppliers` 를 *"tenant_id·name·contact·active"* 4컬럼으로 기술했으나 **DDL 실측은 11컬럼**(`Wms.php:105-111`) — `code`·`phone`·`email`·`memo`·`created_at`·`updated_at`·`KEY idx_wms_sup_tenant` 이 추가로 존재한다. **평면·parent 없음이라는 결론은 그대로 유효**하나 컬럼 목록은 위 실측이 정확하다. 규율 4에 따라 사실대로 기록한다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | vendor profile id | 부재 — `wms_suppliers.id`(`Wms.php:106`)는 **벤더 자체의 id**이지 프로필(관계 레코드) id 아님 | `NOT_APPLICABLE` |
| 2 | organization unit or external party reference | **`organization_unit` 전역 0** · 외부 party 인접 = `partner_account`(`PartnerPortal.php:52-59`)이나 **`wms_suppliers`↔`partner_account` 구조 링크는 `partner_name` 문자열 매칭**(`:97-100`) | `PARTIAL` |
| 3 | vendor id | ★**`wms_suppliers.id`/`name`/`code`**(`Wms.php:105-111`) — §35 중 **최강 실재 축** · `sc_suppliers.wms_id` 로 id 공간 통일(`SupplyChain.php:244`) | `PARTIAL` |
| 4 | vendor type | **grep 0** — 유형 열거 전무 | `ABSENT` |
| 5 | tenant relationship | `wms_suppliers.tenant_id`(`Wms.php:106`) **실재** · 단 ★테넌트 마스터 테이블 부재(`api_key.tenant_id` FK 없음 `Db.php:944`) → 관계가 아니라 **격리 키** | `PARTIAL` |
| 6 | legal entity relationship | **`legal_entity` 전역 0** · 🔴 테넌트 ≠ 법인 | `ABSENT` |
| 7 | contract references | **계약 엔티티 grep 0** | `ABSENT` |
| 8 | service categories | **grep 0** — 서비스 분류축 전무 · 🔴 `ChannelRegistry` `group_type`(`:12`,`:79`)은 **채널 플랫폼 분류**이지 벤더 서비스 분류 아님 | `ABSENT` |
| 9 | country scope | `Geo` = 국가→**언어**(`Geo.php:23-53`) · 벤더↔국가 링크 0 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | region scope | `region` 3축 전부 무관(광고 인구통계·Amazon 엔드포인트·WMS 시도 `Wms.php:129`·`regionOf()` `:284-286`) · parent region 0 | `NAME_ONLY` |
| 11 | vendor manager organization | 부재 — 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`)이나 **팀↔벤더 링크 0** | `ABSENT` |
| 12 | internal sponsor reference | 부재 — 내부 스폰서 축 0 | `ABSENT` |
| 13 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 14 | valid_from | 부재 — `wms_suppliers.created_at`(`Wms.php:110`)은 **행 생성시각**이지 유효 개시일 아님 | `ABSENT` |
| 15 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 16 | status | `wms_suppliers.active TINYINT(1) DEFAULT 1`(`Wms.php:109`) — **불리언 활성 플래그**이지 상태 전이 모델 아님 | `PARTIAL` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `PARTIAL` 5(vendor id·external party ref·tenant·status·organization unit ref) · `NAME_ONLY` 1 · `KEEP_SEPARATE_WITH_REASON` 1 · `NOT_APPLICABLE` 1 · `ABSENT` 9. **`VALIDATED_LEGACY` = 0.**

## 2. 규칙

- 🔴 **`wms_suppliers` 재구현·대체 절대 금지(규율 12).** `SupplyChain.php:243` 이 **"공급업체 SSOT"** 로 명시 선언했고 `sc_suppliers.wms_id`(`:244`)가 링크한다. 두 번째 벤더 마스터 신설 = **헌법 위반(중복 엔진)**. Vendor Profile 은 **`wms_suppliers.id` 를 `vendor id` 로 참조**하는 **프로필 레이어**로 얹어라.
- 🔴 **`id` 공간을 바꾸지 마라** — `SupplyChain.php:90` 이 *"id 공간=wms supplier id"* 로 확정했다. Vendor Profile 이 별도 id 체계를 도입하면 `sc_suppliers.wms_id` 링크가 깨진다.
- **graceful 강등 정책 보존**: `SupplyChain.php:88-90` 이 *"wms 접근 실패 시 sc-only 동작으로 강등(회귀0)"* 을 보장한다. Vendor Profile 조회를 **필수 경로에 끼워넣지 마라** — 프로필 부재 시에도 기존 발주/입고가 동작해야 한다(무후퇴).
- 🔴 **`vendor_id`(쿠팡 — `Connectors.php:1263`·`ChannelSync.php:631`)를 `vendor id` 로 배선 금지.** 그것은 **`channel_credential` KV 값**(`Db.php:976-982`) = 쿠팡 API 인증 항목이며 `wms_suppliers` 와 **무관한 축**이다. 이름 일치 함정.
- 🔴 **`po_*` 를 Purchase Order 로 읽지 마라** — **Price Optimization**(`PriceOpt.php:38-146`)이다. 조달(procurement) 코드는 **전역 0**.
- 🔴 **ERP/조달 커넥터를 "있다고 가정" 금지.** 능력축 증명: `ChannelRegistry` 의 `group_type`(`:12`,`:79`)·`sync_kind` 열거에 **`erp`·`finance`·`procurement` 값이 없다**. 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** → 🔴 **헌법 문서를 구현 근거로 인용 = 규율 10 위반**.
- **`status` 확장 시 `active` 를 보존하라** — `wms_suppliers.active`(`Wms.php:109`)는 기존 조회 술어가 사용 중이다. 상태 모델을 도입하더라도 `active` 를 **드롭하지 말고 파생**시켜라(무후퇴).
- **`valid_from`/`valid_to` 신설 시**: 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 **as-of 조회 능력이 없다**(`WHERE effective_from <= :as_of` **전역 0건** · 읽기는 전부 최신승 `Pnl.php:454`) · **`effective_to` 부재** → **폐구간 모델 전체가 신규**.
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + **MySQL/SQLite 두 방언 동시 작성**(`Wms.php:105` MySQL vs `:113~` SQLite 가 그 선례).
- 🔴 9축 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
