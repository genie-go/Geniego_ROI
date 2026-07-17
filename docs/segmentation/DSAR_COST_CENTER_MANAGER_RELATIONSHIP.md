# DSAR — Cost Center Manager Relationship (§27)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §27 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★`cost_center` = **전역 0**

`cost_center`·`costcenter`·`profit_center`·`profitcenter` — **`backend/src` · `frontend/src` 양쪽 grep 0.** 이름도 능력도 없다(규칙 6 — `ABSENT` 는 양쪽 확인 후에만).

### ★P&L 귀속축 = **4차원 · 조직 단위가 아니다**

| 축 | 증거 |
|---|---|
| `tenant_id` | `Pnl.php:100`(`channel_orders WHERE $baseSql`) · `:147`(`WHERE tenant_id=?`) · `:312` |
| `channel` | `Pnl.php:312`(`LOWER(channel) IN ($dph)`) · `:104-109`(`kr_fee_rule` JOIN `LOWER(fr.channel_key)=LOWER(co.channel)`) |
| `currency` | `Pnl.php:147-150`(`SELECT COALESCE(UPPER(currency),'KRW') cur, SUM(spend) ... GROUP BY COALESCE(UPPER(currency),'KRW')`) |
| `period` | `Pnl.php:147`·`:312`(`SUBSTR(date,1,10) >= ? AND <= ?`) · `:489` |

🔴 **차원(dimension) ≠ 조직 단위.** 이 4축은 **집계 분해축**이며 **책임자를 결부시키는 코드가 0**이다. `channel` 을 Cost Center 로 읽으면 **판매 채널이 원가 조직으로 둔갑**한다.

### ★`currency` 요구 대비 — `fxToKrw` = **`KV_ONLY`**

| 축 | 실측 | 증거 |
|---|---|---|
| 정의 | `public static function fxToKrw(float $amount, string $currency): float` | `Connectors.php:1749` |
| 의미(주석 자인) | *"광고계정 통화(USD 등)로 표기된 spend/revenue 를 KRW 로 환산해 저장"* · *"KRW/빈값/미상통화는 무변환(정직)"* | `:1745-1747`,`:1755` |
| 저장 | 🔴 **`app_setting` KV 단일행 덮어쓰기** — `INSERT INTO app_setting(skey,svalue,updated_at) VALUES('fx_rates_krw',?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)` | `:1804-1805` |
| 이력 | **0** — 덮어쓰면 **이전 환율이 물리적으로 소멸** | 동 |

🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다**: 세율(`kr_fee_rule.effective_from` `Db.php:898`)은 **컬럼 有·질의 無**(교정 = **질의 계층** · 과거 복원 가능)이나, 환율은 **컬럼도 이력도 無**(교정 = **저장 계층 신설** · **복원할 게 없다**).

### 🔴 ★오염원 — 커버 계산 금지

- **`AutoCampaign.budget` ≠ Budget Owner** — 배분 대상이 **채널**이다: `foreach ($channels as $ch) { $a = round($budget * $weights[$ch] / $totalW / 10000) * 10000; }`(`AutoCampaign.php:1180-1181`) · `max_share` 채널당 비중 캡(`:1182-1183`). **예산 배분 알고리즘이지 예산 소유자가 아니다.**
- **`po_*` = Price Optimization**(**Purchase Order 아님**) — `po_simulations`·`po_products`·`po_competitors`(`PriceOpt.php:105`,`:1003`,`:1027`,`:1039`) · `po_calendar`(`DemandForecast.php:339`) · `po_fulfillment`(`ChannelSync.php:3164`). §27 원가/발주 검색 시 **최우선 오염원**.
- **`pm_projects.budget_amount`**(migration `20260526_168_001:14-15`) = **프로젝트 예산액**이지 Cost Center 예산 범위 아님(§22 참조).
- **`DELEGATION_EXCEEDED`**(`TeamPermissions.php:645`) = **권한 부여 상한**(예산 한도 아님).
- **`admin_growth_lead.owner`**(`AdminGrowth.php:909`)·**`lead_id`**(`AdminGrowth.php:111` 외 13개소) = **자사 B2B 영업 리드**.
- **`DATA_SCOPES` `'company'`**(`TeamPermissions.php:717`) = 🔴 **무제한 센티넬**(`effectiveScope():258`) — **법인이 아니다.**

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | cost center id | 부재 — `cost_center`·`costcenter` **backend/src·frontend/src 전역 grep 0**(이름·능력 양쪽) | `ABSENT` |
| 2 | legal entity | 부재 — Legal Entity 축 전역 0 · `ceo_name` = `app_user` **프로필 평문**(`UserAuth.php:307`,`:499`) · **계정당 1개** · FK·감독관계 전무 | `ABSENT` |
| 3 | currency | 인접 실재 — `Pnl.php:147-150` **GROUP BY currency** · `pm_projects.budget_currency DEFAULT 'KRW'`(migration `:15`) · 🔴 **환산율 `fxToKrw`(`Connectors.php:1749`) = `app_setting` 단일행 덮어쓰기(`:1804-1805`) · 이력 0 · as-of 불가** | `KV_ONLY` |
| 4 | budget scope | 부재 — 🔴 `AutoCampaign.budget`(`:1180-1181`) = **채널 배분 알고리즘** · `pm_projects.budget_amount` = **프로젝트 예산액**. **어느 것도 매니저 결재 범위가 아니다** | `ABSENT` |
| 5 | expense scope | 부재 — 비용은 `performance_metrics.spend`(`Pnl.php:147`,`:312`) 로 **채널·기간 집계**될 뿐 · **범위 귀속 축 0** | `ABSENT` |
| 6 | manager subject or position | 부재 — Manager Relationship 축 **전역 0**(`manager_id`·`reports_to`·`supervisor_id` **0** · git 삭제 이력 **0**) · 🔴 **`position_idx` = PM 태스크 정렬순서**(Position 아님) · **`admin_level`(master\|sub `UserAuth.php:171`) = 콘솔 특권**(Executive Level 아님) | `ABSENT` |
| 7 | finance owner reference | 부재 — 🔴 **`ORG_PRESET` `'재무팀' => 'company'`**(`TeamPermissions.php:717`)는 **팀 프리셋 + 무제한 센티넬**이지 재무 오너 참조가 아니다 · `team.manager_user_id` 는 **시드 15팀 전부 NULL**(`seedOrg:739` INSERT 컬럼 8개에 부재) | `ABSENT` |
| 8 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **0**) · 🔴 **`required_approvals` 는 유일 생산자 `Mapping.php:210` 이 리터럴 `2` 하드코딩** — 요청자·금액·위험도 무엇에도 반응 안 함 | `ABSENT` |
| 9 | valid period | 부재 — `effective_from` 은 **`kr_fee_rule` 전용**(`Db.php:898`) · ⚠️ `Paddle.php:291` `'effective_from' => 'next_billing_period'` 는 **Paddle API 요청 리터럴**(스키마 컬럼 아님) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 9 / 9 전사.** (측정기 분모 9 · 원문 대조 9 · 전사 9 — **3자 일치**.)
커버리지 = **부재 8 · KV 1 · 커버 0.**

## 2. 규칙

- 🔴 **P&L 4차원(`tenant_id`·`channel`·`currency`·`period`)을 Cost Center 로 매핑 금지.** **차원 ≠ 조직 단위**다. 특히 `channel` 매핑은 **판매 채널을 원가 조직으로 둔갑**시키며, 채널 추가·폐지가 **조직 개편으로 전파**된다.
- 🔴 **`AutoCampaign.budget` → "budget scope 충족"으로 매핑 금지.** `:1181` 이 배분하는 대상은 **채널**이지 사람이 아니다. 매핑하면 **예산 배분 알고리즘이 결재 권한으로 오해**된다.
- ★**원문 금지 — *"Cost Center Manager와 Budget Owner를 동일시하지 않는다"*** : 🔴 **현행에서 이 금지는 위반할 수도 준수할 수도 없다 — 양쪽이 다 부재**하기 때문이다(Cost Center 0 · Budget Owner 0). **"현행이 동일시하지 않으므로 준수"라 적으면 규칙 10 위반**(우연한 일치를 준수로 계산 금지 — 동일시할 대상이 **0개**라서 0인 것이다). 신설 시 **Cost Center Manager 관계와 Budget Owner 를 별개 레코드로 분리**하고, Cost Center 소속을 **예산 권한으로 자동 승격시키지 마라**.
  - ⚠️ **현행에 자동 승격 선례가 있다**(§76 실재 3건 중 1): **"Manager 라는 이유만으로 Approval Authority 자동 부여"** — `UserAuth.php:1064` · `TeamPermissions.php:136`. **원가 축으로 복제하면 원문이 금지한 바로 그 결과.**
- 🔴 **`currency` 를 "있음"으로 닫지 마라 — 저장 계층이 없다.** `fxToKrw`(`:1749`)의 환산율은 `app_setting` **단일행 덮어쓰기**(`:1804-1805`)이므로 **과거 시점 환율을 복원할 수 없다**. Cost Center 의 통화 귀속을 **과거 소급 정정**(§40)하려면 **환율 이력 저장 계층 신설이 선결**이며, 이는 세율 축(`effective_from` 컬럼 有·질의 無)과 **교정 계층이 다르다**. **"시점 컬럼만 붙이면 된다"는 일반화 금지.**
- 🔴 **`po_*` 를 Purchase Order 로 읽지 마라** — 전량 **Price Optimization**(`PriceOpt.php:105`,`:1003`,`:1027`,`:1039`). 원가 검색 시 오염원 1위.
- **신규 스키마 경로**: `backend/migrations/` **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}`. 🔴 **`ensureTables` 는 데이터 변환·백필을 하지 않는다** → **§40 Retroactive Correction 집행 수단 없음**. **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
