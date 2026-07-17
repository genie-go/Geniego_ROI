# DSAR — Organization Profit Center Binding (§38)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §38 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`profit_center` / `profitCenter` | ★**PM 직접 재확인 — `backend/src` 전역 grep = 0건** | `ABSENT`(이름·능력 양쪽) |
| ★손익 산출 단위 | `Pnl.php:22-25` — `grossProfit`/`operatingProfit`/`netProfit` = ★**테넌트 단일 스칼라**. 주석 `:20-23` *"산식(클라 `GlobalDataContext.jsx` pnlStats 와 동일)"* | **조직 분해 불가** |
| ★P&L 귀속축 (실측 전량) | **`tenant_id` · `channel` · `currency` · `period` 뿐** — `Pnl.php:100` · `:147-150` · `:312` · `:489` | **조직 귀속축 0** |
| `data_scope` 실 차원 | `warehouse`·`channel`·`product`·`brand`(`TeamPermissions.php:284`,`:318-320`) — **가시성 필터**(단일 차원 `:277`·`:311`) | `KEEP_SEPARATE_WITH_REASON` |
| `catalog_brand`(brand scope 후보) | `Catalog.php:151-169` — `tenant_id·name·code` · **11번가 필수 브랜드코드**(`:415`) | `PARTIAL` |
| `region`(regional scope 후보) | 3축 병존 — 광고 인구통계(`Db.php:681`,`690`) / Amazon Ads 엔드포인트 na·eu·fe(`Connectors.php:2704-2710`) / WMS 창고 시·도(`Wms.php:129`·`regionOf()` `:284-286`). **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 · parent region 0** | `NAME_ONLY` |
| `currency` | ★**실재** — `Pnl.php:312` `GROUP BY COALESCE(UPPER(currency),'KRW')` | `PARTIAL` |
| `organization_unit`/`legal_entity`/`cost_center`/`position_unit`/`matrix_` | **PM 재확인 grep = 0건** | `ABSENT` |
| ERP/재무 커넥터 | 능력축 증명 — `ChannelRegistry` `group_type`(`:12`,`:79`)·`sync_kind` 열거에 **`erp`·`finance` 값 없음** | `ABSENT` |

**★축 주의 — `channel` 은 Profit Center 가 아니다.**
현행에서 손익을 **분해할 수 있는 유일한 축은 `channel`**(`Pnl.php:147-150`·`:489`)이다. 이것이 §38 의 가장 강한 유혹이다 — "채널별 손익 = 채널이 Profit Center". 🔴 **그러나 채널은 판매 플랫폼 종류이지 조직 단위가 아니다.** 결정적 증거: `channel_registry` 는 **tenant 컬럼조차 없는 플랫폼 전역 카탈로그**(`ChannelRegistry.php:32-49` · 주석 `:11` *"플랫폼 전역 카탈로그(테넌트 무관)"*)다. **소유자·책임자·승인선·유효기간 어느 것도 붙일 수 없다.** 채널을 Profit Center 로 계산하면 **갭이 정의상 소멸하는 역산**이다.

## 1. 원문 전사 + 판정 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | profit center binding id | ★**`profit_center` 전역 0** — 바인딩할 대상 자체가 없음 | `ABSENT` |
| 2 | organization unit | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | profit center id | ★**전역 0** · 🔴 `channel` 로 대체 금지(위 ★축 주의) | `ABSENT` |
| 4 | binding type | **전역 0** · ★**원문 §38 에 Binding Type 열거 축 없음**(아래 참조) | `ABSENT` |
| 5 | primary 여부 | 부재 — primary/secondary 구분축 0 | `ABSENT` |
| 6 | profit owner reference | 부재 — 이익 책임 주체 축 0 · ⚠️ `ORG_PRESET` 에 **"영업팀"·"해외영업팀"·"국내영업팀"·"대기업영업팀"** 이름 존재(`TeamPermissions.php:706-722`)나 **`parent_team_id` 없는 평면 열거** · 팀↔손익 링크 0 | `NAME_ONLY` |
| 7 | legal entity | **`legal_entity` 전역 0** · 🔴 테넌트 ≠ 법인 | `ABSENT` |
| 8 | currency | ★**실재** — `Pnl.php:312` `GROUP BY COALESCE(UPPER(currency),'KRW')` · `fxToKrw` 24통화 | `PARTIAL` |
| 9 | regional scope | `region` 3축 전부 무관(광고 인구통계·Amazon 엔드포인트·WMS 시도) · **parent region 0 · Country↔Region binding 0** | `NAME_ONLY` |
| 10 | brand scope | `catalog_brand`(`Catalog.php:151-169`) 실재 · `data_scope` 에 `brand` 차원 존재(`TeamPermissions.php:318-320`) — 단 **가시성 필터**이지 손익 귀속 아님 · **브랜드별 P&L 분해 코드 0** | `PARTIAL` |
| 11 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 12 | valid_from | 부재 — 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 **as-of 조회 능력 없음**(전역 0건) | `ABSENT` |
| 13 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 14 | status | 부재 | `ABSENT` |
| 15 | evidence | 부재 | `ABSENT` |

**실측 개수: 15 / 15 전사.** 커버리지 = `PARTIAL` 2(currency·brand scope) · `NAME_ONLY` 2 · `ABSENT` 11. **`VALIDATED_LEGACY` = 0 · 사실상 `ABSENT`.**

### Binding Type — ★**원문에 항목 축 없음**

| # | 원문 값 | 현행 대조 | 판정 |
|---|---|---|---|
| — | — | — | — |

★**원문 §38(`SPEC…:1621-1641`)에는 Binding Type 열거가 존재하지 않는다.** `binding type` 은 **필수 필드로만 등장**(`:1630`)하고 그 값 목록은 **정의되지 않았다**. 이는 §37(`:1610-1617` — `PRIMARY_COST_CENTER`/`SHARED_COST_CENTER`/`CHARGED_TO`/`MANAGED_BY`/`BUDGET_OWNED_BY`/`REPORTING_ONLY` **6종 명시**)과 **비대칭**이다.

🔴 **§37 의 6종을 §38 에 복사하지 마라.** 규율 1(요구 날조 0)·규율 6(원문에 축이 없으면 표를 비우고 "원문에 항목 축 없음"이라 적어라). 대칭이 자연스러워 보인다는 이유로 값을 채우면 **날조**다. §38 의 Binding Type 값 정의는 **원문 확장 시 사용자 결정 사항**으로 남긴다.

## 2. 규칙

- 🔴 **§38 은 `ABSENT` 다 — 이름·능력 양쪽 부재.** `profit_center` grep 0(PM 재확인)이며, **능력축으로도** 이익이 조직에 귀속될 수 없다: `grossProfit`/`operatingProfit`/`netProfit`(`Pnl.php:22-25`)이 **테넌트 단일 스칼라**이고 귀속축은 `tenant_id`·`channel`·`currency`·`period` **4개뿐**(`:100`,`:147-150`,`:312`,`:489`)이다. → **신설**.
- 🔴 **`channel` 을 Profit Center 로 승격하지 마라.** 채널은 **판매 플랫폼 종류**이며 `channel_registry` 에는 **tenant 컬럼조차 없다**(`ChannelRegistry.php:32-49`·주석 `:11`). 소유자·승인선·유효기간을 붙일 대상이 아니다. **"채널별 손익이 되니 채널이 Profit Center"** = 역산.
- 🔴 **`data_scope` 의 `brand` 차원(`TeamPermissions.php:318-320`)을 `brand scope` 로 배선 금지.** 그것은 **가시성 필터**(누가 어떤 행을 보는가)이지 **손익 귀속**(이익이 어디에 잡히는가)이 아니다. 게다가 **단일 차원 제약**(`:277` `if ($sc['scope_type'] !== $dimension) return null;` · `:311` 주석 자인)으로 **조직×브랜드×지역 다차원 귀속을 구조적으로 표현할 수 없다**. 🔴 **`DATA_SCOPES` 의 `'company'` 는 무제한 센티넬**(`:258` — *"전사 = 무제한"*) — **경계를 지운다**.
- 🔴 **`region` 을 `regional scope` 로 배선 금지** — 3축(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`)이 **전부 도메인 상이**하고 **parent region 0 · `APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 · Country↔Region binding 0** → 지역 축은 **순수 신규**.
- 🔴 **`ORG_PRESET` 의 영업팀 4종(`TeamPermissions.php:706-722`)을 profit owner 로 계산 금지** — `team` DDL 에 **`parent_team_id` 가 없어**(`:145-151`) **구조가 아니라 열거**이며 팀↔손익 링크는 **0**이다.
- 🔴 **§37 의 Binding Type 6종을 §38 에 복사 금지**(규율 1·6). 원문에 **없다**. 자연스러운 대칭을 이유로 값을 채우면 **날조**이며, 그 순간 §38 의 갭은 **정의상 소멸**한다.
- **`currency` 만이 유일한 재사용 축**(`Pnl.php:312`) — **`COALESCE(UPPER(currency),'KRW')` 동일 규약 준수**. 🔴 **레지스트리 currency 오강제**(288차 확정 결함) 재현 금지.
- 🔴 **`Pnl` 산식(`:22-25`) 재작성 금지(무후퇴).** 주석 `:20-23` — **프론트 `GlobalDataContext.jsx` pnlStats 와 100% 동일**해야 한다. Profit Center 도입 시 **기존 테넌트 스칼라 산출을 보존**하고 **조직 분해는 별도 뷰로 얹어라**. 🔴 **288차 정산 zero-out · VAT 해외광고비제외 확정 수정을 되돌리지 마라.**
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무. ★**`ensureTables` 는 백필을 하지 않는다** → **과거 손익의 소급 Profit Center 귀속 집행 수단이 현재 없다.**
- 🔴 11축 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
