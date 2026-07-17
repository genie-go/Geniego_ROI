# DSAR — Approval Policy Reference (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §33 — 원문 그대로 전사.
> **분모 정합**: Policy Type — REQ 13 ↔ **원문 실측 13 개수 일치**(단 **항목명 전면 상이** — placeholder `*_POLICY` 계열은 자작이었음 · §1-1).
> 🔴 **분모 불일치**: 필드 — **REQ 집계 14 ↔ 원문 실측 15 — 원문이 정본.** REQ §7 의 `14` 는 정정 대상.

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

## 1. Policy Type (13) — 원문 전사

`APPROVAL_POLICY_REFERENCE`

| # | Policy Type | # | Policy Type |
|---|---|---|---|
| 1 | `AUTHORIZATION` | 8 | `CONTRACT` |
| 2 | `BUSINESS` | 9 | `TENANT` |
| 3 | `FINANCIAL` | 10 | `CUSTOMER_DEFINED` |
| 4 | `RISK` | 11 | `WORKFLOW` |
| 5 | `LEGAL` | 12 | `EMERGENCY` |
| 6 | `COMPLIANCE` | 13 | `CUSTOM` |
| 7 | `SECURITY` | | |

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder 는 **개수(13)만 맞고 항목명이 전면 자작**이었다. 원문은 **정책의 성격 분류**(누구의 규칙인가)이고, placeholder 는 **승인 메커니즘 분류**(무엇을 정하는가)였다 — **축 자체가 다르다**:

| placeholder(자작·폐기) | 원문 §33 | 성격 |
|---|---|---|
| `APPROVAL_REQUIREMENT_POLICY` · `QUORUM_POLICY` · `THRESHOLD_POLICY` · `ROUTING_POLICY` · `ESCALATION_POLICY` · `DELEGATION_POLICY` · `EXPIRY_POLICY` · `CONSUMPTION_POLICY` · `CRITICAL_FIELD_POLICY` · `SEGREGATION_OF_DUTY_POLICY` · `PLAN_ENTITLEMENT_POLICY` · `NOTIFICATION_POLICY` | **전부 없음** | **자작**(메커니즘 축 — 원문 분류 아님) |
| `RISK_POLICY` | `RISK`(#4) | 접미 `_POLICY` 자작 |
| — | `AUTHORIZATION`(#1) · `BUSINESS`(#2) · `FINANCIAL`(#3) · `LEGAL`(#5) · `COMPLIANCE`(#6) · `SECURITY`(#7) · `CONTRACT`(#8) · `TENANT`(#9) · `CUSTOMER_DEFINED`(#10) · `WORKFLOW`(#11) · `EMERGENCY`(#12) · `CUSTOM`(#13) | **원문에 있으나 placeholder 전면 누락** |

⇒ **원문이 정본.** placeholder 의 메커니즘 축(정족수·임계·라우팅 등)은 **§33 Policy Type 이 아니며**, 후속 블록(5-3-4/5/6/8) 소관이라는 기존 주석은 유지하되 **본 문서 요구 분모에서는 폐기**한다.

## 2. 스펙 §33 필수 필드 — 원문 전사 (실측 15)

원문 순서 그대로:

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_policy_reference_id` | 9 | rule id |
| 2 | `approval_request_id` | 10 | matched condition |
| 3 | `approval_case_id` | 11 | generated requirement |
| 4 | `approval_item_id` | 12 | effect |
| 5 | `approval_requirement_id` | 13 | `effective_from` |
| 6 | policy type | 14 | `effective_to` |
| 7 | policy id | 15 | `evidence` |
| 8 | policy version | | |

> 🔴 **필드 원문 실측 15 ↔ REQ 집계 14 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**원문 대조 결과**:
- **#8 policy version 은 원문 필수 필드**다 → §0-1 판정("Policy Version 부재 → 승인 근거 재현 불가")이 **원문으로 직접 뒷받침**됨. 현행 grep 0 = **필수 축 부재**.
- **#10 matched condition · #11 generated requirement** — 정책이 **어느 조건에 걸려 어떤 Requirement 를 만들었는지** 기록 요구. 현행 전무.
- placeholder 의 `policy_source`·`policy_content_hash`·`policy_snapshot_json`·`evaluation_result` 는 **원문 §33 필드가 아니다**(자작) — 재현성 확보 **수단**으로는 타당하나 **요구 분모 계상 금지**(REQ §15 역산 회피). 스냅샷 축은 §32 소관.
- **현행 커버리지 = 15 중 1**: **#7 policy id** 만 `action_request.policy_id`(`Db.php:592-600`)로 **부분 충족**(알림 정책 · `LEGACY_ADAPTER`). 나머지 14 축 부재.

## 3. 규칙

- **Immutable · Append-only**(§4.9) — 정책이 나중에 바뀌어도 **바인딩된 참조는 불변**.
- **policy version(원문 #8) 없는 승인은 근거 미기록으로 간주**(§4.4) — 재현 불가한 승인은 감사 대상. (정책 원문 고정은 §32 Context Snapshot 의 **policy snapshot** 축 소관 — 본 문서에 중복 신설 금지.)
- 🔴 **Fail-closed 강제**: 정책 평가 불능(원문 #12 effect 미확정) → **승인 필요로 간주**(차단). `PlanPolicy.php:12` 의 **fail-open 을 승인 도메인에 복제 금지**(§4.1 Deny-by-default 상충 · 단 `PlanPolicy` 자체 수정은 **본 세션 범위 밖** — 별도 판정 세션).
- **`alert_policy` 는 삭제·대체 금지**(비파괴) — 원문 Policy Type 축에서는 **`BUSINESS`(#2)/`WORKFLOW`(#11) 계열로 수용·확장**(Golden Rule · 289차 표기 `NOTIFICATION_POLICY` 는 자작이므로 폐기). `action_request.policy_id` 컬럼 **보존**.
- **정족수는 DB 에서만 읽는다** — `required_approvals`(`Mapping.php:288`) 보존·승격(정족수 축의 소관 블록은 후속 · 본 문서는 참조 계약만). 리터럴 하드코딩(`Alerting.php:562`) 재발 금지.
- Policy Engine **신설 금지** — 본 블록은 **참조 엔티티**만 정의한다(평가 엔진은 후속 블록).
- **코드변경 0**.
