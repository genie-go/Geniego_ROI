# DSAR — Regional Manager Relationship (§24)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §24 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★`region` = **3축 · 전부 도메인 상이 · 어느 것도 조직 단위가 아니다**

| # | 축 | 정의 | 실제 의미 |
|---|---|---|---|
| 1 | **광고 인구통계 세그먼트** | `ad_insight_agg.region VARCHAR(50)` `Db.php:681` · 인덱스 `Db.php:690`(`idx_ad_insight_agg_segment(tenant_id,platform,gender,age_range,region)`) | `gender`·`age_range` **와 나란히 놓인 세그먼트 차원**. 조직이 아니라 **광고 타겟 분해축** |
| 2 | **Amazon Ads API 엔드포인트** | `Connectors.php:2704-2710` — cred `region` ∈ `na`/`eu`/`fe` → `advertising-api[-eu\|-fe].amazon.com` | **호스트 라우팅 키**. 조직이 아니라 **URL 선택자** |
| 3 | **WMS 창고 시·도** | `wms_warehouses.region VARCHAR(60)` — **ALTER 추가** `Wms.php:129`(`foreach(['region VARCHAR(60)','country VARCHAR(60)','lat DOUBLE','lng DOUBLE'])`) · 쓰기 `:292`,`:299`,`:313` · 판독 `:1025` | **한국 시·도**(물류 지리 최적할당). 조직이 아니라 **좌표 근접도 산출 입력** |

- 🔴 **`APAC`/`EMEA`/`LATAM` = 0.** grep 히트는 **전량 오탐** — `SOAPAction`(`Connectors.php:2894`)·`capacity`(`Wms.php:195`,`:233`,`:1602`)가 부분문자열 `APAC` 를 포함한다. **§24 검색 시 최우선 오염원.**
- **`Geo.php:23-53`** = IP→ISO alpha-2 · `SUPPORTED`(`:24`) 15개 **언어코드 집합** · 목적 = **Accept-Language 매칭**(`:23` 주석 자인). **언어 결정용이지 조직 명부 아님.**

★**결론 — "탐지·라우팅·세그먼트이지 명부(Directory)가 아니다."** 3축 전부 **읽히기는 한다**(세그먼트 집계·호스트 선택·창고 할당). 그러나 **어느 것도 사람을 담지 않으며**, region 에 **책임자를 결부시키는 코드가 0**이다.

### ⚠️ `wms_warehouses.manager` — **§24 최대 오독 위험**

`manager VARCHAR(120)`(MySQL DDL `Wms.php:62` · SQLite `:112` · 쓰기 `:290`,`:299`,`:313`)가 **`region`·`country` 와 같은 테이블에 공존**한다 → "Regional Manager 가 있다"로 읽기 쉽다.

| 검증 | 결과 |
|---|---|
| 판독 술어 | **0** — `WHERE manager` 없음 · 지리할당 SELECT(`:1025`)는 `id,name,region,country,area,location,lat,lng` **만 투영하며 `manager` 를 읽지 않는다** |
| 노출 | `SELECT *`(`:258` 목록 API)로 **반환은 된다** → UI 표시 · 효과 0 |
| FK | **0** — `app_user` 무관 자유텍스트 |
| 의미 | **시설 담당자**(전화번호 `phone` `:62` 와 짝) |

→ **`NAME_ONLY`. §24 커버 계산 금지.**

### 🔴 ★원문 §24 금지사항의 **안티패턴이 현행에 실재한다**

원문: *"Country 포함 여부를 Region 이름으로 추론하지 마라."*

**WMS 는 정확히 이 추론을 한다**:

- **`Wms::regionOf(string $text)` 정의부 = `Wms.php:924`** · 한국 시·도 centroid 표(`:905` 주석 · `:947`)
- **호출부 `Wms.php:286`** — `if ($region === '') $region = self::regionOf($b['area'].' '.$b['location'].' '.$name);` → **region 미입력 시 창고 이름·주소 텍스트에서 시·도를 추정**(`:284` 주석 자인: *"region(시/도) 미입력 시 area/location/name 에서 자동추정"*)
- **`warehouseCentroid`(`:993` 주석 · `:1002`)** — `country`+`region`+`area`+`location`+`name` **텍스트를 이어붙여 좌표 추정**
- **`:978`** — `$kr = self::regionOf($s); // 한국 시/도 우선(국내 세분)`

★**물류 축이라 현재는 무해**(배송지 근접 창고 선택의 휴리스틱). 그러나 **스키마·패턴을 조직 축으로 복제하면 원문이 명시적으로 금지한 것을 그대로 물려받는다.**

> ★**본 문서의 기지 실측 정정**: ⓑ 브리핑은 *"`regionOf():286`"* 이라 표기했으나 **`:286` 은 호출부이고 정의부는 `:924`** 다(규칙 12 — 정의부를 인용하라). 또한 브리핑은 §24 금지사항을 *"추론할 대상 자체가 없다"* 로 종결했으나, **이름→지역 추론 코드는 WMS 에 실재한다**(`:286`·`:1002`). **조직 축에 대상이 없다는 결론은 유지되나, "추론 코드가 없다"는 사실과 다르다.**

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | region id | **조직 region 부재.** 동명 3축(`ad_insight_agg.region` `Db.php:681` / Amazon cred `na\|eu\|fe` `Connectors.php:2704-2710` / `wms_warehouses.region` `Wms.php:129`) = **세그먼트·라우팅·물류** · **도메인 상이 → 커버 금지** | `ABSENT` |
| 2 | included countries | 부재 — region 에 국가 **집합**을 결부시키는 수단 0. 3축 전부 **단일 스칼라** | `ABSENT` |
| 3 | excluded countries | 부재 — **포함/제외 이중 집합**은 더욱 표현 불가(규칙 10 — 현행이 "제외 없음"인 것은 정책이 아니라 표현 수단이 없어서) | `ABSENT` |
| 4 | regional legal entities | 부재 — Legal Entity 축 전역 0 · `ceo_name` = `app_user` 프로필 평문(`UserAuth.php:307`,`:499`) | `ABSENT` |
| 5 | regional organization | 부재 — 조직 축 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) | `ABSENT` |
| 6 | regional responsibility | 부재 — ⚠️ `wms_warehouses.manager`(`Wms.php:62`) = **시설 담당자 자유텍스트 · 판독 술어 0 · 지리할당 SELECT `:1025` 가 읽지 않음** | `NAME_ONLY` |
| 7 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **0**) · region 을 해석하는 승인 코드 0 | `ABSENT` |
| 8 | cross legal entity state | 부재 — Legal Entity 가 0이므로 **교차 상태는 이중 부재** | `ABSENT` |
| 9 | valid period | 부재 — `effective_from` 은 `kr_fee_rule` 전용(`Db.php:898`) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 9 / 9 전사.** (측정기 분모 9 · 원문 대조 9 · 전사 9 — **3자 일치**.)
커버리지 = **부재 8 · 라벨 1 · 커버 0.**

## 2. 규칙

- 🔴 **동명 3축(`region`)을 §24 에 매핑 금지.** 광고 세그먼트·API 엔드포인트·창고 시·도는 **조직 단위가 아니다**. 매핑하면 "Regional Manager 있음"이라는 **가짜 녹색**이 되며, 288차 `ok=>true` 위장과 동형이다.
- 🔴 **`wms_warehouses.manager` 를 Regional Manager 로 계산 절대 금지.** `region`·`country` 와 **같은 테이블에 있다는 사실이 유일한 근거**이며, 이는 **이름 논증**이다(규칙 7 위반). 능력축으로 보면 **판독 술어 0**이다.
- 🔴 **`regionOf()`(`Wms.php:924`) 를 조직 region 해석기로 재사용 금지.** 원문 §24 가 명시적으로 금지한 **이름 기반 추론**이며, 값 집합도 **한국 시·도 전용**(`:905`,`:947`)이다. 조직 Region 은 **명시적 선언**이어야 하고 **추정 폴백을 가져서는 안 된다**(`:286` 패턴 복제 금지).
- ★**원문 금지 — *"Country 포함 여부를 Region 이름으로 추론하지 마라"*** : 신설 Region 은 **`included_countries`/`excluded_countries` 를 명시 저장**해야 하며, `region_id` 문자열 파싱·접두 매칭·이름 유사도로 **유도해서는 안 된다**. 현행 WMS 가 정확히 그 반대 패턴(`:286` 텍스트 추정 · `:1002` 문자열 이어붙여 좌표 추정)을 쓰므로 **참조 구현으로 삼지 마라**.
- **`included`/`excluded` 이중 집합은 스키마 선례가 없다.** `data_scope` 는 **`UNIQUE(tenant_id,subject_type,subject_id)`**(`TeamPermissions.php:164`)로 **단일행이 스키마로 강제**된다(규칙 10 — 정책이 아니라 UNIQUE 가 여러 개를 금지). 집합 축은 **신규 N:N 테이블 필요** · `ensureTables` 경로(마이그레이션 172차 정지) · **MySQL/SQLite 두 방언 수기 중복 작성 의무**.
- 🔴 **`APAC`/`EMEA`/`LATAM` grep 시 `SOAPAction`·`capacity` 오탐 배제.** 부분문자열 히트를 실재로 계산하면 **없는 지역 체계를 있다고 보고**하게 된다.
