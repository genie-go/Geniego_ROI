# DSAR — Organization Effective Period (§44)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §44 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_EFFECTIVE_PERIOD` | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **effective date 컬럼** | `kr_fee_rule.effective_from VARCHAR(32) NOT NULL`(`Db.php:898`) — **전 코드베이스 유일** | `PARTIAL` |
| effective date **쓰기** | `KrChannel.php:128`(INSERT 컬럼목록) · `:140` `$body['effective_from'] ?? date('Y-m-d')` | 존재 |
| effective date **읽기** | **전부 최신승** — `Pnl.php:454` · `KrChannel.php:102`·`:151`·`:459` 가 모두 `ORDER BY effective_from DESC … LIMIT 1` 계열 | **as-of 조회 능력 없음** |
| 🔴 **as-of 술어** | **`effective_from *<=` = backend/src 전역 0건**(PM 직접 재검증) | `ABSENT` |
| **폐구간 종료 컬럼** | `effective_to`·`valid_to`·`valid_from`·`recorded_from`·`recorded_to` **backend/src 전역 0건**(PM 재검증. `Onsite.php:396` 히트는 `invalid_token` 부분문자열 — 무관) | `ABSENT` |
| Bitemporal | `bitemporal` **grep 0** · System Time 축 자체가 없음 | `ABSENT` |
| future-dated / retroactive / correction 플래그 | `future_dated`·`retroactive`·`scheduled_effective` **grep 0** | `ABSENT` |
| 엔티티 `version` | **`menu_defaults.version` 단 1건**(`AdminMenu.php:120`·`:139`). `\bversion\b` 40건 전부 API 버전 문자열·DB 버전·벤더 헤더 · **optimistic lock `version` grep 0** | `ABSENT` |

### ★§44 결번은 코드로 실증된다 — 컬럼은 있으나 **as-of 조회 능력이 없다**

`kr_fee_rule.effective_from` 은 레포에서 **유일하게 "언제부터 유효한가"를 저장하는 컬럼**이다. 그런데 **그 값을 기준으로 시점을 질의하는 코드가 한 줄도 없다.** 4개 읽기 경로 전부가 `ORDER BY effective_from DESC LIMIT 1` — 즉 **저장된 시점 축을 정렬 키로만 쓰고 술어로는 쓰지 않는다.**

이것이 §44 가 요구하는 것과 정확히 어긋나는 지점이다. §44 는 `business valid from`/`business valid to` 로 **구간**을 긋고 그 구간에 **as-of 질의**를 요구한다. 현행은 **시작점만 있고 종료점이 없으며(`effective_to` 0건), 구간 질의도 없다(`<=` 0건).**

### ★★축 주의 — 결번이 **두 축에서 동형으로 재현된다** (부재의 깊이는 다르다)

P&L 계산에 들어가는 **시점 의존 값 2종이 똑같이 "과거 기간을 오늘자 값으로" 계산한다.** 그러나 **부재의 깊이가 다르다** — 이를 구분하지 않으면 대응 설계가 어긋난다.

| 축 | 시점 컬럼 | 저장 형태 | 읽기 | 부재의 깊이 |
|---|---|---|---|---|
| **세율(VAT)** | `kr_fee_rule.effective_from`(`Db.php:898`) **있음** | 관계형 행 · 다행 누적 가능(`KrChannel.php:128-140` INSERT) | `ORDER BY effective_from DESC … LIMIT 1` **최신승**(`Pnl.php:454`) | **① 컬럼 있고 질의 없음** — 이력은 쌓이나 묻지 않는다 |
| **환율(FX)** | 🔴**컬럼 자체 없음** — `rate_date`/`as_of`/`effective_from`/`effective_to` **grep 0** | **`app_setting` KV 단일행**(`skey='fx_rates_krw'` · `Connectors.php:1790` SELECT) · **UPSERT 덮어쓰기**(`:1802-1805` `ON DUPLICATE KEY UPDATE`/`ON CONFLICT DO UPDATE`) | 24h 캐시 값 1개(`:1780` 주석) | **② 컬럼도 이력도 없음** — **과거 값이 물리적으로 소멸**한다 |

★**차이가 결정적이다.** 세율은 **행이 남아 있으므로 as-of 술어를 추가하면 과거를 복원할 수 있다**(교정 = 질의 계층). 환율은 **덮어쓰기라 과거 값이 존재하지 않으므로 술어를 추가해도 복원할 게 없다**(교정 = 저장 계층 신설 = dated 테이블). → **§44 를 조직에 적용할 때 "시점 컬럼만 붙이면 된다"는 가정이 환율 축에서 깨진다.**

🔴 **등급 미부여 유지**(세율 축과 동일 취급). 환율 24h 캐시는 **명시적 설계**(`:1780` 주석)이고, **과거 거래를 거래일 환율로 환산할지 보고일 환율로 환산할지는 회계 정책 문제**다 — 코드만 보고 판단할 사안이 아니다. → **관찰 사실로만 등재**(287차 블라인드 지양).

### ⚠️ 관찰 사실 — `Pnl.php:449` 기간 파라미터와 `:454` 최신승의 불일치 (**등급 미부여**)

```
449:  [$from, $to] = self::periodParams($req);
451:  // vat_rate — 테넌트 최신 kr_fee_rule(채널 무관 최신). 없으면 0.10(국세 표준).
454:  SELECT vat_rate FROM kr_fee_rule WHERE tenant_id=? ORDER BY effective_from DESC, id DESC LIMIT 1
```

`:449` 가 조회 기간(`$from`,`$to`)을 받고도 `:454` 는 **그 기간을 인자로 쓰지 않는다** → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산된다.**

🔴 **그러나 이를 결함으로 등급 매기지 않는다.** `:451` 주석이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 이라고 **의도를 명시**하고 있다 — 즉 **설계 선택일 수 있다**(VAT율은 실무상 거의 불변이고, 채널 무관 단일값 정책이라면 최신승이 합리적일 수 있다). **라이브 확인(과거 기간에 실제로 다른 `effective_from` 행이 존재하는가) 없이 P0/P1 을 매기는 것은 287차 "블라인드 판정" 트랩이다.** → **관찰 사실로만 등재.**

⚠️ **단 규율 10 유의**: 위 주석은 **"의도가 명시돼 있다"는 사실의 근거**로만 인용했다. **주석을 "동작이 옳다"는 근거로 삼지 않았다** — 동작 판정은 `:454` 정의부 실독으로 했다.

### ⚠️ 인용 금지 — 선례로 오인하기 쉬운 3건

| 대상 | 왜 §44 선례가 아닌가 |
|---|---|
| `plan_period_pricing.period_months`(migration `20260527_171_003:21-34`) | **구독 기간(1/3/6/12개월 상품 옵션)** 이지 유효기간 아님. effective date 없음 · `updated_at` 덮어쓰기 = **현재상태 전용**. 🔴 **§44 선례 아님** |
| `Paddle.php:291` `['effective_from' => 'next_billing_period']` | **Paddle 외부 API 요청 파라미터 값**(문자열 `'next_billing_period'`). 자사 스키마의 effective date 아님 · 컬럼 아님 |
| `fxToKrw` 24통화(`Connectors.php:1749`) | ★**확정 = `KV_ONLY` · §44 선례 아님**(PM 직접 실측 · 정의부 실증 완료). 저장 = **`app_setting` KV 단일행**(`skey='fx_rates_krw'` · 24h 캐시 `:1780` · SELECT `:1790`) · 쓰기 = **UPSERT 덮어쓰기**(`:1802-1805`) → **이력 없음** · 시점 필드 = **`updated_at` 뿐**(`rate_date`/`as_of`/`effective_from`/`effective_to` **grep 0**) · `/v399`·`/v400` `recon/fx_rates/upsert` 라우트(`routes.php:1941`·`:1951`) 있으나 **별도 dated 테이블 없음**(`CREATE TABLE fx_rates` **0건**). **환율은 본질상 시점 의존이지만 레포는 그 축을 갖고 있지 않다** |

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | effective period id | 부재 — 유효기간이 **엔티티가 아님**(`kr_fee_rule` 은 요율 행에 날짜가 붙은 형태) | `NOT_APPLICABLE` |
| 2 | entity type | 부재 — `kr_fee_rule` 은 단일 대상(요율) 전용 · 다형(polymorphic) 대상 축 없음 | `NOT_APPLICABLE` |
| 3 | entity id | 부재 — 위와 동일 | `NOT_APPLICABLE` |
| 4 | business valid from | **`kr_fee_rule.effective_from`**(`Db.php:898`) 존재 · 쓰기 `KrChannel.php:140` — **단 as-of 술어 0건**(`<=` grep 0) | `PARTIAL` |
| 5 | business valid to | **`effective_to`/`valid_to` grep 0** — 종료점 없음 → **폐구간 모델 신규** | `ABSENT` |
| 6 | system recorded from | `kr_fee_rule.created_at`(`Db.php:899`)가 **형태상 근접**하나 System Time 축으로 **사용되지 않음**(질의 0) · 🔴 **형태 유사를 커버로 계산 금지**(규율 9) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | system recorded to | 부재 · `recorded_to` grep 0 | `ABSENT` |
| 8 | timezone | 부재 — ⓑ 실측: 타임존 술어 3벌 병존(SSOT 부재) · `effective_from VARCHAR(32)` 는 **타임존 없는 문자열** | `ABSENT` |
| 9 | future dated 여부 | 부재 · `future_dated` grep 0 · `KrChannel.php:140` 은 미지정 시 **`date('Y-m-d')`(오늘)** 로 채움 = 미래일자 개념 없음 | `ABSENT` |
| 10 | retroactive 여부 | 부재 · `retroactive` grep 0 (→ §46) | `ABSENT` |
| 11 | correction 여부 | 부재 · 정정 축 전무 | `ABSENT` |
| 12 | source effective date | 부재 — 외부 원천 시점 축 없음(ERP/HRIS 커넥터 0) | `ABSENT` |
| 13 | status | 부재 — `kr_fee_rule` 에 status 컬럼 없음(`Db.php:888-899` 전 컬럼 확인) | `ABSENT` |
| 14 | evidence | 부재 | `ABSENT` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 1(business valid from) · `KEEP_SEPARATE_WITH_REASON` 1 · 부재 12.

> 원문 말미 문장: *"Business Time과 System Time을 구분하는 Bitemporal 또는 동등한 모델을 권장한다."* → **현행은 Business Time 축의 시작점 1개만 보유하고 System Time 축은 전무** → Bitemporal 은 **순수 신규**.

## 2. 규칙

- ★**§44 판정 = `PARTIAL`.** 근거: **컬럼 선례는 있으나(`Db.php:898`) as-of 조회 능력이 부재**(`<=` 0건 · `effective_to` 0건). 🔴 **"effective date 선례 없음"으로 밀면 오판**이고, 🔴 **"effective_from 이 있으니 시점 관리된다"로 밀면 역산**이다. 정확한 표현 = **"시점을 저장하지만 시점으로 묻지 않는다."**
- 🔴 **`kr_fee_rule` 을 조직 유효기간의 정본으로 확장하지 마라.** 도메인 = **한국 채널 수수료·VAT 요율**(`Db.php:889` `channel_key` · `:896` `vat_rate`) → 조직 아님. **인용은 "레포에 effective date 패턴이 존재한다"는 선례 가치까지만.**
- ★**신설 시 폐구간(`business valid to`)을 반드시 동반하라.** 현행 최신승(`ORDER BY … DESC LIMIT 1`)은 **행이 1개일 때만 우연히 맞는다** — 조직은 미래일자 변경(§45)·소급(§46)이 전제이므로 **개구간 + 정렬 최신승은 구조적으로 오답**이다.
- ★**as-of 질의를 능력으로 도입하라.** `WHERE :as_of >= business_valid_from AND (business_valid_to IS NULL OR :as_of < business_valid_to)` — **반개구간(half-open)** 으로 경계 중복을 원천 차단한다. 🔴 **`BETWEEN` 금지**(양끝 포함 → 경계일 2행 매칭).
- 🔴 **Bitemporal 도입 시 System Time 축을 `created_at` 으로 대체하지 마라.** `created_at`(`Db.php:899`)은 **행 생성 시각**이지 *"시스템이 이 사실을 언제부터 참으로 알았는가"* 가 아니다. **소급 정정(§46)이 들어오는 순간 두 축은 갈라진다** — 이때 `created_at` 을 System Time 으로 쓴 코드는 **과거 감사 재현이 불가능해진다.**
- ★**스키마 도입은 `ensureTables` 경로 강제**(ⓑ §20 제약 1) — `backend/migrations/` 는 **172차 정지**. 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` · **MySQL/SQLite 양 방언 동시 작성 의무**(제약 3).
- ⚠️ **`Pnl.php:454` 최신승은 관찰 사실로만 등재 · 등급 미부여.** 조직 시점 모델 착수 전 **라이브 확인 필수**: `SELECT tenant_id, channel_key, COUNT(*), MIN(effective_from), MAX(effective_from) FROM kr_fee_rule GROUP BY 1,2 HAVING COUNT(*)>1` — **행이 테넌트·채널당 1개뿐이면 최신승은 무해**하고, **복수면 과거 P&L 왜곡이 실재**한다. **결과 확인 후에만 등급을 매겨라.**
- 🔴 **`plan_period_pricing.period_months` 를 §44 선례로 인용 금지**(구독 상품 옵션). `Paddle.php:291` `effective_from` 도 **외부 API 파라미터**이지 스키마 아님.
- 🔴 **★`fxToKrw` 를 §44 선례로 계산 금지 — 확정 `KV_ONLY`.** `app_setting` KV 단일행 UPSERT 덮어쓰기(`Connectors.php:1802-1805`)라 **이력이 없다** → effective dating 선례가 **아니다**. ★**§44 의 유일한 실 선례는 여전히 `kr_fee_rule.effective_from`(`Db.php:898`) 하나뿐**이며, 그조차 **as-of 조회 능력이 없다**(`<=` 0건).
- ★**환율 축은 교정 지점이 다르다** — 세율은 행이 남아 있어 **질의 계층 교정**(as-of 술어 추가)으로 과거 복원이 가능하지만, 환율은 **덮어쓰기라 과거 값 자체가 없어 저장 계층 신설**(dated 테이블)이 선행돼야 한다. 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 여기서 깨진다.**
- ⚠️ **환율 축도 등급 미부여 · 관찰 사실로만 등재**(24h 캐시는 명시적 설계 `:1780` · 거래일 vs 보고일 환율은 **회계 정책 문제**). **라이브 확인 권장**: 과거 기간 다통화 정산이 실제로 존재하는지(`SELECT DISTINCT UPPER(currency) FROM …` 정산 라인) — **KRW 단일이면 무해**하고, **다통화면 과거 P&L 환산 왜곡이 실재**한다. **결과 확인 후에만 등급을 매겨라.**
