# DSAR — Region Profile (§30)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §30 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

> ★**`region` 은 레포에 3축이 병존한다. 셋 다 조직 Region 이 아니다.** 이름 grep 이 다수 히트하므로 **규율 8(부재증명은 이름이 아니라 능력으로)이 가장 강하게 적용되는 절**이다.

### `region` 3축 병존 — 실측 전수

| # | 축 | 실측 | 의미 | 판정 |
|---|---|---|---|---|
| 1 | **광고 오디언스 인구통계** | `ad_insight_agg.region VARCHAR(50)`(`Db.php:681`) · 인덱스 `idx_ad_insight_agg_segment(tenant_id,platform,gender,age_range,region)`(`:690`) | `gender`·`age_range` 와 **나란히 놓인 세그먼트 차원** = 광고 타겟 인구통계. 조직 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | **Amazon Ads API 엔드포인트** | `Connectors.php:2704-2710` — 주석 "region → Advertising API 엔드포인트(na 기본). cred 'region' 값 na/eu/fe." · `loadCred($tenant,'amazon_ads','region')` → `advertising-api[-eu|-fe].amazon.com` 매핑 | **외부 API 호스트 선택자**(자격증명 KV 값). 조직 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 3 | **WMS 창고 시·도** | `wms_warehouses` ALTER `region VARCHAR(60)`(`Wms.php:129`) · 주석 `:127-128` "멀티창고 지리적 최적할당 — 창고 region(시/도)·좌표(lat/lng)" · 자동추정 `regionOf()`(`:284-286` — 미입력 시 area/location/name 에서 추정) | **국내 시·도 단위 물류 지오코딩**. 조직 아님 · 자동추정값이라 권위 없음 | `KEEP_SEPARATE_WITH_REASON` |

### ★조직 Region 의 능력축 3중 부재 (결정적)

| 능력 | 실측 | 귀결 |
|---|---|---|
| **Region 열거** | `APAC`·`EMEA`·`AMERICAS`·`LATAM`·`NORTH_ASIA`·`SOUTHEAST_ASIA`·`NORTH_AMERICA` — **backend/src grep 0 (0 files / 0 occurrences)** | 원문 예시 8종 중 **단 하나도 존재하지 않는다** |
| **parent region** | **parent region 컬럼 0** — 3축 어디에도 부모 없음(`ad_insight_agg`·`amazon_ads` cred·`wms_warehouses` 전부 평면) | Region 트리 **구조적 불가** |
| **Country↔Region binding** | **Country→Region 매핑 코드 0건** | §30 이 요구하는 명시적 Binding **대상 자체가 없음** |

★**원문 `:1410` "Region 이름으로 Country 포함 여부를 추론하지 말고 명시적 Binding을 사용하라" 의 현행 상태 = 금지 대상이 애초에 존재하지 않는다.** 추론할 Region 이름(APAC/EMEA…)도 없고, 추론당할 Country 바인딩도 없다. 이 규율은 **신설 시 지켜야 할 설계 제약**이지 현행 결함 지적이 아니다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | region profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | region code | 부재(조직) · 3축의 `region` 값은 인구통계/API호스트/시·도 — 전부 무관 | `ABSENT` |
| 4 | region name | 부재 · code/name 분리 축 없음 | `ABSENT` |
| 5 | parent region | ★**부재 — parent region 컬럼 0** → Region 트리 구조적 불가 | `ABSENT` |
| 6 | included countries | ★**부재 — Country↔Region binding 0** | `ABSENT` |
| 7 | excluded countries | 부재 — 포함 바인딩조차 없으므로 제외 축도 없음 | `ABSENT` |
| 8 | regional headquarters | 부재 · ⚠️ `wms_warehouses`(`Wms.php:129`)는 **물류 창고**이지 지역 본부 아님 | `ABSENT` |
| 9 | regional legal entities | 부재 — `legal_entity` grep 0 | `ABSENT` |
| 10 | regional executive reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — 무관 | `ABSENT` |
| 11 | timezone policy | 부재(지역 정책) · ⚠️ 레포에 **타임존 술어 다벌 존재**(5-3-2 확정) — **정책 엔티티가 아니라 산재한 계산식** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | currency policy | 부재(지역 정책) · 인접 = `fxToKrw` 24통화 · `amazon_ads` cred `currency`(`Connectors.php:2711`) — **환산 유틸/자격증명**이지 지역 정책 아님. `fxToKrw`=**`KV_ONLY` 확정**(PM 실측 — `Connectors.php:1749` 정의 · `app_setting` KV `skey='fx_rates_krw'` 24h 캐시 `:1780` · **단일행 덮어쓰기 `:1804-1805` = 이력 0** · `rate_date`/`as_of`/`effective_*` grep 0) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | approval hierarchy reference | 부재 — 승인 계층 엔티티 전무 | `ABSENT` |
| 14 | valid_from | 부재 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`) — 채널 수수료 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 15 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 16 | status | 부재(Region) · 형태 인접 = `team.status`(`TeamPermissions.php:148`) | `KEEP_SEPARATE_WITH_REASON` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 12 · `KEEP_SEPARATE_WITH_REASON` 5.

### 원문 예시 전사 — **8종** (스펙 `:1401-1408`)

| # | 원문 예시 | backend/src grep | 판정 |
|---|---|---|---|
| 1 | GLOBAL | 히트하나 **전부 무관**(`marketing_global`/`sales_global` team_type `TeamPermissions.php:45-46` · 글로벌 카탈로그 주석 등) — 조직 Region 값 0 | `ABSENT` |
| 2 | APAC | **0** | `ABSENT` |
| 3 | EMEA | **0** | `ABSENT` |
| 4 | AMERICAS | **0** | `ABSENT` |
| 5 | NORTH_ASIA | **0** | `ABSENT` |
| 6 | SOUTHEAST_ASIA | **0** | `ABSENT` |
| 7 | NORTH_AMERICA | **0** | `ABSENT` |
| 8 | LATAM | **0** | `ABSENT` |

**예시 개수: 8 / 8 전사.** 히트 0/8 (`GLOBAL` 은 문자열 히트하나 도메인 무관 → 실질 0).

## 2. 규칙

- 🔴 **`region` 3축 중 어느 것도 §30 커버로 계산 금지.** 특히 위험한 순서:
  ① **`wms_warehouses.region`** — 유일하게 '지리'라서 가장 그럴듯하다. 그러나 **국내 시·도**이고 **`regionOf()` 자동추정값**(`Wms.php:284-286`)이라 권위조차 없다. §30 은 APAC/EMEA 급 **대륙권 조직 단위**다.
  ② **`amazon_ads` cred `region`(na/eu/fe)** — `na`/`eu`/`fe` 가 `NORTH_AMERICA`/`EMEA`/`APAC` 처럼 **읽히는 게 함정**이다. 실체는 **API 호스트 문자열 3개**(`Connectors.php:2706-2710`)이며 Amazon 이 정한 엔드포인트 분할일 뿐 우리 조직이 아니다.
  ③ **`ad_insight_agg.region`** — `gender`·`age_range` 와 같은 인덱스에 묶여 있다(`Db.php:690`). **광고 타겟 인구통계 차원**이다.
- 🔴 **`na`/`eu`/`fe` → `NORTH_AMERICA`/`EMEA`/`APAC` 매핑 테이블을 만들어 커버로 주장 금지.** 그것이 §30 `:1410` 이 정확히 금지하는 **"Region 이름으로 추론"**이며, 동시에 형태 유사를 커버로 계산하는 **역산**(규율 9)이다.
- ✅ **`:1410` 준수 설계** — Region↔Country 는 **명시적 Binding 테이블**(`included countries`/`excluded countries` 양쪽)로만 표현하라. 코드·이름·접두어 문자열 파싱으로 포함 여부를 유도하는 코드를 **금지**한다. 레포에 이미 **경계 가드 없는 prefix 매칭 오답**(`AuthContext.jsx:834` — `menuKey.startsWith(k)`, 구분자 가드 없음)이 있고 정답은 `planMenuPolicy.js:293-295`(`pathname === p || pathname.startsWith(p + "/")`, 주석이 "경계 '/' 보장" 명시)다.
- **`parent region`(#5)은 Region 을 트리로 만든다** — GLOBAL→APAC→SOUTHEAST_ASIA. 이는 §25~§31 의 조직 간선과 **동일한 순회·순환 문제**다. **별도 Region 전용 순회 로직을 만들지 마라**(순회 방식 2벌 = 정합 부담). `PM/Dependencies::validateDependency` 패턴(반복 DFS + `$visited` + tenant 필터 + 깊이캡 + **쓰기 전 차단** `PM/Dependencies.php:32-34,79-100`) 확장이 무후퇴·최저위험이다.
- 🔴 **`excluded countries`(#7)는 `included countries` 의 단순 여집합이 아니다** — 원문이 두 축을 **별도 필수 필드로 요구**하므로 포함/제외를 **양쪽 다 명시 저장**하라. 하나만 만들고 다른 하나를 계산으로 대체하면 요구 미충족이다.
- ⚠️ `timezone policy`·`currency policy`(#11·#12)를 신설할 때 **레포에 산재한 타임존 술어·`fxToKrw` 를 재구현하지 마라** — 정책 엔티티는 신설하되 **계산은 기존 유틸에 위임**하라. 🔴 단 `fxToKrw` 는 **`KV_ONLY` 확정**(PM 실측)이라 **위임 대상은 "환산 계산"에 한한다** — 환율 **이력이 존재하지 않으므로**(`app_setting` 단일행 덮어쓰기 `Connectors.php:1804-1805`) **시점별 환율 정책을 `fxToKrw` 에 위임할 수 없다**. ★**부재의 깊이 구분**: 세율(`kr_fee_rule`)은 **컬럼 있고 질의 없음**(→ as-of 술어 추가로 과거 복원 가능) · 환율은 **컬럼도 이력도 없음**(→ **저장 계층 신설 없이는 복원할 대상 자체가 없다**). **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.**
- 🔴 17종 + 예시 8종 **"있다고 가정"하고 배선 금지.**
