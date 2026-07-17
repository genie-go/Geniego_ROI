# DSAR — Approval Actor (§20·필드 22 · Actor Type 8종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **★이 도메인은 부재가 아니다 — 정본 패턴이 289차에 이미 존재한다(Mapping). 문제는 미전파다.**
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §20 — 원문 그대로 전사.
> **분모 정합**: REQ 집계 필드 22 · Actor Type 8 ↔ **원문 실측 22 / 8 — 양축 일치**.

## 0. 현행 실측 (file:line)

| 구현 | 신원 도출 | 분류 |
|---|---|---|
| **`Mapping::actorId`** `Handlers/Mapping.php:36-53` — ①`auth_key`(미들웨어가 key_hash SHA-256 검증 후 주입한 api_key 행 · `public/index.php:591-593`) → `apikey:{id}` ②`UserAuth::authedUser`(user_session JOIN app_user) → `user:{email}` ③**미확인 → `null`** | **위조불가**(전부 서버측 도출) | **★CANONICAL_APPROVAL_ACTOR**(정본 승격) |
| `Mapping::actor` `:55-58` = `actorId() ?? 'unknown'` | 감사 표기 전용 | **KEEP_SEPARATE_WITH_REASON**(무회귀 로깅 · **판정 사용 금지**) |
| `Mapping::approve` `:238-294` | `actorId()` null → **403**(`:246-250`) · 자기승인 **403**(`:268-271`) · 동일 행위자 재승인 **409**(`:278-283`) · pending 아니면 **409**(`:262-265`) · `count >= required_approvals`(`:287`) | **VALIDATED_LEGACY**(재사용) |
| 🔴 **`Alerting::actor`** `Handlers/Alerting.php:33-36` — `X-User-Email` **헤더** ?: `?actor=` **쿼리** ?: `'unknown'` | **클라이언트 위조 가능** | **★MIGRATION_REQUIRED** |
| 🔴 `Alerting::decideAction` `:572-599` | **1회 approve → 즉시 `approved`**(`:593`) · 정족수·자기승인·dedup **전무** | **MIGRATION_REQUIRED** |
| 🔴 `Alerting::listActionRequests` `:562` | `"required_approvals" => 2` **하드코딩 리터럴**(DB 컬럼 없음) | **가짜녹색**(표시≠실제) |
| 🔴 `Alerting::executeAction` `:601-660` | `:612` status **SELECT 하나 미판독** → pending/rejected 도 `AdAdapters::pause`(`:631`)/`updateBudget`(`:634`) 실집행 | **승인 우회** · 단 `INSERT INTO action_request` **grep 0 = 생산자 전무 → 도달 불가**(**VACUOUS**) |
| `AdminGrowth::approvalDecide` `Handlers/AdminGrowth.php:1313-1343` | `self::actor`(`:195-199`)=세션 도출이나 **미인증 시 리터럴 `'admin'` 폴백** · 단일 `decided_by` · `SELECT ... WHERE id=?` **tenant 스코프 없음**(`:1325`) | **MIGRATION_REQUIRED** |
| `Catalog::approveQueue` `Handlers/Catalog.php:2341-2364` | **승인자 신원 미기록**(UPDATE만 · 감사 호출 없음) | **MIGRATION_REQUIRED** |

**Actor Type 구분 자체가 부재**(`actor_type` grep 0). 현행은 `apikey:` / `user:` **접두 문자열**로만 암묵 구분(`Mapping.php:41,47,49`).

## 1. Actor = 실제 결정을 내린 위조불가 신원

### 1-1. 스펙 §20 필수 필드 — 원문 전사 (실측 22 · REQ 22 **일치**)

`APPROVAL_ACTOR` — 실제 Decision 을 내리거나 Approval Event 를 수행한 Actor 를 기록한다.

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_actor_id` | 12 | `acting_assignment_id` |
| 2 | `subject_id` | 13 | `acting_scope` |
| 3 | `actor_type` | 14 | authentication assurance |
| 4 | `canonical_identity_id` | 15 | MFA state |
| 5 | `tenant_id` | 16 | session reference |
| 6 | `workspace_id` | 17 | device reference |
| 7 | `organization_id` | 18 | network zone |
| 8 | `legal_entity_id` | 19 | risk reference |
| 9 | `environment` | 20 | `acted_at` |
| 10 | `acting_role_id` | 21 | `status` |
| 11 | `acting_role_version_id` | 22 | `evidence` |

**현행 커버리지 = 22 중 2**(원문 대조 후 확정):
- **#2 `subject_id`** — `Mapping::actorId`(`Mapping.php:36-53`) 가 `apikey:{id}`/`user:{email}` 로 **위조불가 도출**(부분 충족 · 정규화된 식별자 아님).
- **#20 `acted_at`** — `approvals_json[].ts`(`Mapping.php:285`) 로 기록.
- 나머지 20 축(#3 `actor_type` · #4 `canonical_identity_id` · #10~13 acting_role/assignment/scope · #14~19 assurance/MFA/session/device/network/risk · #22 evidence 등) = **grep 0 부재**.
- #5 `tenant_id` 는 `mapping_change_request` 행에는 있으나(`Db.php:623-636`) **Actor 축의 필드가 아님** → 산입 불가.

### 1-2. 서술 요구 대비 판정

스펙 §20 의 **서술 요구 1건은 원문에 명시**돼 있다:

> 스펙 §20 원문: **"고위험 Human Approval 을 Service Account 가 대신 결정하지 못하게 한다."**

### 1-3. 스펙 §20 Actor Type — 원문 전사 (실측 8 · REQ 8 **일치**)

| # | Actor Type | # | Actor Type |
|---|---|---|---|
| 1 | `HUMAN` | 5 | `POLICY_ENGINE` |
| 2 | `SERVICE_ACCOUNT` | 6 | `EXTERNAL_PARTY` |
| 3 | `SYSTEM` | 7 | `EMERGENCY_OPERATOR_REFERENCE` |
| 4 | `AUTOMATION` | 8 | `OTHER` |

**현행 커버리지 = 8 중 0종 (열거형 부재).** 단 `Mapping.php:41,47,49` 의 접두 문자열은 원문 **#1 `HUMAN`**(`user:`)과
**#2 `SERVICE_ACCOUNT`**(`apikey:`)에 **의미상 대응하는 재료**가 이미 있음을 보인다 — **재료는 있고 열거형·게이트가 없다**.

**현행 대비 판정 = 불만족.** 근거: actor_type 구분이 없어 `apikey:{id}`(서비스 계정)와 `user:{email}`(사람)이
`Mapping::approve` 에서 **동등하게 정족수 1로 계수**된다(`:285-287`). 즉 API 키 2개로 Maker-Checker 충족 가능.
접두 문자열은 존재하나 **판정에 쓰이지 않는다** — 재료는 있고 게이트가 없다.

## 2. 규칙

- **`Mapping::actorId` 패턴을 전 승인 경로의 정본으로 승격**한다 — 신규 Actor 도출기 신설 금지(Golden Rule = Extend).
- **`Alerting::actor` 는 동일 결함**(289차 Mapping 이 고친 바로 그것)**이 미전파된 상태** — 클라이언트 헤더 신뢰 폐기 대상.
- **신원 미확인 = 403 fail-closed**. `'unknown'`·`'admin'` 등 **리터럴 폴백으로 얼버무리기 금지**(`Mapping.php:51-52` 원칙).
- **Actor Type 게이트 신설 전까지 "Service Account 차단" 을 표시하지 말 것**(가짜녹색).
- `Alerting::executeAction` 은 **VACUOUS**(생산자 부재) — **"있다고 가정하고 배선 금지"**(287차 죽은 스켈레톤). 수정은 생산자 배선 여부 결정 후.
- 실 구현·발송경로 수정 = **별도 승인 세션**. 본 문서는 코드변경 0.
