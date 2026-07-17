# DSAR — Approval Critical Field 변경 정책 (§31)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §31 — 원문 그대로 전사.
> 🔴 **분모 불일치**: **REQ 집계 23 ↔ 원문 실측 22 — 원문이 정본.** (REQ **과다** 집계.) REQ §7 의 `23` 은 정정 대상 — 숫자 임의 정합 금지.

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

> **🔴 판정 — 스펙 §31 요구 대비 0/22 충족**(원문 실측 22 기준 · 289차 표기 `0/23` 은 REQ 과다집계에 따른 것 · **충족 0 은 불변**).
> 현행에서는 **금액을 10만원으로 승인받은 뒤 1억으로 고쳐도 그 승인이 그대로 소비된다.**
> 막는 코드가 없다(감지 0 · 재승인 0 · 스냅샷 대조 0). Rebate 는 **금전 도메인**이므로 이 결함은 §45 Critical Gap 후보다.
> ※ 단, `REBATE_*` 코드는 **전면 부재(grep 0)** 이므로 현재 **실피해 미도달**(P 등급 단정은 PM 코드 재증명 후).

## 1. Critical Field (22) — 원문 전사

> 스펙 §31 원문 도입부: **"다음 변경은 기본적으로 기존 승인 재사용을 차단하거나 재승인을 요구한다."**

원문 순서 그대로(좌 1~11 · 우 12~22):

| # | Critical Field | # | Critical Field |
|---|---|---|---|
| 1 | Tenant | 12 | Funding Allocation |
| 2 | Workspace | 13 | Contract |
| 3 | Legal Entity | 14 | Settlement Destination |
| 4 | Program | 15 | Payout Destination Reference |
| 5 | Program Version | 16 | Provider Account |
| 6 | Requested Action | 17 | Environment |
| 7 | Amount | 18 | Effective Date |
| 8 | Currency | 19 | Migration Source |
| 9 | Beneficiary | 20 | Migration Target |
| 10 | Claimant | 21 | Data Export Scope |
| 11 | Funding Party | 22 | Sensitive Data Classification |

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder(23행)는 **DB 컬럼명으로 자작**했고 원문은 **업무 개념 목록**이다. 주요 상이:

| placeholder(자작·폐기) | 원문 §31 | 성격 |
|---|---|---|
| `payee_id` · `payee_bank_account` | **Beneficiary**(#9) · **Payout Destination Reference**(#14) · **Settlement Destination**(#13) | 개념↔컬럼 혼동 · 원문이 **더 넓음** |
| `rate`/`rebate_rate` · `discount_rate` · `cost_center` · `tax_treatment`/`vat_flag` · `item_count` · `total_amount` · `resource_id` · `resource_type` | **없음** | **자작**(원문 미포함) |
| `effective_from` · `effective_to` | **Effective Date**(#17) 1축 | 축 분해 자작 |
| — | **Program Version**(#5) · **Claimant**(#10) · **Funding Party**(#11) · **Funding Allocation**(#12) · **Provider Account**(#15) · **Migration Source/Target**(#18/#19) · **Data Export Scope**(#20) · **Sensitive Data Classification**(#21) | **원문에 있으나 placeholder 전면 누락** |

⇒ **원문이 정본.** 특히 **Migration Source/Target · Data Export Scope · Sensitive Data Classification** 은 placeholder 에 없던 **DSAR·마이그레이션 축**으로, 본 EPIC(DSAR) 맥락에서 결정적이다. `rate`·`vat_flag` 등 자작 컬럼은 요구 분모에서 **폐기**한다(§6 Domain Type 별 확장은 별도 근거 필요).

## 2. 규칙

- **Critical Field 변경 = 기존 승인 자동 재사용 차단**(§4.5). 판정은 **상태값이 아니라 해시 대조**로 한다:
  `critical_field_hash(AT_DECISION 스냅샷)` ≠ `critical_field_hash(집행 직전 현재값)` → **소비 차단 · 재승인 요구**.
- **Non-Critical 필드 변경은 재승인 불요**(예: `note`·`description`) — 과잉 차단 방지. 단 **변경 이력은 §28 History 에 기록**.
- **집행 시 상태만 보는 게이트는 불충분**(`Mapping.php:309` 실측) — **상태 게이트는 보존하되**(비파괴) 해시 대조를 **추가**한다(Golden Rule = Extend, 대체 아님).
- 변경 탐지 결과 처리: 기존 승인 → `SUPERSEDED`(§39) 전이(§29 #20) + **신 Version 생성**(§8) → 재승인 경로. **기존 승인 행 UPDATE·삭제 금지**(Append-only · §4.9).
- **해시 원천은 §30 스냅샷** — 본 정책 전용 스냅샷/버전 저장소 **신설 금지**(중복 금지).
- Critical Field 목록은 **Domain Type 별 확장 가능**(§6) — 단 **목록 축소 금지**(무후퇴).
- **코드변경 0**.
