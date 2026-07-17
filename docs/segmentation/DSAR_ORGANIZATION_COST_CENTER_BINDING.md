# DSAR — Organization Cost Center Binding (§37)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §37 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`cost_center` / `costCenter` | ★**PM 직접 재확인 — `backend/src` 전역 grep = 0건** | `ABSENT`(이름·능력 양쪽) |
| ★P&L 귀속축 (실측 전량) | **`tenant_id` · `channel` · `currency` · `period(from~to)` 뿐** — `Pnl.php:100`(`channel_orders WHERE $baseSql AND NOT $cancelExpr`) · `:147-150`(`kr_fee_rule` JOIN `LOWER(fr.channel_key)=LOWER(co.channel)`) · `:312`(`performance_metrics … GROUP BY COALESCE(UPPER(currency),'KRW')`) · `:489`(`performance_metrics WHERE tenant_id=? AND LOWER(channel) IN (…) AND SUBSTR(date,1,10)>=? …`) | **조직 귀속축 0** |
| ★손익 산식 | `Pnl.php:22-25` — `grossProfit = revenue - cogs` · `operatingProfit = grossProfit - adSpend - platformFee - couponDiscount - returnFee - shippingCost - influencerCost` · `netProfit = netPayout>0 ? … : operatingProfit` → ★**테넌트 단일 스칼라**(조직별 분해 불가) | `ABSENT` |
| `data_scope` 실 차원 | `warehouse`·`channel`·`product`·`brand`(`TeamPermissions.php:284` scopeSql · `:318-320` scopeChannelProduct) — ★**필터 차원이지 조직 귀속 아님** | `KEEP_SEPARATE_WITH_REASON` |
| `AutoCampaign.budget` | `AutoCampaign.php:174-175`(`$allocSum > $budget` → 422 *"채널 배정 합계가 배정예산을 초과"*) · `:1181`(`$a = round($budget * $weights[$ch] / $totalW …)`) → ★**캠페인 금액 상한 · 배분 대상 = 채널** | `KEEP_SEPARATE_WITH_REASON` |
| `merchant_promotion.budget` | `Promotion.php:56` — **프로모션 예산 금액** · 소유자 축 없음 | `KEEP_SEPARATE_WITH_REASON` |
| `po_*` | ★**Price Optimization**(`PriceOpt.php:38-146`) — **Purchase Order 아님** | 무관(이름 함정) |
| `organization_unit`/`legal_entity`/`position_unit`/`matrix_` | **PM 재확인 grep = 0건** | `ABSENT` |
| ERP/재무 커넥터 | 능력축 증명 — `ChannelRegistry` `group_type`(`:12`,`:79`)·`sync_kind` 열거에 **`erp`·`finance` 값 없음** · `backend/migrations/` 전량 grep 0 | `ABSENT` |

**★축 주의 1 — 차원(dimension) ≠ 조직 단위.**
`data_scope` 의 실 차원은 `warehouse`·`channel`·`product`·`brand`(`TeamPermissions.php:284`,`:318-320`)다. 이것은 **"이 사용자에게 어떤 행을 보여줄 것인가"** 의 **가시성 필터**이지 **"이 비용이 어느 조직에 귀속되는가"** 가 아니다. 게다가 **단일 차원**만 성립한다(`:277` `if ($sc['scope_type'] !== $dimension) return null;` · `:311` 주석 자인 *"★사용자는 단일 scope_type만 가지므로…"*). 🔴 **차원을 Cost Center 로 계산하면 역산.**

**★축 주의 2 — `AutoCampaign.budget` ≠ Cost Center budget owner.**
`budget` 은 **캠페인 금액 상한**이고 그 **배분 대상은 채널**이다(`AutoCampaign.php:174-175` 초과 시 422 · `:1181` 채널 가중 배분). §37 의 `budget owner reference` 는 **책임 주체(사람/조직)** 를 요구한다. **현행 `budget` 에는 주체가 없다** — 금액과 채널만 있다. 🔴 **이름(budget) 일치를 커버로 계산 = 규율 8/9 동시 위반.**

**★축 주의 3 — `po_*` 이름 함정.**
`po_*`(`PriceOpt.php:38-146`)는 **Price Optimization** 접두어다. **Purchase Order 가 아니다.** 조달·원가 귀속 코드는 전역 0.

## 1. 원문 전사 + 판정 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | cost center binding id | ★**`cost_center` 전역 0** — 바인딩할 대상 자체가 없음 | `ABSENT` |
| 2 | organization unit | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | cost center id | ★**전역 0** | `ABSENT` |
| 4 | binding type | **전역 0**(아래 6종 전부 부재) | `ABSENT` |
| 5 | primary 여부 | 부재 — primary/secondary 구분축 0 | `ABSENT` |
| 6 | budget owner reference | 🔴 `AutoCampaign.budget`(`:174-175`,`:1181`)·`merchant_promotion.budget`(`Promotion.php:56`) 는 **금액**이지 **소유 주체 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 7 | finance owner reference | 부재 — 재무 책임 주체 축 0 · ⚠️ `ORG_PRESET` 에 **"재무팀"** 이름 존재(`TeamPermissions.php:706-722`)나 **`parent_team_id` 없는 평면 열거** · 재무팀↔비용 링크 0 | `NAME_ONLY` |
| 8 | legal entity | **`legal_entity` 전역 0** · 🔴 테넌트 ≠ 법인 | `ABSENT` |
| 9 | currency | ★**실재** — `Pnl.php:312` `GROUP BY COALESCE(UPPER(currency),'KRW')` · `fxToKrw` 24통화 | `PARTIAL` |
| 10 | financial responsibility | 부재 — 재무 책임 모델 0 | `ABSENT` |
| 11 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 12 | valid_from | 부재 — 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 **as-of 조회 능력 없음**(`WHERE effective_from <= :as_of` 전역 0건) | `ABSENT` |
| 13 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 14 | status | 부재 | `ABSENT` |
| 15 | evidence | 부재 | `ABSENT` |

**실측 개수: 15 / 15 전사.** 커버리지 = `PARTIAL` 1(currency) · `KEEP_SEPARATE_WITH_REASON` 1 · `NAME_ONLY` 1 · `ABSENT` 12. **`VALIDATED_LEGACY` = 0 · 사실상 `ABSENT`.**

### Binding Type — **원문 6종**

| # | 원문 값 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PRIMARY_COST_CENTER | grep 0 | `ABSENT` |
| 2 | SHARED_COST_CENTER | grep 0 | `ABSENT` |
| 3 | CHARGED_TO | grep 0 — 비용 전가(charge-back) 모델 전무 | `ABSENT` |
| 4 | MANAGED_BY | grep 0 · ⚠️ 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`)이나 **팀↔비용 링크 0** | `ABSENT` |
| 5 | BUDGET_OWNED_BY | grep 0 · 🔴 `AutoCampaign.budget` 은 **채널 배분 금액**(`:1181`)이지 소유 관계 아님 | `ABSENT` |
| 6 | REPORTING_ONLY | grep 0 · ⚠️ 인접 = `Db::envLabel()` 의 *"표시(관측성) 전용"*(`Db.php:51-54`)이나 **완전 무관**(env 라벨) | `ABSENT` |

**실측 개수: 6 / 6 전사.** **전 6종 `ABSENT`.**

## 2. 규칙

- 🔴 **§37 은 `ABSENT` 다 — 이름·능력 양쪽 부재.** `cost_center` grep 0(PM 재확인)이며, **능력축으로도** P&L 이 조직에 귀속될 수 없다: 실 귀속축이 `tenant_id`·`channel`·`currency`·`period` **4개뿐**(`Pnl.php:100`,`:147-150`,`:312`,`:489`)이고 `grossProfit`/`operatingProfit`/`netProfit`(`:22-25`)은 **테넌트 단일 스칼라**로 산출된다. → **신설**.
- 🔴 **`data_scope` 를 Cost Center 로 전용하지 마라.** 그 차원은 `warehouse`·`channel`·`product`·`brand`(`TeamPermissions.php:284`,`:318-320`) = **가시성 필터**다. 게다가 **단일 차원 제약**(`:277`·`:311` 주석 자인)이 있어 조직×비용 다차원 귀속을 **구조적으로 표현할 수 없다**. 🔴 특히 **`DATA_SCOPES` 의 `'company'` 는 무제한 센티넬**(`:258` `if ($st === 'company') return null; // 전사 = 무제한`) — **경계를 긋는 게 아니라 지운다.** 이름만 보고 법인/전사 비용 스코프로 계산하면 **의미가 정반대**가 된다.
- 🔴 **`AutoCampaign.budget` 을 `budget owner reference` 로 배선 금지.** 금액 상한(`:174-175`)이고 배분 대상은 **채널**(`:1181`)이다. **책임 주체가 없다.** §37 은 주체를 요구한다.
- 🔴 **`po_*`(`PriceOpt.php:38-146`) 를 Purchase Order 로 읽지 마라** — Price Optimization 이다.
- 🔴 **`ORG_PRESET` 의 "재무팀"(`TeamPermissions.php:706-722`)을 finance owner 로 계산 금지** — `team` DDL 에 **`parent_team_id` 가 없어**(`:145-151`) **구조가 아니라 열거**이며, 재무팀↔비용 링크는 **0**이다.
- 🔴 **ERP/재무 커넥터를 "있다고 가정" 금지.** 능력축: `ChannelRegistry` `group_type`/`sync_kind` 열거에 **`erp`·`finance` 값 없음**(`:12`,`:79`,`:112`,`:116`,`:121`,`:125`). 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)의 ERP 12분류는 **이름만** — 🔴 **헌법 문서를 구현 근거로 인용 = 규율 10 위반**.
- **`currency` 만이 유일한 재사용 축**(`Pnl.php:312`) — Cost Center Binding 의 `currency` 는 **`Pnl` 의 통화 정규화(`COALESCE(UPPER(currency),'KRW')`)와 동일 규약**을 따라야 한다. 🔴 **레지스트리 currency 오강제**(288차 확정 결함)를 재현하지 마라.
- 🔴 **`Pnl` 산식(`:22-25`)을 조직 축으로 재작성 금지(무후퇴).** 주석 `:20-23` 이 명시: *"산식(클라 `GlobalDataContext.jsx` pnlStats 와 동일)"* — **프론트와 100% 동일**해야 한다. Cost Center 도입 시 **기존 테넌트 스칼라 산출을 보존**하고 **조직 분해는 별도 뷰로 얹어라**.
- **as-of 능력 부재 직시**: `valid_from`/`valid_to` 도입은 **폐구간 모델 전체가 신규**다. ⚠️ 관련 관찰 — `Pnl.php:449` 가 기간을 받고도 `:454` 는 **최신 `kr_fee_rule` 만 사용**(과거 기간 P&L 도 오늘자 VAT율)한다. 주석 `:451` 이 의도를 명시하므로 **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요).
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무. ★**`ensureTables` 는 테이블 생성만 하고 데이터 백필을 하지 않는다** → **기존 P&L 의 소급 조직 귀속(retroactive) 집행 수단이 현재 없다.**
- 🔴 12축 + Type 6종 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
