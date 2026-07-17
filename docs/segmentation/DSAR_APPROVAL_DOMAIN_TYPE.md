# DSAR — Approval Domain Type (§6)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — 도메인별 승인 존재 여부

| 도메인 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| **Mapping**(canonical value 변경) | `mapping_change_request` + `Mapping::approve` **Mapping.php:238-294** — 위조불가 actor(`actorId` :36-53) · pending 검증 · 자기승인 403 · dedup 409 · `count>=required_approvals` 정족수 · `apply` status 게이트(:309) | **VALIDATED_LEGACY**(유일 REAL maker-checker · **참조 원형**) |
| **Agency Access**(대행사↔클라이언트 위임) | `agency_client_link` status pending→approved→revoked · **매 요청 approved 재검증 fail-closed**(AgencyPortal.php:24,80) | **VALIDATED_LEGACY** |
| **Campaign/Action**(광고 집행) | `action_request`(Db.php:592-600) · `Alerting::decideAction` :572-599 — **1회 approve→즉시 approved**(정족수·자기승인·dedup 전무) · actor = 클라이언트 `X-User-Email` 헤더 **위조가능**(:33-36) · `executeAction` :601-660 이 `status` SELECT(:612)하나 **미독** → 승인 우회. **단 `INSERT INTO action_request` grep 0 = 생산자 전무 → 도달 불가** | **MIGRATION_REQUIRED**(취약) · 집행경로 **VACUOUS** |
| **Catalog Writeback** | 실 SSOT = `catalog_writeback_job.status='pending_approval'`. `catalog_writeback_approval`(Catalog.php:86-94)은 **고아 테이블** — 읽는 코드 0(CREATE :86/:126 + 자인 주석 :2269-2272 뿐) | **CONSOLIDATION_REQUIRED**(고아 제거) |
| **Admin Growth** | `admin_growth_approval`(AdminGrowth.php:142-149) — **tenant_id 없음 · 단일 결재**(decided_by 1인) | **MIGRATION_REQUIRED** |
| **Budget** | `routes.php:1868` `/v384/budget/requests/{id}/approve` — **핸들러 부재 · 템플릿 501 폴백**(:1821-1827) | **팬텀 라우트** · **NOT_APPLICABLE(신설)** |
| **Recon Report** | `routes.php:1943,1953,1967,1998,2059` approve — **동일 팬텀** | **팬텀 라우트** · **NOT_APPLICABLE(신설)** |
| **Funding · Claim · Settlement · Payout · Refund · Contract · Migration** | **부재(grep 0)** | **NOT_APPLICABLE(부재 → 신설)** |
| **REBATE_\*** | **부재(backend/src·frontend/src grep 0)** — ★**승인 대상 엔티티 자체가 코드에 0**. Rebate 는 현재 **문서에만 존재** | **NOT_APPLICABLE(전방호환 계약)** |

### 0-1. 공통 결함 (도메인 무관)

| 항목 | 실측 | 분류 |
|---|---|---|
| `audit_log` | `Db.php:540-546` — `id, actor, action, details_json, created_at`. **tenant_id 없음 · 해시체인 없음**(해시체인은 `menu_audit_log` 전용 — AdminMenu.php:123-131) | **MIGRATION_REQUIRED** |
| Workflow/State Machine/BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions | **backend/src grep 0** | **NOT_APPLICABLE(신설)** |
| `TeamPermissions::ACTIONS` 의 `'approve'`(:39) | 데이터만 존재 · **검사 호출부 grep 0 = 고아** | **MIGRATION_REQUIRED** |

## 1. 스펙 §6 Domain Type 전사 — 원문 실측 **32종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §6**

> 🔴 **REQ 집계 31 ↔ 원문 실측 32 — 원문이 정본.**
> REQ `§7` 표의 *"§6 Approval Domain Type = **31**"* 은 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 32).
> **숫자를 조용히 맞추지 않는다** — 맞추는 순간 그것이 **289차 ② 351 사건의 재현**(근거 없는 숫자가 복제돼 정본이 됨)이다.
> 본 문서는 **원문 나열을 그대로 전사**하며, **REQ 집계 정정은 별도 승인 사항**이다(본 세션 REQ 무수정).

**현행 존재 여부 판정은 §0 실측에서만 인용한다**(신규 판정 생성 0). §0 에 해당 행이 없으면 **판정 유보**로 표기한다.

| # | Domain Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `REBATE_PROGRAM` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE(전방호환 계약)** |
| 2 | `REBATE_PROGRAM_VERSION` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 3 | `REBATE_PROGRAM_ACTIVATION` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 4 | `REBATE_PROGRAM_TERMINATION` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 5 | `REBATE_PROGRAM_MIGRATION` | **부재** — §0 `REBATE_*` grep 0 + §0 `Migration` 부재(grep 0) · **NOT_APPLICABLE** |
| 6 | `REBATE_PROGRAM_RESTORATION` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 7 | `REBATE_FUNDING` | **부재** — §0 `REBATE_*` grep 0 + §0 `Funding` 부재(grep 0) · **NOT_APPLICABLE** |
| 8 | `REBATE_FUNDING_ALLOCATION` | **부재** — §0 `REBATE_*` grep 0 + §0 `Funding` 부재 · **NOT_APPLICABLE** |
| 9 | `REBATE_BUDGET` | **부재** — §0 `REBATE_*` grep 0. ※§0 `Budget` 행(팬텀 라우트)은 **Rebate 도메인이 아니다**(축 혼동 금지) · **NOT_APPLICABLE** |
| 10 | `REBATE_COMMITMENT` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 11 | `REBATE_CLAIM` | **부재** — §0 `REBATE_*` grep 0 + §0 `Claim` 부재(grep 0) · **NOT_APPLICABLE** |
| 12 | `REBATE_CLAIM_ADJUSTMENT` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 13 | `REBATE_ACCRUAL` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 14 | `REBATE_ACCRUAL_ADJUSTMENT` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 15 | `REBATE_SETTLEMENT` | **부재** — §0 `REBATE_*` grep 0 + §0 `Settlement` 부재(grep 0) · **NOT_APPLICABLE** |
| 16 | `REBATE_CREDIT_MEMO` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 17 | `REBATE_DEBIT_MEMO` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 18 | `REBATE_PAYOUT` | **부재** — §0 `REBATE_*` grep 0 + §0 `Payout` 부재(grep 0) · **NOT_APPLICABLE** |
| 19 | `REBATE_PAYOUT_REVERSAL` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 20 | `REBATE_RECOVERY` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 21 | `REBATE_DISPUTE` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 22 | `REBATE_CONTRACT` | **부재** — §0 `REBATE_*` grep 0 + §0 `Contract` 부재(grep 0) · **NOT_APPLICABLE** |
| 23 | `REBATE_PROVIDER_CHANGE` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 24 | `REBATE_ACCESS_REQUEST` | **부재** — §0 `REBATE_*` grep 0. ※인접 실측 = §0 `Agency Access`(**VALIDATED_LEGACY**)이나 **Rebate 도메인 아님**(승격 여부는 별도 판단) · **NOT_APPLICABLE** |
| 25 | `REBATE_POLICY_CHANGE` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 26 | `REBATE_EMERGENCY_ACTION` | **부재** — §0 `REBATE_*` grep 0 · **NOT_APPLICABLE** |
| 27 | `CAMPAIGN` | **존재(취약)** — §0 `Campaign/Action` = `action_request`(Db.php:592-600) · `Alerting::decideAction` :572-599 · **MIGRATION_REQUIRED** · 집행경로 **VACUOUS**(생산자 전무) |
| 28 | `MARKETING_BUDGET` | **팬텀** — §0 `Budget` = `/v384/budget/requests/{id}/approve` **핸들러 부재 · 501 폴백**(routes.php:1868 · :1821-1827) · **NOT_APPLICABLE(신설)** |
| 29 | `REFUND` | **부재** — §0 `Refund` 부재(grep 0) · **NOT_APPLICABLE(부재 → 신설)** |
| 30 | `CONTRACT` | **부재** — §0 `Contract` 부재(grep 0) · **NOT_APPLICABLE(부재 → 신설)** |
| 31 | `DATA_EXPORT` | ⚠️ **판정 유보** — §0 에 대응 실측 행 **없음**. 별도 실측 전까지 존재/부재 단정 금지(§0 무근거 판정 생성 0) |
| 32 | `CUSTOM` | ⚠️ **판정 유보** — 확장 슬롯. §0 에 대응 실측 행 **없음** |

### 1-1. 역방향 커버리지 — §0 실측 중 §6 에 대응 Domain Type 이 없는 것

**§0 의 현행 승인 구현 5건은 스펙 §6 32종 어디에도 직접 대응하지 않는다.**

| §0 실측 | §6 대응 | 비고 |
|---|---|---|
| **Mapping**(`mapping_change_request` · **유일 REAL maker-checker · 참조 원형**) | **없음** | `CUSTOM`(32) 수용 후보 — **단정 아님**(스펙 미지정) |
| **Agency Access**(`agency_client_link`) | **없음** | `REBATE_ACCESS_REQUEST`(24)와 **도메인 상이** |
| **Catalog Writeback**(`catalog_writeback_job`) | **없음** | `CUSTOM`(32) 수용 후보 |
| **Admin Growth**(`admin_growth_approval`) | **없음** | `CUSTOM`(32) 수용 후보 |
| **Recon Report**(팬텀 라우트 5건) | **없음** | 501 폴백 — 구현으로 계산 금지 |

> ⚠️ **위 "수용 후보"는 스펙 원문 근거가 아니라 289차 관찰**이다. **Domain Type 배정은 별도 승인 사항**이며, 여기서 확정하면 역산(REQ §15)이 된다.

## 2. 규칙

- **Rebate 전용 Approval Entity 복제 금지**(스펙 §5 단서) — 공통 Canonical Foundation + Domain Type 확장. **`REBATE_*` 승인 대상이 코드에 0인 현 시점에 Rebate 승인 테이블 선행 신설 = 287차 "죽은 스켈레톤" 재발**.
- **참조 원형 = `Mapping::approve`**(유일 REAL). 신규 Domain Type 은 **이것을 확장**하지 신설하지 않는다(헌법 Golden Rule = Extend).
- **팬텀 approve 라우트(budget·recon 6개)를 "구현됨"으로 계산 금지** — 501 폴백이다.
- **`NOT_APPLICABLE` 을 "있다고 가정"하고 배선 금지**(287차 교훈).
