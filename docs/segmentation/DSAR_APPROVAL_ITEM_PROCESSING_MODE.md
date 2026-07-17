# DSAR — Approval Item 처리 방식 (§16)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §16** — 원문 나열 실측 **지원 10 + 차단 5 = 15**. ✅ REQ 집계 15 와 **개수 일치**.

## 0. 현행 실측 (file:line)

| 현행 | 실측 | 분류 |
|---|---|---|
| 전건 일괄 승인 | `Catalog.php:2350-2357` — `WHERE tenant_id=? AND status='pending_approval'`(+옵션 필터) **벌크 UPDATE**. 행별 분기 **불가** | **MIGRATION_REQUIRED**(ALL_OR_NOTHING 유사·단 의도적 설계 아님) |
| 단건 승인 | `Alerting.php:593` · `AdminGrowth.php:1330` · `Mapping.php:287` — 1행 1결정 | **VALIDATED_LEGACY**(SINGLE) |
| 부분승인 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| 정족수 | `Mapping.php:287` `count($approvals) >= (int)$r["required_approvals"]` — **유일한 실 정족수**(`required_approvals` 컬럼 `Db.php:634` DEFAULT 2) | **CANONICAL_APPROVAL_QUORUM**(승격·재사용) |
| `Alerting` 정족수 | `Alerting.php:562` `"required_approvals" => 2` **리터럴**(DB 컬럼 없음·`Db.php:592-600`) → `:593` **1회 approve = 즉시 approved**. 표시용 장식 | **★MIGRATION_REQUIRED**(UI_API_MISMATCH) |

> **★부분승인 판정**: Item이 부재(grep 0)하므로 부분승인은 **구현 이전에 표현 자체가 불가능**하다.

## 1. 스펙 §16 "지원 처리" 전사 — 원문 실측 **10**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §16 "지원 처리"**

> ✅ **REQ 집계 10 ↔ 원문 실측 10 — 개수 일치.**
>
> 🔴 **그러나 본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다 — 개수만 맞고 항목명 대부분이 날조였다.**
> 초판 10종 중 **원문과 일치하는 것은 `ALL_OR_NOTHING` 1종뿐**이다.
> 초판에만 있던 것: `SINGLE`·`PARTIAL_APPROVAL`·`PER_ITEM_INDEPENDENT`·`GROUPED_BY_TYPE`·`GROUPED_BY_SCOPE`·`THRESHOLD_SPLIT`·`SEQUENTIAL_ITEM`·`BULK_FILTERED`·`CONDITIONAL_ITEM`.
> 원문에만 있는 것: `ITEM_BY_ITEM`·`PARTIAL_APPROVAL_ALLOWED`·`PARTIAL_REJECTION_ALLOWED`·`BUNDLE_DECISION`·`GROUPED_BY_RESOURCE`·`GROUPED_BY_LEGAL_ENTITY`·`GROUPED_BY_CURRENCY`·`GROUPED_BY_RISK`·`CUSTOM`.
> **★개수 일치는 정합의 증거가 아니다**(289차 ② 351 사건의 메커니즘).

**§0 실측: 부분승인 grep 0 · Item 부재 → "부분승인은 구현 이전에 표현 자체가 불가능"** → 아래 판정은 §0 에서만 인용.

| # | 지원 처리 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `ALL_OR_NOTHING` | **부분(비의도적)** — §0 `Catalog.php:2350-2357` 벌크 UPDATE(`WHERE tenant_id=? AND status='pending_approval'`) · 행별 분기 **불가** · **MIGRATION_REQUIRED**(ALL_OR_NOTHING **유사 · 단 의도적 설계 아님**) |
| 2 | `ITEM_BY_ITEM` | **부재** — §0 Item 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 3 | `PARTIAL_APPROVAL_ALLOWED` | **부재** — §0 "부분승인 grep 0" · **NOT_APPLICABLE(신설)** |
| 4 | `PARTIAL_REJECTION_ALLOWED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 5 | `BUNDLE_DECISION` | **부재** — §0 Item·묶음 축 부재 · **NOT_APPLICABLE(신설)** |
| 6 | `GROUPED_BY_RESOURCE` | **부재** — §0 Item 부재 · **NOT_APPLICABLE(신설)** |
| 7 | `GROUPED_BY_LEGAL_ENTITY` | **부재** — Legal Entity 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 8 | `GROUPED_BY_CURRENCY` | **부재** — 승인 도메인 통화축 부재 · **NOT_APPLICABLE(신설)** · §16 차단 1 축 |
| 9 | `GROUPED_BY_RISK` | **부재** — Risk 축 grep 0 · **NOT_APPLICABLE(신설)** |
| 10 | `CUSTOM` | **부재** — §0 Item 부재(확장 슬롯) · **NOT_APPLICABLE(신설)** |

> ⚠️ **초판의 `SINGLE`(단건 승인)은 원문 §16 에 없다.** §0 의 단건 승인 실측(`Alerting.php:593` · `AdminGrowth.php:1330` · `Mapping.php:287` · **VALIDATED_LEGACY**)은 유효하나, **원문에 없는 처리 모드를 분모에 추가하지 않는다**(요구 날조 0 — REQ §16).

## 2. 스펙 §16 "다음은 차단하라" 전사 — 원문 실측 **5**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §16 "다음은 차단하라"**

> ✅ **REQ 집계 5 ↔ 원문 실측 5 — 개수 일치.**
> 🔴 **초판 5종은 원문과 전부 다르다** — 초판(`승인자 신원 미기록 벌크 승인`·`정족수 미충족 즉시 승인`·`Item 무시 Case 일괄 집행`·`승인 범위 초과 Item 집행`·`미승인 Item 집행`)은 **289차가 §0 실측에서 역산한 목록**이었다. 원문은 아래와 같다.

| # | 차단 대상 (원문) | 현행 근거 — §0 실측 인용 |
|---|---|---|
| 1 | **Currency가 다른 Item의 금액 단순 합산** | §0 미열거(Item·통화축 부재). ※인접: `fxToKrw`(Connectors.php:1749) **하드코딩 환율+캐시** — 승인 시점 환율 고정 없음 · **NOT_APPLICABLE(신설)** |
| 2 | **다른 Tenant Item 병합** | §0 미열거(Item 부재). ※인접 실측: `admin_growth_approval` **tenant_id 부재**(AdminGrowth.php:142-149) → 전역 조회 · **★MIGRATION_REQUIRED**(헌법: 테넌트 격리 절대) |
| 3 | **다른 Legal Entity Payout Item 무분별한 통합** | Legal Entity 레지스트리 **부재(grep 0)** → **구분할 수단조차 없음** · **NOT_APPLICABLE(부재 → 신설)** |
| 4 | **승인되지 않은 Item의 전체 Case 승인 처리** | §0 미열거(Item·Case 부재). ※인접: `Catalog::approveQueue` `:2341-2364` 벌크 전이가 **묶음 id 없이** 조건 일괄 승인 · **MIGRATION_REQUIRED** |
| 5 | **Partial Approval Policy 없이 일부만 실행** | §0 "부분승인 **grep 0**" → 현재는 **표현 자체가 불가능** · **NOT_APPLICABLE(신설)** |

> ⚠️ **초판이 기록했던 §0 실측 근거는 삭제하지 않고 §0 과 §3 규칙에 보존**된다 — `Alerting.php:562` 가짜 정족수(**★MIGRATION_REQUIRED** · UI_API_MISMATCH) · `Alerting.php:612` status 미판독(**VACUOUS**) · `Catalog.php:2341-2364` 승인자 신원 미기록. **이들은 원문 §16 차단 5 항목이 아니라 §0 실측**이며, 축을 섞지 않는다.

## 3. 규칙

차단 5는 **Runtime Guard 강제**(정본 = `DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md` §47). **차단 5(`Alerting::executeAction`)는 VACUOUS** — 생산자 부재로 현재 도달 불가이므로 **P0 단정 금지**(287차 죽은 스켈레톤 교훈: 생산자 없는 경로를 실장애로 보고하지 말 것). 단 **생산자가 생기는 순간 실 취약점**이 되므로 Foundation 이관 시 status 판독 **필수**. `Mapping.php:287` 정족수 로직을 **재사용**(신설 금지·Golden Rule = Extend). **코드변경 0**.
