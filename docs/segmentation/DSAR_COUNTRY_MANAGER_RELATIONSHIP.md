# DSAR — Country Manager Relationship (§25)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §25 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★`country` = **4축 · 전부 도메인 상이 · 어느 것도 조직 단위가 아니다**

| # | 축 | 정의 | 실제 의미 |
|---|---|---|---|
| 1 | **가입 사업자 등록 국가** | `app_user` **`extra_data` JSON 키**(`UserAuth.php:499` 파싱 목록 · `:504` 수집 · **`:530` `json_encode($extraFields)`** · 재노출 `:681`) | **테넌트 자신의 사업자 정보**(`ceo_name`·`business_type`·`business_number` 와 동일 묶음). 🔴 **컬럼이 아니라 JSON 키** |
| 2 | **WMS 창고 국가** | `wms_warehouses.country VARCHAR(60)` — **ALTER 추가** `Wms.php:129` · 쓰기 `:292`,`:299`,`:313` · 판독 `:1025` | **물류 지리 최적할당 입력**(`warehouseCentroid` `:1002` 텍스트 → 좌표) |
| 3 | **택배사 국가** | `wms_carriers.country VARCHAR(8)` `Wms.php:69` · SQLite `:113` · 쓰기 `:397`(기본 `'KR'`),`:406`,`:408`,`:423` | **배송사 서비스 국가**. 사람 아님 |
| 4 | **IP 지오 → 언어** | `Geo.php:23-53` · `SUPPORTED`(`:24`) = **15개 언어코드** · `:23` 주석 자인 *"Accept-Language 매칭용"* | **언어 결정용**. ISO alpha-2 를 쓰지만 **조직 명부 아님** |

🔴 **①은 `KV_ONLY`** — `extra_data` JSON 내부 키이므로 **인덱스 불가 · `WHERE country` 질의 불가 · as-of 불가**. 5-3-3-1 D-13 `pm_baseline.captured_at`(`PM/Enterprise.php:360` snapshot_json 내부 키)과 **정확히 동형**. 게다가 **계정당 1개**이며 **테넌트 자신의 소재국**이지 **관리 대상 국가가 아니다** — 축이 반대다.

★**결론 — 4축 전부 "탐지·라우팅·프로필"이며 Country Directory 가 아니다.** country 에 **책임자를 결부시키는 코드가 0**이다.

### ⚠️ `wms_warehouses.manager` — **§25 오독 위험(§24 와 동일)**

`manager VARCHAR(120)`(`Wms.php:62` MySQL · `:112` SQLite)가 **`country` 와 같은 테이블에 공존**한다. **판독 술어 0** — 지리할당 SELECT `:1025` 는 `id,name,region,country,area,location,lat,lng` 만 투영하며 **`manager` 를 읽지 않는다**. `SELECT *`(`:258`)로 노출만 된다 → **`NAME_ONLY` · 커버 금지.**

### ★승인 자격 축 — **국가를 해석하는 승인 코드가 0**

승인 4경로 전량 **"호출자가 곧 승인자"**:

| 경로 | 승인자 결정 | 자격 판정 축 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **정족수(숫자)뿐** |
| `Catalog::approveQueue:2341-2365` | 🔴 **행위자를 읽지도 않는다** · `:2343` `requirePro` | **구독 플랜** |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | 고정 역할(**해석 아님**) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | — |

**Approval Manager Resolver = `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`).

> ★**본 문서의 기지 실측 정정**: ⓑ 브리핑 §9 는 Regional/Country Directory 부재 근거로 `Geo.php` 와 `region` 3축만 인용했다. 실측 결과 **`country` 축은 4개**이며, 그중 **`app_user` `extra_data.country`(`UserAuth.php:499`·`:530`)와 `wms_carriers.country`(`Wms.php:69`)는 브리핑에 없다.** 결론(조직 country 부재)은 **유지**되나, 인접자산 목록이 **불완전했다**.

## 1. 원문 전사 + 판정 — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | country code | **조직 country 부재.** 동명 4축(`app_user.extra_data.country` **JSON 키** `UserAuth.php:499`,`:530` / `wms_warehouses.country` `Wms.php:129` / `wms_carriers.country` `Wms.php:69` / `Geo.php:23-53` **언어결정**) = **프로필·물류·언어** · **도메인 상이 → 커버 금지** | `ABSENT` |
| 2 | country organization | 부재 — 조직 축 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) | `ABSENT` |
| 3 | local legal entities | 부재 — Legal Entity 축 전역 0. `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:307`,`:499`,`:1720` · `:1183` 가입 필수검사 *"대표자"*) · FK·감독관계·승인라우팅·시점 **전무** · 🔴 **계정당 1개 · 복수 법인 표현 불가** | `ABSENT` |
| 4 | local responsibility scope | 부재 — ⚠️ `wms_warehouses.manager`(`Wms.php:62`) = **시설 담당자 자유텍스트 · 판독 술어 0** | `NAME_ONLY` |
| 5 | regulatory scope | 부재 — 규제 범위 축 0. 인접 `kr_fee_rule.vat_rate`(`Db.php:898` 묶음 · 판독 `Pnl.php:454`) = **세율 계산 파라미터**이지 규제 권한 범위 아님 | `ABSENT` |
| 6 | local financial scope | 부재 — P&L 귀속축 = `tenant_id`·`channel`·`currency`·`period`(`Pnl.php:100`,`:147-150`,`:312`,`:489`) · 🔴 **차원(dimension) ≠ 조직 단위** · **국가 차원조차 없다** | `ABSENT` |
| 7 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`** · 국가를 해석하는 승인 코드 0 | `ABSENT` |
| 8 | valid period | 부재 — `effective_from` 은 `kr_fee_rule` 전용(`Db.php:898`) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 8 / 8 전사.** (측정기 분모 8 · 원문 대조 8 · 전사 8 — **3자 일치**.)
커버리지 = **부재 7 · 라벨 1 · 커버 0.**

## 2. 규칙

- 🔴 **동명 4축(`country`)을 §25 에 매핑 금지.** 사업자 프로필·창고·택배사·언어결정은 **조직 단위가 아니다**. 특히 `app_user.extra_data.country` 는 **테넌트 자신의 소재국**이므로 "관리 대상 국가"와 **축이 반대**다 — 매핑하면 의미가 뒤집힌다.
- 🔴 **`app_user.extra_data.country` 를 country code 저장소로 확장 금지.** JSON 키이므로 **인덱스·질의·as-of 전부 불가**(`KV_ONLY`). `pm_baseline.captured_at` 과 동형 결함이며, 여기에 조직 국가를 얹으면 **설계 시점에 이미 §38 as-of 질의가 불가능**해진다.
- 🔴 **`wms_warehouses.manager` 를 Country Manager 로 계산 절대 금지**(§24 와 동일 사유 — 같은 테이블 공존은 **이름 논증**이며 판독 술어 0).
- ★**원문 금지 — *"Country Manager가 모든 Local Legal Entity의 법적 승인 권한을 가진다고 가정하지 마라"*** : 🔴 **현행에서 이 금지는 검증 불가 — Legal Entity 축과 Country Manager 축이 둘 다 부재**하기 때문이다. **"현행이 가정하지 않으므로 준수"라 적으면 규칙 10 위반**(우연한 일치를 준수로 계산 금지). 신설 시 **Country Manager 관계와 Legal Entity 승인 권한을 별개 레코드로 분리**하고, Country 소속을 **승인 자격으로 자동 승격시키지 마라**.
  - ⚠️ **현행에 자동 승격 선례가 있다**(§76 실재 3건 중 1): **"Manager 라는 이유만으로 Approval Authority 자동 부여"** — `UserAuth.php:1064` · `TeamPermissions.php:136`(`isManagerAdmin`). **이 패턴을 국가 축으로 복제하면 원문이 금지한 바로 그 결과**가 된다.
- **`local legal entities` 는 복수형이다.** 현행 `ceo_name` 은 **계정당 1개 스칼라**이며(규칙 10 — 복수를 표현할 수단이 없다), `data_scope` 도 **`UNIQUE(tenant_id,subject_type,subject_id)`**(`TeamPermissions.php:164`)로 단일행이 **스키마로 강제**된다. 복수 법인은 **신규 N:N 테이블 필요** · `ensureTables` 경로(마이그레이션 **172차 정지**) · **MySQL/SQLite 두 방언 수기 중복 작성 의무**.
