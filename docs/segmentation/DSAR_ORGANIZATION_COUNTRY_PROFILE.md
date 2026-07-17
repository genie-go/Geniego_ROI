# DSAR — Country Profile (§31)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §31 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

> ★**`Geo` 가 최대 함정.** ISO alpha-2 국가코드를 실제로 산출하는 유일 코드라 §31 `ISO country code` 커버처럼 보인다. 그러나 **국가→언어 매핑이지 국가→조직 매핑이 아니다.**

### `Geo` 실측 — 국가는 **언어 선택 입력값**이다

- ★**앵커 정정: `Geo.php:19` 는 `class Geo {` 줄이다.** (초판 브리핑이 `:19` 를 IP 탐지로 표기 — 오류. 실체는 아래.)
- `SUPPORTED`(`:21`) = **15개 언어 코드** `['ko','en','ja','zh','zh-tw','de','th','vi','id','es','fr','pt','ru','ar','hi']` — **국가 목록이 아니라 언어 목록**
- `lang()`(`:23-53`) — 공개 엔드포인트 `GET /v424/geo/lang`(주석 `:16`). 흐름: 클라이언트 IP 추출(`:25`) → 사설 IP 면 스킵(`:30-31`) → 캐시(`:35`) → `lookupCountry($ip)`(`:39`) → 응답 `country`(`:49` 주석 "ISO-3166-1 alpha-2 (대문자) 또는 null")·`accept_lang`·`source`
- 클라이언트 IP 추출 `clientIp()`(`:56-60`+) — X-Real-IP 우선, XFF 는 마지막 홉
- ★**용도 = 국가→언어**: 주석 `:13` **"응답의 country 는 프론트 `COUNTRY_LANG_MAP` 으로"** — 즉 **매핑 테이블은 backend 에 없고 프론트에 있으며, 매핑 결과는 조직이 아니라 UI 언어**다.

**★능력축 판정:** 국가 코드가 **어디로 흘러가는가**로 판별한다. `Geo` 의 국가는 **① IP 에서 추론된 값**(권위 없음·사설 IP 면 null) **② 소비처 = 언어 선택** **③ 사용자·조직 어디에도 귀속되지 않음**(요청 단위 1회성) → **§31 의 조직 Country 와 축이 다르다.** 🔴 **ISO alpha-2 를 산출한다는 이유로 `ISO country code` 커버로 계산하면 역산.**

### 나머지 `country` 축 — 전수

| 위치 | 실측 | 의미 | 판정 |
|---|---|---|---|
| `app_user.country` | 프로필 필드(`UserAuth.php:499` `['ceo_name','business_type','business_number','country']` · `:1720` `$liveFields` · 노출 `:311`·`:681`) | **회사주소 문자열**(사업자정보 평문 필드). ★`biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** → 법인 엔티티 아님 | `KEEP_SEPARATE_WITH_REASON` |
| `wms_warehouses.country` | ALTER `country VARCHAR(60)`(`Wms.php:129` — `region`/`lat`/`lng` 와 동일 배치) | **창고 지오코딩 속성**(멀티창고 최적할당용 `:127-128`). 조직 아님 | `KEEP_SEPARATE_WITH_REASON` |
| `ad_insight_agg.region` | `Db.php:681` · 인덱스 `:690`(`gender`·`age_range` 와 동렬) | **광고 오디언스 국가/지역 코드** = 타겟 인구통계 차원 | `KEEP_SEPARATE_WITH_REASON` |

**★Country↔Region 매핑 코드 0건 · `parent region` 컬럼 0** → §31 `parent region`(#5)은 **참조 대상(§30 Region)과 바인딩 양쪽이 모두 부재**다.

## 1. 원문 전사 + 판정 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | country profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | ISO country code | 부재(조직) · ★인접 = `Geo::lang()` 응답 `country`(`Geo.php:49`, ISO-3166-1 alpha-2) — **IP 추론값 · 소비처는 UI 언어 · 조직 미귀속 · 요청 1회성**. `app_user.country`(`UserAuth.php:499`)는 **자유 문자열**(ISO 강제 없음) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | country organization name | 부재 — 국가별 조직 법인명 개념 전무 | `ABSENT` |
| 5 | parent region | 부재 — ★**§30 Region 부재 + Country↔Region 매핑 코드 0건**, 양쪽 모두 없음 | `ABSENT` |
| 6 | local legal entities | 부재 — `legal_entity` grep 0 · `app_user.business_number`(`:499`)는 **프로필 평문 1건**(엔티티 아님) | `ABSENT` |
| 7 | country manager reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — 무관 · `reports_to`/`manager_id` **grep 0** | `ABSENT` |
| 8 | local currency | 부재(국가 조직 정책) · 인접 = `amazon_ads` cred `currency`(`Connectors.php:2711`) · `fxToKrw` 24통화 — **자격증명/환산 유틸**. ⚠️ `fxToKrw` **정의부 미독 — 미확인** | `KEEP_SEPARATE_WITH_REASON` |
| 9 | local timezone | 부재(국가 조직 정책) · ⚠️ 레포 타임존 술어 다벌(5-3-2 확정) — **산재한 계산식**이지 국가 정책 엔티티 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | local compliance profile | 부재 — 국가별 컴플라이언스 프로필 전무 | `ABSENT` |
| 11 | local tax profile reference | 부재 · ★인접 = `kr_fee_rule`(`Db.php:898` `effective_from`) + `pnl_vat_summary`(`Pnl.php:402-423`) — **한국 단일 국가 하드코딩**(`kr_` 접두) · tenant 키는 **법인 회계가 아니라 구독자별 리포트** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | approval hierarchy reference | 부재 — 승인 계층 엔티티 전무 | `ABSENT` |
| 13 | valid_from | 부재 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`) | `KEEP_SEPARATE_WITH_REASON` |
| 14 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 15 | status | 부재(Country) · 형태 인접 = `team.status`(`TeamPermissions.php:148`) | `KEEP_SEPARATE_WITH_REASON` |
| 16 | evidence | 부재 | `ABSENT` |

**실측 개수: 16 / 16 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 9 · `KEEP_SEPARATE_WITH_REASON` 7.

## 2. 규칙

- 🔴 **`Geo` 를 §31 커버로 계산 금지.** 세 이유가 각각 독립적으로 결정적이다:
  ① **국가→언어 매핑**이다(주석 `Geo.php:13` — 프론트 `COUNTRY_LANG_MAP` 소비) — 국가→조직 아님.
  ② **IP 추론값이라 권위가 없다** — 사설 IP 면 `source='private'`·`country=null`(`:30-31`), 조회 실패도 null.
  ③ **조직에 귀속되지 않는다** — 요청 단위 1회성 응답이며 어떤 엔티티에도 저장되지 않는다(IP 해시 캐시만).
  → §31 이 요구하는 것은 **조직 단위로서의 Country**(법인·국가 매니저·승인 계층을 매다는 마디)다.
- 🔴 **`Geo` 를 확장해 조직 Country 를 얹지 마라.** 도메인이 다르다 — i18n 감지 유틸에 조직 계층을 붙이면 **공개 엔드포인트**(`/v424/geo/lang`, 인증 우회 경로)에 조직 데이터가 노출된다. `Geo` 는 **보존**하고 조직 Country 는 **조직 단위 축**으로 신설한 뒤, 필요 시 조직 Country ↔ ISO 코드 **바인딩**으로 연결하라.
- 🔴 **`app_user.country` 를 `ISO country code` 로 승격 금지** — **자유 문자열**이고(ISO 검증 없음) 의미는 **회사 주소의 국가**다. `business_number`·`ceo_name` 과 함께 있어 법인처럼 보이나 ★**`biz_no`/`brn`/`corp_reg`/`tax_id` 전부 grep 0** = 법인 엔티티가 아니라 **프로필 텍스트**다.
- 🔴 **`kr_fee_rule`/`pnl_vat_summary` 를 `local tax profile` 로 계산 금지.** ⓐ **한국 단일 국가 하드코딩**(`kr_` 접두 — 다국가 세무 프로필 축 자체가 없음) ⓑ tenant 키는 **구독자별 리포트**이지 법인 회계 아님(테넌트 = 1 owner 계정의 구독 스코프 — `PlanLimits.php:36-37`). 🔴 **"테넌트=법인" 가정은 역산이다.**
- ⚠️ **`kr_fee_rule` 의 as-of 무능력을 §31 `valid_from` 선례로 인용하지 마라.** `WHERE effective_from <= :as_of` 술어는 **backend/src 전역 0건**이고 읽기는 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`). 컬럼 형태까지만 선례다. (`Pnl.php:449` 가 기간을 받고도 `:454` 가 무시하는 것은 주석 `:451` 이 의도를 명시하므로 **설계 선택일 수 있음 — 관찰 사실로만 등재 · 등급 미부여 · 라이브 확인 필요**.)
- **`parent region`(#5)은 §30 과 짝이다** — Country 문서에서 Region 트리를 **중복 정의 금지**, §30 정의를 참조하라. 바인딩 방향은 §30 이 정본(`included countries`/`excluded countries` 명시 Binding)이며 §31 의 `parent region` 은 그 **역참조**다. **두 곳에 각각 진실을 두면 SSOT 위반**이다.
- 🔴 16종 **"있다고 가정"하고 배선 금지.**
