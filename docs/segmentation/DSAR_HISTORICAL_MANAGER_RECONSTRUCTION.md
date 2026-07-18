# DSAR — Historical Manager Reconstruction (§63)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §63 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 핵심 판정 — **12개 "at T" Version 중 실재 0**

§63 은 **"특정 날짜 `T` 시점의 버전"** 12종을 요구한다. **레포에 시점 버전이 하나도 없다.**

| 축 | 실측(본 전사 재확인) |
|---|---|
| `effective_to` · `valid_to` · `valid_from` | **backend/src grep 0** |
| optimistic lock `version` | **grep 0** |
| **as-of 질의** | 🔴 **`WHERE effective_from <= :as_of` 전역 0** |

### 🔴 `kr_fee_rule` = **컬럼 有 · 질의 無** (부재의 깊이 축 ①)

- 컬럼 존재: `Db.php:898` `effective_from VARCHAR(32) NOT NULL`
- 🔴 **읽기 4개소 전부 "최신승"** — 본 전사에서 전수 재확인:
  - `Pnl.php:454` `... ORDER BY effective_from DESC, id DESC LIMIT 1`
  - `KrChannel.php:102` `... ORDER BY category, effective_from DESC`
  - `KrChannel.php:151` `... ORDER BY effective_from DESC, id DESC`
  - `KrChannel.php:459` `... ORDER BY effective_from DESC, id DESC LIMIT 1`
- **`<= :as_of` 술어를 가진 질의는 하나도 없다** → **과거 세율을 조회할 수단이 없다.** 교정 계층 = **질의 계층**(데이터는 남아 있어 복원 가능).

### 🔴 환율 = **컬럼도 이력도 無** (부재의 깊이 축 ② — **일반화가 여기서 깨진다**)

`fxToKrw`(`Connectors.php:1749`) = `app_setting` **KV 단일행 덮어쓰기**(`:1804-1805`). 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다 — 복원할 게 없다.** 교정 계층 = **저장 계층 신설**.
🔴 **§38 Business/System Time 이중 시간축 = 전례 0.**

### 🔴 `as_of` 2건 = **응답 타임스탬프**이지 as-of 질의 아님 (본 전사 재확인)

- `PgSettlement.php:279` — `'as_of' => gmdate('c'), 'window_days' => $windowDays`
- `AttributionEngine.php:666` — `$geoResults = ['as_of' => gmdate('c'), 'days_run' => ..., 'mode' => 'observational', ...]`

**둘 다 "지금 시각"을 응답에 찍는 코드**다. **§63 검색 시 최우선 오염원** — 커버로 계산하면 정반대 오판.

### 🔴 `Paddle.php:291` `['effective_from' => 'next_billing_period']`

**Paddle API 요청 파라미터 문자열**(청구 전환 시점)이지 시점 버전 컬럼 아님. **이름 함정.**

### 🔴 이력 소거 반례 — §63 이 요구하는 것의 **정반대가 실재**

`AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸**. §55 "과거 Snapshot 대체 금지"·§63 "현재 데이터로 과거 추정 금지"의 **정면 반례.**

## 1. 원문 전사 + 판정 — **원문 12종**

원문 지시: *"특정 날짜 `T` 의 Manager 를 해석할 때 다음 Version 을 사용하라."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Subject Identity Version at T | Subject = `app_user` **현재 상태 1행뿐** · 아이덴티티 버전 0. **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`) · 외부 상관자 3컬럼(`oidc_sub`·`oidc_provider`·`scim_external_id` `EnterpriseAuth.php:64-65`)도 **현재값 덮어쓰기** | `ABSENT` |
| 2 | Employment Version at T | 🔴 **고용 축 자체가 0** — `is_active` = **계정 상태**(base DDL `Db.php:1106`) · **사유·시각·이력 컬럼 0** · `is_active=0` 이 **3경로 혼재**(`UserAuth.php:1380` 팀원삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글) → **과거 시점의 사유 복원 불가** | `ABSENT` |
| 3 | Position Incumbency at T | **Position 축 전역 0**(`position_idx` = PM 태스크 정렬순서) | `ABSENT` |
| 4 | Position Manager Binding at T | Position 축 0 + Manager 축 0 — **이중 부재** | `ABSENT` |
| 5 | Subject Manager Binding at T | `team.manager_user_id` = **단일 칸 덮어쓰기** · **effective date 0 · 이력 0** → **T 시점 값이 물리적으로 존재하지 않는다**. `TeamPermissions.php:492-501` 교체 시 **전임자 기록 없이 덮어씀** | `ABSENT` |
| 6 | Organization Unit Version at T | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 = **18/18 `CONTRACT_ONLY`** | `CONTRACT_ONLY` |
| 7 | Organization Hierarchy Version at T | **`team` 에 `parent_team_id` 없음 → 계층 자체가 없다**(`TeamPermissions.php:148`) → 버전 이전에 대상 부재 | `ABSENT` |
| 8 | Reporting Line Version at T | 보고선 축 0(`reports_to`·`manager_id` grep 0 · **git 삭제 이력 0 = 존재한 적 없음**) | `ABSENT` |
| 9 | Acting·Temporary·Interim Assignment at T | **`acting`·`vacan` grep 0** · `interim` 1건은 **지오리프트 중간결과**(`AttributionEngine.php:672`) · `deputy`/`substitute`/`stand_in` 0 | `ABSENT` |
| 10 | Legal Entity Binding at T | **`legal_entity` 전역 0**(§60) · 🔴 `DATA_SCOPES` `'company'` = **무제한 센티넬**(`effectiveScope():258` `return null`)이지 법인 아님 | `ABSENT` |
| 11 | Availability Reference at T | 🔴 **§41 지원 상태 8종 중 표현 가능 2종**(1/0). **`UNKNOWN` 조차 표현 불가** — `is_active NOT NULL DEFAULT 1` → **미지가 자동으로 "가용" = fail-open**. `on_leave`·`out_of_office`·`terminated` **전역 0** · 🔴 `locked_until` ≠ 고용 정지(**무차별 대입 스로틀** `UserAuth.php:3335` · 키가 `ident`(user_id 아님) · 분 단위 자동 해제) · 🔴 `suspend` grep = **말장난 1건**("belt-and-suspenders" `WorkspaceState.php:12`) | `ABSENT` |
| 12 | Source Priority Version at T | §62 참조 — 🔴 **정렬할 소스가 0개** · Versioned Priority 는 **무대상** | `ABSENT` |

**실측 개수: 12 / 12 전사.** (측정기 분모 12 · 원문 대조 12 · 전사 12 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `CONTRACT_ONLY` 1(6) · `ABSENT` 11. **★"at T" Version 실재 0 — ⓑ 실측과 일치.**

> ★ 원문 말미 별도 문장(항목 아님): *"**현재 데이터로 과거 Manager를 추정하지 마라.**"*
> ★ 규칙 4 확인: 원문이 `evidence` 로 끝나지 않는다(12번 = `Source Priority Version at T`) → **추가하지 않았다.**

## 2. 규칙

- 🔴 **"현재 데이터로 과거 추정 금지"(원문 명시)는 현행 4개 질의의 정면 부정이다.** `kr_fee_rule` 읽기 4개소(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`)가 전부 **`ORDER BY effective_from DESC LIMIT 1` = 최신승** — 즉 **"현재 값으로 과거를 답하는" 패턴이 이미 레포 표준**이다. §63 배선 시 **이 패턴을 복제하면 원문 정면 위반**이며, Manager 도메인에는 **`WHERE effective_from <= :as_of ORDER BY effective_from DESC LIMIT 1`** 형태가 강제된다.
- 🔴 **부재의 깊이가 축마다 다르다 — "시점 컬럼만 붙이면 된다"는 일반화 금지.**
  | 축 | 상태 | 필요 계층 |
  |---|---|---|
  | `kr_fee_rule` | **컬럼 有·질의 無** | **질의 계층**(과거 복원 가능) |
  | 환율 `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無**(KV 단일행 덮어쓰기 `:1804-1805`) | **저장 계층 신설**(복원할 게 없다) |
  | **Manager 12축** | **엔티티조차 無** | **엔티티 → 저장 → 질의 3계층 전부** |
  §63 은 **가장 깊은 부재**다. 앞의 두 축 경험을 그대로 적용하면 과소 추정한다.
- 🔴 **`as_of` grep 히트 2건을 커버로 계산 절대 금지**(`PgSettlement.php:279`·`AttributionEngine.php:666` = **`gmdate('c')` 응답 타임스탬프**). 🔴 `Paddle.php:291` `effective_from` 도 **Paddle API 파라미터 문자열**. 🔴 `snapshot` grep **최다 히트 = CCTV JPEG 프레임**(`WmsCctv.php:45`·`routes.php:271`) — §54/§63 검색 최우선 오염원.
- 🔴 **`pm_baseline.captured_at` 을 as-of 선례로 삼지 마라** — **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`backend/src/Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가 · as-of 질의 불가** = `KV_ONLY`. `approvals_json`(`Mapping.php:285` `{user, ts}` 2키 JSON 배열)도 동형 — **JSON 안에 시각을 넣으면 §63 이 원천 불가능**해진다. **시점은 반드시 인덱스 가능한 컬럼.**
- 🔴 **11번(Availability)의 fail-open 을 계승 금지.** `is_active NOT NULL DEFAULT 1` 은 **미지를 "가용"으로 읽는다** → T 시점 가용성 미상 시 **자동으로 "그때 그 사람은 가용했다"**가 된다. §63 은 **Unknown ≠ Available · fail-closed** 여야 한다(5-3-3-1 Part3-2 *"Unknown≠Eligible Fail-closed"* 와 동일 원칙). 🔴 `Dependencies.php:84` 예산 소진 시 fail-open(`:99` `true` 반환)과도 **동형 함정**.
- 🔴 **`AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거 패턴 절대 복제 금지** — **이력을 물리적으로 지운다** = §63·§55 의 정면 반례. Manager 이력은 **append-only** 필수. **스키마 선례 = `pm_audit_log`**(migration `20260526_168_008:7` `tenant_id NOT NULL` · `entity` · `diff_json :13` · 3인덱스 `:17-19` · append-only 주석 `:2-3`).
- 🔴 **무결성 해시는 알고리즘만 이식** — `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`). **`menu_audit_log` 에 `tenant_id` 없음 · `lastHash()` 에 tenant 술어 없음 → 스키마 복제 금지 · 테넌트별 체인 시 `WHERE tenant_id=?` 필수.** 🔴 **게다가 `menu_audit_log` 는 쓰기 체인만 실재** — `verify()` 0·preimage ts(`:195`) 소실로 **tamper-evident 가 아니다** → 검증형 정본(`SecurityAudit::verify():56-68`)의 검증기까지 함께 이식해야 실제 무결성 검증이 성립한다.
- 🔴 **소급 적용 수단이 현재 없다(§40 직격).** `backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 신규 스키마는 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 경로뿐이며, 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.** 🔴 **`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 데이터 이행기가 아니다.** ⚠️예외 후보 = `backend/src/Handlers/PM/Shared.php:37-53`(런타임 `Migrate::applyFiles`). **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
  → **결론: 과거 Manager 이력은 백필 대상이 아니라 "T0 이전 = 복원 불가"로 정직하게 선언**해야 한다. **현재값으로 과거를 채우는 백필은 원문 말미 문장의 정면 위반**이자 **날조된 이력**이다.
- 🔴 **12항목을 "버전 테이블 하나로 통합" 금지.** 1·2·3·5·8·10 은 **서로 다른 시간축**을 가진다(아이덴티티·고용·재직·보고·법인). §38 이 **Business/System 이중 시간축**을 요구하는데 **레포 전례 0** — 단일 `updated_at` 사고로 접근하면 **T 해석이 축마다 어긋난다**.
