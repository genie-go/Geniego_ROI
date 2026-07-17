# DSAR — Approval Case ↔ Request 관계 (§13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 지원 6 + 금지 5 = 11 = REQ §7(스펙 §13). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

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

## 1. 지원 관계 (6)

| # | 관계 | 설명 |
|---|---|---|
| 1 | **1 Case : 1 Request** | 기본형. 현행 4개 테이블 전부 이 형태에 해당(단 Case id 부재) |
| 2 | **1 Case : N Request** | 묶음 승인. `Catalog::approveQueue` `:2341-2364` 벌크 전이가 사실상 이 형태 — **묶음 id 없이** 수행 중 |
| 3 | **N Case : 1 Request** | 동일 요청이 복수 Case에 참조(교차 검토) |
| 4 | **Case : Case 계층** | 상위/하위 Case(집계) |
| 5 | **Case : Case 대체** | Supersession(§39) |
| 6 | **Case : Case 상관** | Correlation(§34) — 병합 아님·**참조만** |

## 2. 금지 관계 (5) — 근거를 현행 실측과 연결

| # | 금지 | 현행 근거 |
|---|---|---|
| 1 | **Cross-Tenant Case 병합** | `admin_growth_approval` **tenant_id 부재**(`AdminGrowth.php:142-149`) → `:1306` **이미 전역 조회 상태**. Case 도입 시 이 테이블을 그대로 묶으면 **테넌트 격리 붕괴가 확정적으로 재현**된다(헌법: 테넌트 격리 절대) |
| 2 | **다른 Legal Entity의 Financial Case 병합** | Legal Entity 레지스트리 **부재(grep 0)** → 현재는 **구분할 수단조차 없음**. 신설 전 병합 허용 시 법인 간 채무 혼합 |
| 3 | **Production ↔ Sandbox Case 병합** | `Db::env()` `Db.php:46,57` 2값(`demo`\|`production`)은 **프로세스 전역 설정**일 뿐 **행 단위 environment 컬럼이 승인 테이블에 없음** → 병합 시 데모 승인이 운영 집행 근거가 됨 |
| 4 | **다통화 무조건 합산** | `fxToKrw` `Connectors.php:1749`는 **하드코딩 환율+캐시** — 승인 시점 환율 고정(§4.4) 없이 합산하면 **금액이 재현 불가**. 승인 도메인 합산 방지 로직 **부재** |
| 5 | **다른 Domain의 무분별 병합** | 현행 승인은 도메인별 4테이블로 **물리 분리**(alert/mapping/growth/catalog). Canonical 통합 시 `domain_type`(§6·31종) **없이** 한 Case로 묶으면 도메인 규칙이 서로를 덮어씀 |

## 3. 규칙

금지 5는 **Runtime Guard로 강제**(정본 = `DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md` §47). 병합 판정 키는 **`(tenant_id, legal_entity_id, environment, currency, domain_type)` 전건 일치**이며 **하나라도 불일치 시 fail-closed**(Unknown ≠ 허용). **NOT_APPLICABLE 4건을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). **코드변경 0** — `admin_growth_approval` tenant_id 추가는 **별도 승인 세션**.
