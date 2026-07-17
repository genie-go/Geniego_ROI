# DSAR — Approval Case ↔ Request 관계 (§13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §13** — 원문 나열 실측 **지원 6 + 금지 5 = 11**. ✅ REQ 집계 11 과 **일치**.

## 0. 현행 실측 (file:line)

| 현행 | 실측 | 분류 |
|---|---|---|
| Case↔Request 관계 테이블 | grep 0 — Case 자체가 부재 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `admin_growth_approval` | `AdminGrowth.php:142-149` **tenant_id 없음** → `approvals` `:1306` `WHERE status=?` **전역 조회**(테넌트 격리 없음) · `approvalDecide` `:1324` `WHERE id=?` 역시 테넌트 조건 없음 | **★MIGRATION_REQUIRED** — 금지 1을 **이미 구조적으로 위반 중** |
| `action_request` 테넌트 격리 | `Alerting.php:582,594,612` `AND tenant_id=?` — 208차 P0 IDOR 차단 | **VALIDATED_LEGACY**(재사용) |
| `mapping_change_request` 격리 | `Mapping.php:252,288,302,316` `AND tenant_id=?` | **VALIDATED_LEGACY** |
| Legal Entity / Organization 레지스트리 | grep 0 | **NOT_APPLICABLE(부재 → 신설)** |
| Environment 분리 | `Db::env()` `Db.php:46,57` — `GENIE_ENV` → `demo`\|`production` **2값**(프로세스 전역) | **VALIDATED_LEGACY**(경계 근거) |
| 다통화 합산 방지 | `fxToKrw` `Handlers/Connectors.php:1749`(24통화 하드코딩+`app_setting` 캐시) — 환산기는 있으나 **승인 도메인에 합산 방지 로직 부재** | **NOT_APPLICABLE(부재 → 신설)** |

## 1. 스펙 §13 "다음을 지원하라" 전사 — 원문 실측 **6**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §13**

> 🔴 **본 절 초판(`UNVERIFIED_TRANSCRIPTION`)의 항목명은 원문과 어긋나 폐기됐다.**
> 초판은 관계 **방향을 뒤집어** 적었다 — 초판 `1 Case : 1 Request`·`1 Case : N Request`·`N Case : 1 Request` vs
> **원문은 Request 기점**(`하나의 Request → 하나의 Case`·`하나의 Request → 여러 Case`·`여러 Request → 하나의 Consolidated Case`).
> **원문 4~6 은 `Parent/Original Case →` 기점**이며 초판의 `Case : Case 상관`(Correlation)은 **원문 §13 에 없다**.

| # | 지원 관계 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | **하나의 Request → 하나의 Case** | **부재(형식상)** — §0 "Case↔Request 관계 테이블 grep 0 — **Case 자체가 부재**". ※현행 4테이블은 사실상 이 형태이나 **Case id 가 없어 관계로 표현되지 않음** |
| 2 | **하나의 Request → 여러 Case** | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** |
| 3 | **여러 Request → 하나의 Consolidated Case** | **부재** — §0 Case 부재. ※인접: `Catalog::approveQueue` `:2341-2364` 벌크 전이가 사실상 이 형태이나 **묶음 id 없이** 수행 중 |
| 4 | **Parent Case → Child Case** | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** |
| 5 | **Original Case → Reopened Case** | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** · §38 축 |
| 6 | **Original Case → Superseding Case** | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** · §39 축 |

> ※ 3의 "인접" 관찰은 §0 이 기록한 벌크 전이 실측이며, **Consolidated Case 로 승격 확정한 것이 아니다**(확정 시 역산 — REQ §15).

## 2. 스펙 §13 "다음은 명시적 Policy 없이 허용하지 마라" 전사 — 원문 실측 **5**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §13**

> ⚠️ **원문은 "금지"가 아니라 "명시적 Policy 없이 허용하지 마라"** 이다 — 초판 표제 "금지 관계"는 **원문보다 강하다**(Policy 가 있으면 허용 가능). 표제를 원문에 맞춰 정정한다.

| # | 조건부 차단 대상 (원문) | 현행 근거 — §0 실측 인용 |
|---|---|---|
| 1 | **다른 Tenant Request의 Case 병합** | `admin_growth_approval` **tenant_id 부재**(`AdminGrowth.php:142-149`) → `:1306` `WHERE status=?` **이미 전역 조회 상태** · `approvalDecide` `:1324` `WHERE id=?` 역시 테넌트 조건 없음. Case 도입 시 이 테이블을 그대로 묶으면 **테넌트 격리 붕괴가 확정적으로 재현**(헌법: 테넌트 격리 절대) · **★MIGRATION_REQUIRED** |
| 2 | **다른 Legal Entity Request의 Financial Case 병합** | Legal Entity 레지스트리 **부재(grep 0)** → 현재는 **구분할 수단조차 없음**. 신설 전 병합 허용 시 법인 간 채무 혼합 · **NOT_APPLICABLE(부재 → 신설)** |
| 3 | **Production과 Sandbox Request 병합** | `Db::env()` `Db.php:46,57` 2값(`demo`\|`production`)은 **프로세스 전역 설정**일 뿐 **행 단위 environment 컬럼이 승인 테이블에 없음** → 병합 시 데모 승인이 운영 집행 근거가 됨 · **VALIDATED_LEGACY**(경계 근거) |
| 4 | **다른 Currency 금액의 무조건 합산** | `fxToKrw` `Connectors.php:1749` = **24통화 하드코딩+`app_setting` 캐시** — 승인 시점 환율 고정(§4.4) 없이 합산하면 **금액이 재현 불가**. **승인 도메인 합산 방지 로직 부재** · **NOT_APPLICABLE(부재 → 신설)** |
| 5 | **다른 Approval Domain의 무분별한 병합** | 현행 승인은 도메인별 4테이블로 **물리 분리**(alert/mapping/growth/catalog). Canonical 통합 시 `approval_domain_type`(§6 · **원문 실측 32종**) **없이** 한 Case로 묶으면 도메인 규칙이 서로를 덮어씀 |

> 🔴 **5의 "31종" → "32종" 정정**: 초판은 §6 Domain Type 을 **31종**으로 적었으나 **원문 나열 실측은 32종**이다(REQ 집계 31 이 원문과 어긋남 — 정본 = [`DSAR_APPROVAL_DOMAIN_TYPE.md`](DSAR_APPROVAL_DOMAIN_TYPE.md) §1).

## 3. 규칙

금지 5는 **Runtime Guard로 강제**(정본 = `DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md` §47). 병합 판정 키는 **`(tenant_id, legal_entity_id, environment, currency, domain_type)` 전건 일치**이며 **하나라도 불일치 시 fail-closed**(Unknown ≠ 허용). **NOT_APPLICABLE 4건을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). **코드변경 0** — `admin_growth_approval` tenant_id 추가는 **별도 승인 세션**.
