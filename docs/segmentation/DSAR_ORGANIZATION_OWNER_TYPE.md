# DSAR — Organization Owner Type (§41)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §41 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `owner_type` 컬럼/enum | **backend/src grep 0** — owner 타입 축 자체가 없다 | `NOT_APPLICABLE`(부재 → 신설) |
| `team_role` 3종 | `owner` > `manager` > `member`(`TeamPermissions.php:17`) — **테넌트 내 사람 역할 등급** | `KEEP_SEPARATE_WITH_REASON` |
| `api_key` `roleRank` 4종 | `viewer`0·`connector`1·`analyst`2·`admin`3(`index.php:554`) — **기계 신원 API 등급** | `KEEP_SEPARATE_WITH_REASON` |
| `TEAM_TYPES` 17종 | `TeamPermissions.php:44-49` — **팀 종류**(브랜드/마케팅/영업/물류/재무/파트너4) · **평면 문자열 카탈로그** | `KEEP_SEPARATE_WITH_REASON` |
| `DATA_SCOPES` 9종 | `TeamPermissions.php:41` — **스코프 차원**(§43) · 소유 타입 아님 | `KEEP_SEPARATE_WITH_REASON` |
| `admin_growth_lead.owner` | `AdminGrowth.php:909`·`:912` **자유문자열**(타입 없음) | `NOT_APPLICABLE`(무관·함정) |

**★축 주의 — 레포의 3개 역할축 어느 것도 Owner Type 이 아니다.**
- `team_role`(**등급**: owner>manager>member) = **누가 더 센가**. Owner Type(**종류**: FINANCIAL/DATA/SECURITY…) = **무엇에 대한 소유인가**. 등급축은 **전순서 1차원**, 타입축은 **다대다 비순서**다. `team_role='owner'` 를 `EXECUTIVE_OWNER` 로 매핑하면 **차원이 붕괴**한다.
- `roleRank`(`index.php:554`)의 `connector` 가 결정적이다 — **조직에 "커넥터" 직위는 없다.** 유일 의미 = ingest 엔드포인트 쓰기 허용(`:571-574`) · 주체가 사람이 아니라 **키**(`auth_key`/`auth_role` 주입 `:590-593`) · 판정 축이 **HTTP 메서드**(`:568`). 조직 역할축과 **매핑 코드 0** — `effectiveScope():245-246` 은 `team_role` 만 읽고 `auth_role` 을 읽지 않는다.
- `TEAM_TYPES` 17종은 **팀의 종류**이지 **소유자의 종류**가 아니다. `finance` 팀이 존재하는 것과 `FINANCIAL_OWNER` 가 지정되는 것은 다른 명제다(팀은 조직단위 후보, Owner Type 은 바인딩 속성).

**★`ORG_PRESET` 15 ≠ Owner Type 15 — 개수 우연의 일치를 근거로 쓰지 마라.** `ORG_PRESET`(`:706-722`)도 15개이나 **조직 단위 프리셋**(브랜드팀·마케팅팀·…·파트너 4종)이다. **개수는 분모가 아니다**(규율 3).

## 1. 원문 전사 + 판정 — **원문 15종**(Owner Type)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EXECUTIVE_OWNER | 부재 — 임원 축 grep 0. `team_role='owner'`(`:17`)는 **테넌트 최고 등급**이지 임원 소유 타입 아님 | `NOT_APPLICABLE` |
| 2 | ADMINISTRATIVE_OWNER | 부재 — 인접 `team.manager_user_id`(`:148`)가 형태상 가장 가까우나 **Manager ≠ Owner**(§41 원문 명령) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | FUNCTIONAL_OWNER | 부재 — 기능 소유 축 grep 0 | `NOT_APPLICABLE` |
| 4 | FINANCIAL_OWNER | 부재 — `TEAM_TYPES` 의 `finance`(`:47`)는 **팀 종류**이지 소유 타입 아님 · 재무 소유자 지정 경로 0 | `NOT_APPLICABLE` |
| 5 | BUDGET_OWNER | 부재 — 예산 소유 축 grep 0. 인접 `AdAdapters::updateBudget`(`Alerting.php:634`)는 **집행 액추에이터**이지 소유자 아님 | `NOT_APPLICABLE` |
| 6 | PROGRAM_OWNER | 부재 — `program` 조직 축 grep 0(§43 `PROGRAM` 스코프도 부재) | `NOT_APPLICABLE` |
| 7 | BRAND_OWNER | 부재 — `catalog_brand`(`Catalog.php:151-169`)는 `tenant_id·name·code` 뿐(**owner 컬럼 없음**) · 목적 = **11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) = **상품속성**. `DATA_SCOPES` 의 `brand`(`:41`)는 **필터 차원**이지 소유 아님 | `NOT_APPLICABLE` |
| 8 | REGIONAL_OWNER | 부재 — `region` **3축 병존**이나 전부 무관: 광고 인구통계(`Db.php:681`·`690`) / **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) / **WMS 창고 시·도**(`Wms.php:129`·`regionOf():284-286`). `APAC`/`EMEA`/`AMERICAS`/`LATAM` **grep 0** · parent region 0 | `NOT_APPLICABLE` |
| 9 | COUNTRY_OWNER | 부재 — `Geo`(`Geo.php:23-53`)는 **IP→ISO alpha-2 → 언어** 매핑(`COUNTRY_LANG_MAP`)이지 국가→조직 아님. **Country→Region 매핑 코드 0건** · `app_user.country`(`UserAuth.php:499`)는 프로필 평문 | `NOT_APPLICABLE` |
| 10 | COST_CENTER_OWNER | 부재 — `cost_center` **backend/src grep 0** | `NOT_APPLICABLE` |
| 11 | PROFIT_CENTER_OWNER | 부재 — `profit_center` **backend/src grep 0** | `NOT_APPLICABLE` |
| 12 | DATA_OWNER | 부재 — 데이터 소유자 지정 경로 0. 인접 `data_scope`(`:160-166`)는 **주체의 접근 필터**이지 데이터 소유권 아님 | `LEGACY_ADAPTER`(인접 자산) |
| 13 | SECURITY_OWNER | 부재 — 보안 소유 축 grep 0 | `NOT_APPLICABLE` |
| 14 | COMPLIANCE_OWNER | 부재 — 컴플라이언스 소유 축 grep 0 | `NOT_APPLICABLE` |
| 15 | CUSTOM | 부재 — 확장 슬롯. 인접 관례 = `team_type` 의 `'custom'` 기본값(`:147` DDL `DEFAULT 'custom'` · `TEAM_TYPES` 말미 `:48`) | `LEGACY_ADAPTER`(패턴 선례) |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 12 · `KEEP_SEPARATE_WITH_REASON` 1 · `LEGACY_ADAPTER` 2.

**종합 판정: `NOT_APPLICABLE`(부재 → 신설).** 15종 중 **실 대응 0**.

## 2. 규칙

- 🔴 **`team_role` 3종·`roleRank` 4종·`TEAM_TYPES` 17종을 Owner Type 15종에 매핑 금지.** 세 축 모두 **등급 또는 팀 종류**이지 **소유 타입**이 아니다. 매핑은 역산이다(형식 정본 §12 의 `journeys` 노드 10종 금지와 동형).
- 🔴 **`team_role='owner'` → `EXECUTIVE_OWNER` 는 최대 함정.** 문자열이 정확히 `owner` 이나 의미는 **"테넌트 구독 계정의 최고 등급"**(`PlanLimits.php:36-37` — plan 을 `parent_user_id IS NULL` owner 에서 읽음)이다. **등급축(전순서 1차원) ↔ 타입축(다대다 비순서)** 은 차원이 다르다.
- 🔴 **`catalog_brand` 를 `BRAND_OWNER` 근거로 쓰지 마라.** 목적이 **11번가 상품등록 브랜드코드**(`Catalog.php:415`)인 **상품속성**이다. owner 컬럼조차 없다.
- **Owner Type 은 다대다여야 한다.** 한 조직단위가 `FINANCIAL_OWNER`·`DATA_OWNER`·`SECURITY_OWNER` 를 **동시에** 가질 수 있다. `team.manager_user_id`(컬럼 1개)·`data_scope`(`UNIQUE(tenant_id,subject_type,subject_id)` `:164` = 주체당 1행) **어느 쪽도 이 카디널리티를 담을 수 없다** → 신규 바인딩 테이블 필수.
- **타입 카탈로그는 상수 배열 관례를 따르라.** `DATA_SCOPES`(`:41`)·`TEAM_TYPES`(`:44-49`)·`PartnerPortal::TYPES`(`PartnerPortal.php:29`) = 전부 `public const <NAME> = [...]` **평면 문자열 배열**. 신규 enum 도 동일 관례로(DB CHECK 제약 아님 — MySQL/SQLite 양방언 이식성).
- **`CUSTOM` 슬롯은 기본값 관례를 재사용하라.** `team_type VARCHAR(48) DEFAULT 'custom'`(`:147`) 선례 — 미지정 시 `CUSTOM` 으로 수렴하되, **`CUSTOM` 이 사실상 유일 값이 되는 상태를 완료로 보고하지 마라**(NAME_ONLY 함정).
- ⚠️ **15종 전부 부재이나 "조직 코드가 삭제된 것"이 아니다.** `git log --all -S "org_unit"` **0** · `organization_unit` **0**(스펙 커밋 제외) · `hierarch` backend/src **0**. **팬텀도 유물도 아닌 순수 미도입**이다 — 복원할 과거 구현을 찾지 마라.
