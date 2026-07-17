# DSAR — Approval Policy Reference (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §33 필드 = 14 · Policy Type = 13). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 대조표 (file:line)

| 현행 | 실측 | 분류 |
|---|---|---|
| **`action_request.policy_id` → `alert_policy`** | `Db.php:592-600`(policy_id INT) → `alert_policy`(`Db.php:558`) — **현행 유일한 policy reference 유사물**. 단 **알림 정책**이지 승인 정책 아님 · **버전 없음** · FK 제약 없음 | **★`LEGACY_ADAPTER`** |
| **`PlanPolicy`** | `PlanPolicy.php:17,20,28` — **PHP const 배열**(기능키→최소 플랜). **버전 없음 · DB 아님 · 배포로만 변경** · 🔴 **fail-open**(`:12` 주석 자인) | **LEGACY_ADAPTER** + **MIGRATION_REQUIRED**(fail-open ↔ Deny-by-default 상충) |
| `acl_permission` | `TeamPermissions.php:152,169` — **menu_key 기반 메뉴 게이팅**(레코드 권한 아님) | **KEEP_SEPARATE_WITH_REASON**(인가 ≠ 승인 정책) |
| `mapping_change_request.required_approvals` | `Db.php:623-636` INT DEFAULT 2 · **실사용**(`Mapping.php:288` 정족수 판정) — **정책이 데이터로 존재하는 유일 사례**. 단 **행별 컬럼**이지 정책 엔티티 아님 | **LEGACY_ADAPTER**(정족수 원천) |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — policy 참조 **없음** | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2341-2364` — policy 참조 **없음** | **NOT_APPLICABLE** |
| **Policy Version** | **부재(grep 0)** | **NOT_APPLICABLE(부재 → 신설)** |
| APPROVAL_POLICY_REFERENCE | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |

### 0-1. 🔴 Policy Version 부재 → **승인 근거 재현 불가**

정책이 **버전 없이 제자리 변경**되므로(`alert_policy` 행 UPDATE · `PlanPolicy` const 배포 교체),
**"이 승인은 어떤 규칙에 근거했는가"** 를 사후에 **증명할 수 없다**. 승인 시점 정책 원문이 어디에도 고정되지 않는다.
⇒ 감사·분쟁 시 **승인 정당성 입증 불가** — 금전(Rebate) 도메인에서 §45 Critical Gap 후보.
※ `PlanPolicy` 는 **PHP const** 라 **DB 조회로도 과거 값 복원 불가**(git 이력 외 수단 없음).

## 1. Policy Type (13)

| # | 타입 | # | 타입 |
|---|---|---|---|
| 1 | `APPROVAL_REQUIREMENT_POLICY` (승인 필요 여부) | 8 | `SEGREGATION_OF_DUTY_POLICY` (자기승인 금지 — `Mapping.php` 403 선례) |
| 2 | `QUORUM_POLICY` (정족수 — `required_approvals` 승격) | 9 | `DELEGATION_POLICY` (5-3-8 위임) |
| 3 | `THRESHOLD_POLICY` (금액 임계 — 5-3-5) | 10 | `EXPIRY_POLICY` (승인 유효기간) |
| 4 | `ROUTING_POLICY` (승인자 결정 — 5-3-4) | 11 | `CONSUMPTION_POLICY` (§41 소비 조건) |
| 5 | `ESCALATION_POLICY` (5-3-6) | 12 | `CRITICAL_FIELD_POLICY` (§31) |
| 6 | `RISK_POLICY` (5-3-5) | 13 | `NOTIFICATION_POLICY` (**`alert_policy` 흡수 지점**) |
| 7 | `PLAN_ENTITLEMENT_POLICY` (`PlanPolicy` 흡수) | | |

> ⚠️ #3~#6·#9 는 **후속 블록(5-3-4/5/6/8) 소관** — 본 블록은 **참조 계약만** 정의하고 **구현 금지**(중복 구현 금지 · REQ §0-1).

## 2. CANONICAL_APPROVAL_POLICY_REFERENCE 필드 (14)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `policy_reference_id` | PK |
| 2 | `tenant_id` | 격리 필수 |
| 3 | `request_id` / 4 `case_id` | FK(§7/§12) |
| 5 | `policy_type` | 위 13종 |
| 6 | `policy_id` | **`action_request.policy_id` 어댑터 수용**(`Db.php:592-600`) |
| 7 | `policy_source` | `DB` \| `CONST`(`PlanPolicy.php`) \| `EXTERNAL` — **원천 정직 표기** |
| 8 | `policy_version` | **★신설 · 필수**(현행 grep 0) |
| 9 | `policy_content_hash` | sha256 — 제자리 변경 탐지 |
| 10 | `policy_snapshot_json` | **승인 시점 정책 원문 고정**(재현성 핵심) |
| 11 | `evaluation_result` | `REQUIRED` \| `NOT_REQUIRED` \| `INDETERMINATE` |
| 12 | `evaluation_reason_code` | §24 재사용 |
| 13 | `bound_at` | 정책 바인딩 시각 |
| 14 | `bound_by` | 서버해석 actor(`Mapping.php:36-53` 패턴) |

## 3. 규칙

- **Immutable · Append-only**(§4.9) — 정책이 나중에 바뀌어도 **바인딩된 참조는 불변**.
- **`policy_version` + `policy_snapshot_json` 없는 승인은 근거 미기록으로 간주**(§4.4) — 재현 불가한 승인은 감사 대상.
- 🔴 **Fail-closed 강제**: `evaluation_result=INDETERMINATE` → **승인 필요로 간주**(차단). `PlanPolicy.php:12` 의 **fail-open 을 승인 도메인에 복제 금지**(§4.1 Deny-by-default 상충 · 단 `PlanPolicy` 자체 수정은 **본 세션 범위 밖** — 별도 판정 세션).
- **`alert_policy` 는 삭제·대체 금지**(비파괴) — `NOTIFICATION_POLICY` 로 **흡수·확장**(Golden Rule). `action_request.policy_id` 컬럼 **보존**.
- **정족수는 DB 에서만 읽는다** — `required_approvals`(`Mapping.php:288`) 를 `QUORUM_POLICY` 로 승격. 리터럴 하드코딩(`Alerting.php:562`) 재발 금지.
- Policy Engine **신설 금지** — 본 블록은 **참조 엔티티**만 정의한다(평가 엔진은 후속 블록).
- **코드변경 0**.
