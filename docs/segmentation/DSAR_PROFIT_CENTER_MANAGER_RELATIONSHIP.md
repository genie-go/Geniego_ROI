# DSAR — Profit Center Manager Relationship (§28)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §28 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★`profit_center` = **전역 0**

`profit_center`·`profitcenter`·`cost_center`·`costcenter` — **`backend/src` · `frontend/src` 양쪽 grep 0.** 이름도 능력도 없다(규칙 6).

### ★§28 은 **원문에 금지 문장이 없는 유일한 섹션**(§22~§27 대비)

| § | 말미 금지/요구 문장 |
|---|---|
| §22 | *"Project 종료 후 Manager Relationship을 Active로 유지하지 마라."* |
| §23 | *"Rebate Program Owner와 Employment Manager를 동일시하지 마라."* |
| §24 | *"Country 포함 여부를 Region 이름으로 추론하지 마라."* |
| §25 | *"Country Manager가 모든 Local Legal Entity의 법적 승인 권한을 가진다고 가정하지 마라."* |
| §26 | *"Brand 운영 책임과 법적·재무 승인 권한을 구분한다."* |
| §27 | *"Cost Center Manager와 Budget Owner를 동일시하지 않는다."* |
| **§28** | 🔴 **없음** — 항목 목록(`:1137-1146`) 직후 `---`(`:1148`)로 종결 |

★**§27 의 금지 문장을 §28 에 복사·유추해 적지 마라**(규칙 1 — 요구 날조 0). 원문이 §28 에 부여하지 않은 제약이다.

### ★P&L 귀속축 = **4차원 · 조직 단위가 아니다**

| 축 | 증거 |
|---|---|
| `tenant_id` | `Pnl.php:100`(`SELECT SUM(total_price) FROM channel_orders WHERE $baseSql AND NOT $cancelExpr`) · `:147` · `:312` |
| `channel` | `Pnl.php:312`(`LOWER(channel) IN ($dph)`) · `:104-109`(`kr_fee_rule` JOIN) |
| `currency` | `Pnl.php:147-150`(`GROUP BY COALESCE(UPPER(currency),'KRW')`) |
| `period` | `Pnl.php:147`·`:312`(`SUBSTR(date,1,10) >= ? AND <= ?`) · `:489` |

🔴 **차원(dimension) ≠ 조직 단위.** 매출(`orderRevenue` `:98-102`)·마진 계산은 실재하나 **집계 분해축**이며, **책임자를 결부시키는 코드가 0**이다.

### ★`currency` 요구 대비 — `fxToKrw` = **`KV_ONLY`**(§27 과 동일)

`Connectors.php:1749` 정의 · 🔴 **`app_setting` KV 단일행 덮어쓰기**(`:1804-1805` `ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)`) · **이력 0** · 과거 환율 **복원 불가**. 세율(`kr_fee_rule.effective_from` `Db.php:898` — 컬럼 有·질의 無)과 **교정 계층이 다르다**(질의 계층 vs **저장 계층 신설**).

### 🔴 ★오염원 — 커버 계산 금지

- **`AutoCampaign.budget` ≠ Budget/Profit Owner** — 배분 대상이 **채널**(`AutoCampaign.php:1180-1181`).
- **`po_*` = Price Optimization**(Purchase Order 아님) — `PriceOpt.php:105`,`:1003`,`:1027`,`:1039`.
- **`catalog_brand`**(`Catalog.php:151-169`) = 브랜드 **명부는 REAL · 관리자 필드 0**(§26) → `brand scope` 의 **참조 대상은 되나 scope 축은 없다**.
- **`region` 3축**(`Db.php:681` 광고 세그먼트 / `Connectors.php:2704-2710` Amazon 엔드포인트 / `Wms.php:129` WMS 시·도) 전부 **도메인 상이** · `APAC`/`EMEA`/`LATAM` **0**(§24).
- **`grade` 45+건 전량 무관**(고객등급·리드등급·모델품질) · **`business_unit_id` = Trustpilot 자격증명** · **`position_idx` = PM 태스크 정렬순서**.

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | profit center id | 부재 — `profit_center`·`profitcenter` **backend/src·frontend/src 전역 grep 0**(이름·능력 양쪽) | `ABSENT` |
| 2 | legal entity | 부재 — Legal Entity 축 전역 0 · `ceo_name` = `app_user` **프로필 평문**(`UserAuth.php:307`,`:499`) · **계정당 1개** · FK·감독관계 전무 | `ABSENT` |
| 3 | currency | 인접 실재 — `Pnl.php:147-150` **GROUP BY currency** · `pm_projects.budget_currency DEFAULT 'KRW'`(migration `20260526_168_001:15`) · 🔴 **환산율 `fxToKrw`(`Connectors.php:1749`) = `app_setting` 단일행 덮어쓰기(`:1804-1805`) · 이력 0 · as-of 불가** | `KV_ONLY` |
| 4 | revenue scope | 부재 — 매출 집계는 실재하나(`Pnl.php:98-102` `orderRevenue`) **`tenant_id`·`channel`·`period` 차원**일 뿐 · 🔴 **차원 ≠ 조직 단위** · 범위 귀속 축 0 | `ABSENT` |
| 5 | margin scope | 부재 — 마진 계산 실재(`Pnl.php` 수수료·배송비 `:104-109` · VAT `:454`)하나 **차원 집계** · 매니저 귀속 축 0 | `ABSENT` |
| 6 | region scope | 부재 — `region` 3축 전부 **도메인 상이**(`Db.php:681` / `Connectors.php:2704-2710` / `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0** · ⚠️ grep 오탐 = `SOAPAction`·`capacity` | `ABSENT` |
| 7 | brand scope | 부재 — `catalog_brand`(`Catalog.php:151-169`) **명부는 REAL**(11번가 브랜드코드 `:415`)이나 **scope·관리자 필드 0**(규칙 9 — 명부를 커버로 계산 금지) | `ABSENT` |
| 8 | manager subject or position | 부재 — Manager Relationship 축 **전역 0**(`manager_id`·`reports_to`·`supervisor_id` **0** · git 삭제 이력 **0** — **존재한 적이 없다**) · 🔴 **`position_idx` = PM 태스크 정렬순서** · **`admin_level`(master\|sub `UserAuth.php:171`) = 콘솔 특권** | `ABSENT` |
| 9 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| 10 | valid period | 부재 — `effective_from` 은 **`kr_fee_rule` 전용**(`Db.php:898`) · ⚠️ `Paddle.php:291` 은 **Paddle API 요청 리터럴**(스키마 아님) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 10 / 10 전사.** (측정기 분모 10 · 원문 대조 10 · 전사 10 — **3자 일치**.)
커버리지 = **부재 9 · KV 1 · 커버 0.**

## 2. 규칙

- 🔴 **P&L 4차원(`tenant_id`·`channel`·`currency`·`period`)을 Profit Center 로 매핑 금지.** **차원 ≠ 조직 단위**다. `Pnl.php` 는 **손익을 계산**할 뿐 **누가 그 손익에 책임지는지 모른다**. 매핑하면 채널 추가·폐지가 **조직 개편으로 전파**된다.
- 🔴 **`revenue scope`/`margin scope` 를 "P&L 이 있으니 충족"으로 닫지 마라**(규칙 9). 계산 능력과 **귀속 권한 범위**는 다른 축이다. 미달을 커버라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다.
- 🔴 **`brand scope` 를 `catalog_brand` 로 닫지 마라**(규칙 9 — **명부는 REAL · 매니저·scope 는 ABSENT**). `catalog_brand` 6컬럼은 **전부 식별·표기 축**이며, `brand scope` **1항에도 기여하지 않는다**(참조 대상이 될 뿐).
- ★**§28 은 원문에 금지 문장이 없다.** §27 의 *"Cost Center Manager와 Budget Owner를 동일시하지 않는다"* 를 §28 에 **복사·유추 금지**(규칙 1 — 요구 날조 0). 단 **§4.1(Manager ≠ Approver) 전역 원칙은 §28 에도 적용**되며, 이는 §28 자신의 9항(`approval routing eligibility`)이 **별도 항목으로 존재한다는 사실**로 뒷받침된다 — **매니저 지정과 승인 자격이 원문에서 이미 분리된 축**이다.
  - ⚠️ **현행에 자동 승격 선례가 있다**(§76 실재 3건 중 1): **"Manager 라는 이유만으로 Approval Authority 자동 부여"** — `UserAuth.php:1064` · `TeamPermissions.php:136`(`isManagerAdmin`). **Profit Center 축으로 복제하면 9항이 무의미해진다.**
- 🔴 **`currency` 를 "있음"으로 닫지 마라 — 저장 계층이 없다.** 과거 시점 손익을 **정확한 당시 환율로 복원할 수 없다**(`app_setting` 단일행 덮어쓰기 `:1804-1805`). Profit Center 손익의 **소급 정정**(§40)은 **환율 이력 저장 계층 신설이 선결**이다. **"시점 컬럼만 붙이면 된다"는 일반화가 이 축에서 깨진다.**
- **신규 스키마 경로**: `backend/migrations/` **172차 정지** → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`. 🔴 **데이터 변환·백필 없음** → **§40 Retroactive Correction 집행 수단 없음**. **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
