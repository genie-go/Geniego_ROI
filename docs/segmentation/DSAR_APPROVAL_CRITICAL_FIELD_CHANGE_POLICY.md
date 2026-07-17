# DSAR — Approval Critical Field 변경 정책 (§31)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §31 Critical Field 변경 목록 = 23). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 대조표 (file:line)

**★Critical Field 변경 감지 = 전면 부재(grep 0).** 승인 후 원본이 바뀌어도 **재승인 검토를 트리거하는 로직이 하나도 없다.**

| 필요 구성요소 | 현행 실측 | 분류 |
|---|---|---|
| 변경 감지(critical field diff) | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |
| 승인 시점 기준값(스냅샷) | **부재** — 유일 유사물 = `mapping_change_request` 의 raw/canonical **값 복사 보관**(`Db.php:623-636`) · `content_hash` 없음 | **LEGACY_ADAPTER**(§30) |
| Resource Version | **개념 부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| 재승인 트리거 | **grep 0** — `APPROVED` 는 **영구 유효**로 취급됨 | **NOT_APPLICABLE(신설)** |
| 승인 소비 시 재검증 | `Mapping::apply` `Mapping.php:296-327` — `status!=='approved'` **상태만** 확인(`:309`) · **내용 변경 여부 미확인** | **MIGRATION_REQUIRED** |
| | `Alerting::executeAction` — `UPDATE ... SET status=?`(`Alerting.php:653`) · 전이·내용 검증 0 | **MIGRATION_REQUIRED** |
| `SUPERSEDED` 상태 | 현행 4개 승인 테이블 **어디에도 없음**(`pending|approved|applied` / `pending|approved|rejected|executed|failed|approved_manual`) | **NOT_APPLICABLE(신설)** → §39 |

> **🔴 판정 — 스펙 §31 요구 대비 0/23 충족.**
> 현행에서는 **금액을 10만원으로 승인받은 뒤 1억으로 고쳐도 그 승인이 그대로 소비된다.**
> 막는 코드가 없다(감지 0 · 재승인 0 · 스냅샷 대조 0). Rebate 는 **금전 도메인**이므로 이 결함은 §45 Critical Gap 후보다.
> ※ 단, `REBATE_*` 코드는 **전면 부재(grep 0)** 이므로 현재 **실피해 미도달**(P 등급 단정은 PM 코드 재증명 후).

## 1. Critical Field (23) — 변경 시 기존 승인 **자동 재사용 차단**

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `amount` | 13 | `discount_rate` |
| 2 | `currency` | 14 | `effective_from` |
| 3 | `payee_id` (수취인) | 15 | `effective_to` |
| 4 | `payee_bank_account` | 16 | `contract_id` |
| 5 | `legal_entity_id` | 17 | `program_id` |
| 6 | `tenant_id` | 18 | `funding_source` |
| 7 | `workspace_id` | 19 | `cost_center` |
| 8 | `environment` (`Db::env()`) | 20 | `tax_treatment` / `vat_flag` |
| 9 | `resource_id` | 21 | `item_count` (§15) |
| 10 | `resource_type` | 22 | `total_amount` (Item 합계) |
| 11 | `action_type` (§10) | 23 | `scope` (대상 범위) |
| 12 | `rate` / `rebate_rate` | | |

## 2. 규칙

- **Critical Field 변경 = 기존 승인 자동 재사용 차단**(§4.5). 판정은 **상태값이 아니라 해시 대조**로 한다:
  `critical_field_hash(AT_DECISION 스냅샷)` ≠ `critical_field_hash(집행 직전 현재값)` → **소비 차단 · 재승인 요구**.
- **Non-Critical 필드 변경은 재승인 불요**(예: `note`·`description`) — 과잉 차단 방지. 단 **변경 이력은 §28 History 에 기록**.
- **집행 시 상태만 보는 게이트는 불충분**(`Mapping.php:309` 실측) — **상태 게이트는 보존하되**(비파괴) 해시 대조를 **추가**한다(Golden Rule = Extend, 대체 아님).
- 변경 탐지 결과 처리: 기존 승인 → `SUPERSEDED`(§39) 전이(§29 #20) + **신 Version 생성**(§8) → 재승인 경로. **기존 승인 행 UPDATE·삭제 금지**(Append-only · §4.9).
- **해시 원천은 §30 스냅샷** — 본 정책 전용 스냅샷/버전 저장소 **신설 금지**(중복 금지).
- Critical Field 목록은 **Domain Type 별 확장 가능**(§6) — 단 **목록 축소 금지**(무후퇴).
- **코드변경 0**.
