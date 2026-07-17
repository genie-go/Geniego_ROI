# DSAR — Approval Item Type (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §15 Item Type = 14). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

| 현행 유형 축 | 실측 | 분류 |
|---|---|---|
| `admin_growth_approval.ref_type` | `AdminGrowth.php:1335,1337` — `content` / `live_mode` / `campaign_launch`(`:1340` 주석) **3종** | **MIGRATION_REQUIRED**(Item Type 아님 = **Resource Type**에 가까움) |
| `action_request` action type | `Alerting.php:560` — `$action["type"] ?? $action["action_type"] ?? "writeback"` **JSON 자유값·화이트리스트 없음** | **MIGRATION_REQUIRED** |
| `catalog_writeback_job.operation` | `Catalog.php:2348,2351` — 요청 body의 자유 문자열로 필터 | **MIGRATION_REQUIRED** |
| `mapping_change_request` | `Db.php:623-636` — 유형 컬럼 **없음**(매핑 변경 단일 용도) | **NOT_APPLICABLE** |
| **REBATE_\*** | grep 0 — **승인 대상 엔티티 자체가 부재** | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| Item Type 열거 | grep 0(Item 부재) | **NOT_APPLICABLE(부재 → 신설)** |

> **주의**: 현행 `ref_type`/`operation`/`action_type`은 **Item Type이 아니라 Resource·Action 축**이다. 이를 Item Type으로 그대로 승격하면 **축 혼합**이 된다.

## 1. CANONICAL_APPROVAL_ITEM_TYPE (14)

| # | 타입 | 의미 |
|---|---|---|
| 1 | `FINANCIAL_AMOUNT` | 금액 승인(Currency 필수) |
| 2 | `BUDGET_ALLOCATION` | 예산 배정 |
| 3 | `FUNDING_COMMITMENT` | 자금 약정 |
| 4 | `CLAIM_LINE` | 클레임 라인 |
| 5 | `SETTLEMENT_LINE` | 정산 라인 |
| 6 | `PAYOUT_LINE` | 지급 라인 |
| 7 | `REFUND_LINE` | 환불 라인 |
| 8 | `RATE_CHANGE` | 요율·단가 변경 |
| 9 | `CONFIG_CHANGE` | 설정 변경(현행 `mapping_change_request` 대응) |
| 10 | `DATA_CHANGE` | 데이터 변경(현행 `catalog_writeback_job` 대응) |
| 11 | `CONTENT_PUBLISH` | 콘텐츠 게시(현행 `ref_type='content'`·`FeedTemplate` publish 대응) |
| 12 | `ACCESS_GRANT` | 권한 부여 |
| 13 | `EXECUTION_ACTION` | 외부 집행(현행 `action_request` writeback 대응) |
| 14 | `LIFECYCLE_TRANSITION` | 상태 전이(현행 `ref_type='live_mode'` 대응) |

## 2. 규칙

**Item Type ≠ Resource Type ≠ Action**(3축 분리) — 현행 `ref_type`(`AdminGrowth.php:1335`)을 Item Type으로 **직접 매핑 금지**. Type은 **화이트리스트 강제**(현행 `Alerting.php:560` JSON 자유값 = MIGRATION_REQUIRED 근거). Type 추가는 **Canonical 열거 확장**으로만 — 도메인별 Item Type 테이블 **복제 금지**(스펙 §5 단서: Domain Type·Resource Type으로 확장). **REBATE_\* 는 부재이므로 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). **코드변경 0**.
