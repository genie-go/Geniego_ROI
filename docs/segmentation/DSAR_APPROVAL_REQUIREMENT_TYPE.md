# DSAR — Approval Requirement Type (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §17 "Requirement Type"** — 원문 나열 실측 **20종**. ✅ REQ 집계 20 과 **개수 일치**.

## 0. 현행 실측 (file:line)

| 현행에 존재하는 요건 유형 | 실측 | 분류 |
|---|---|---|
| **정족수**(N명 승인) | `Db.php:634` `required_approvals INT DEFAULT 2` → `Mapping.php:287` `count>=required_approvals` | **CANONICAL_APPROVAL_REQUIREMENT_TYPE**(QUORUM · 승격·재사용) |
| **자기승인 금지**(Maker-Checker) | `Mapping.php:268-271` — `requested_by === $actor` → **403** | **CANONICAL**(SEGREGATION_OF_DUTIES · 승격) |
| **행위자 중복 금지**(dedup) | `Mapping.php:278-283` — 동일 `user` 재승인 → **409** | **CANONICAL**(DISTINCT_APPROVER · 승격) |
| **행위자 신원 확인** | `Mapping.php:246-250` — `actorId()` null → **403 fail-closed**(289차 G-01) | **CANONICAL**(IDENTITY_RESOLVED · 승격) |
| **선행 상태 요건** | `Mapping.php:262-265` `status!=='pending'` → 409 · `Mapping.php:309` `status!=='approved'` → 400 · `FeedTemplate.php:248-285` `must_approve_first` 409 | **CANONICAL**(PRECONDITION_STATE · 승격) |
| **플랜/권한 게이트** | `Catalog.php:2343` `requirePro` · `AdminGrowth.php:1301-1302` `requirePlan('admin')`+`requireSubAdminMenu` | **KEEP_SEPARATE_WITH_REASON**(**인가 ≠ 승인 요건**·§4.7) |
| **재검증 fail-closed** | `AgencyPortal.php:365-384` approved+scope_json · **매 요청 approved 재검증**(`:427`) | **VALIDATED_LEGACY**(재사용) |
| 금액 임계·통화·기한·Evidence 요건 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |

> **★현행 요건 유형은 전부 `Mapping::approve`(`:238-294`) 한 곳에 집중** — 유일한 REAL maker-checker. 나머지 3경로는 요건 유형 **0종**.

## 1. 스펙 §17 Requirement Type 전사 — 원문 실측 **20종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §17 "Requirement Type"**

> ✅ **REQ 집계 20 ↔ 원문 실측 20 — 개수 일치.**
>
> 🔴 **그러나 본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다 — 개수만 맞고 항목명이 20/20 전부 날조였다.**
> ★**본 문서는 19편 중 날조 정도가 가장 심하다.** 초판은 **요건의 "판정 규칙"**(`QUORUM_COUNT`·`SEGREGATION_OF_DUTIES`·`DISTINCT_APPROVER`·`IDENTITY_RESOLVED`·`PRECONDITION_STATE`·`AMOUNT_THRESHOLD`·`CURRENCY_MATCH`·`TENANT_MATCH`·`POLICY_VERSION_PINNED`·`SNAPSHOT_REQUIRED`·`IDEMPOTENCY_REQUIRED`·`TIME_WINDOW` 등)을 나열했으나,
> **원문 Requirement Type 은 "누가 승인해야 하는가"(승인 주체 유형)** 다 — `MANAGER`·`FINANCE`·`LEGAL`·`COMPLIANCE`·`SECURITY`·`RISK`·`ACCOUNTING`·`TREASURY`·`AUDITOR`·`EXECUTIVE` 등.
> ⇒ **초판은 축 자체가 다른 목록**이었다. 개수(20)만 REQ 에 맞춰져 있었을 뿐이다 — **289차 ② 351 사건의 전형**.

**§0 실측: 현행 요건 유형은 전부 `Mapping::approve`(:238-294) 한 곳에 집중** — 그러나 그것들은 **판정 규칙**이지 **원문의 승인 주체 유형이 아니다**. 따라서 아래 20종은 **전부 부재**다.

| # | Requirement Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `MANAGER` | **부재** — §0 승인 주체 유형 축 없음(§0 실측은 전부 판정 규칙) · **NOT_APPLICABLE(신설)** |
| 2 | `RESOURCE_OWNER` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 3 | `PROGRAM_OWNER` | **부재** — `REBATE_*` grep 0(Program 부재) · **NOT_APPLICABLE(전방호환)** |
| 4 | `FINANCE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 5 | `LEGAL` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 6 | `COMPLIANCE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 7 | `SECURITY` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 8 | `RISK` | **부재** — Risk 축 grep 0 · **NOT_APPLICABLE(신설)** |
| 9 | `ACCOUNTING` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 10 | `TREASURY` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 11 | `DATA_OWNER` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 12 | `TENANT_ADMIN` | **부재(Requirement 축)** — ※인접: `AdminGrowth.php:1301-1302` `requirePlan('admin')` — 단 §0 판정 **KEEP_SEPARATE_WITH_REASON**(**인가 ≠ 승인 요건** · §4.7) |
| 13 | `WORKSPACE_ADMIN` | **부재** — Workspace 레지스트리 부재(실체 = `tenant_kv`) · **NOT_APPLICABLE(신설)** |
| 14 | `PLATFORM_ADMIN` | **부재(Requirement 축)** — ※인접: `Catalog.php:2343` `requirePro` — §0 판정 **KEEP_SEPARATE_WITH_REASON**(인가 축) |
| 15 | `CUSTOMER` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 16 | `PARTNER` | **부재(Requirement 축)** — ※인접: `AgencyPortal.php:365-384,427` 대행사 위임(**VALIDATED_LEGACY** · 재사용) — 단 승인 주체 유형 아님 |
| 17 | `PROVIDER` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 18 | `AUDITOR` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 19 | `EXECUTIVE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 20 | `CUSTOM` | **부재** — §0 동일(확장 슬롯) · **NOT_APPLICABLE(신설)** |

### 1-1. §0 실측 요건 유형은 어디로 가는가 — **삭제 아님 · 축 재배치**

§0 이 기록한 **REAL 구현 5건**은 원문 §17 Requirement Type 이 **아니라** 원문의 **다른 필드**에 대응한다(축 정정 · §0 실측 보존).

| §0 실측 (REAL) | 원문 대응 축 |
|---|---|
| **정족수** `Db.php:634` → `Mapping.php:287` · **승격·재사용** | §17 필드 **17 `required approval count`**(Type 아님) |
| **자기승인 금지** `Mapping.php:268-271` → 403 · **승격** | §17 필드 **20 `decision mode`** 계열 / §4.6 · **원문 §17 Type 아님** |
| **행위자 중복 금지** `Mapping.php:278-283` → 409 · **승격** | 동일(판정 규칙 축) |
| **행위자 신원 확인** `Mapping.php:246-250` → 403 fail-closed(289차 G-01) · **승격** | §11 Context / §20 Actor 축 |
| **선행 상태 요건** `Mapping.php:262-265` · `:309` · `FeedTemplate.php:248-285` · **승격** | §27/§29 상태 전이 축 |

> ⚠️ **위 대응은 289차 관찰이며 스펙 원문 근거가 아니다** — 확정 시 역산(REQ §15). **§0 의 REAL 판정(승격·재사용 대상)은 그대로 유효**하며, 본 전사로 **삭제되지 않는다**(무후퇴).
> ★**`Mapping::approve` 가 유일 REAL maker-checker**라는 §0 판정은 유지된다 — 재구현 금지 · **확장**(Golden Rule = Extend).

## 2. 규칙

**§4.7 준수**: 6·7·11은 **인가(Authorization)와 승인 요건이 겹치는 축**이나, **Deny(403)와 Rejection은 다른 결과**다 — `requirePro`/`requirePlan`을 Requirement로 승격하지 말 것(KEEP_SEPARATE). **1~5는 이미 REAL 구현이 존재**하므로 **재구현 금지·`Mapping::approve` 확장**(Golden Rule = Extend·중복 신설 금지). **NOT_APPLICABLE 11종을 "있다고 가정"하고 배선 금지**(287차). **코드변경 0**.
