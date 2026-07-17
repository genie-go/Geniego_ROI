# DSAR — Approval Requirement Source (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: Source Type 16 + 필드 9 = REQ §7(스펙 §18). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

**★Requirement Source 전면 부재(grep 0) — "왜 이 승인이 필요한가"를 기록하는 구조가 없다.**

| 현행 | 실측 | 분류 |
|---|---|---|
| `required_approvals` **출처** | `Db.php:634` `DEFAULT 2` — **하드코딩 기본값**. *누가·어떤 정책으로* 2를 정했는지 **기록 없음** | **MIGRATION_REQUIRED**(값은 있으나 근거 부재) |
| `Alerting` 정족수 출처 | `Alerting.php:562` `=> 2` **소스코드 리터럴** — DB 컬럼조차 없음(`Db.php:592-600`) | **★MIGRATION_REQUIRED**(출처 = 코드 상수 = 테넌트별 조정 불가) |
| 자기승인·dedup 규칙 출처 | `Mapping.php:268-283` — **코드에 직접 내장**(정책 참조 없음) | **MIGRATION_REQUIRED** |
| 승인 요구를 **발생시킨** 정책 참조 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `PlanPolicy` | `PlanPolicy.php:12` **fail-open**(주석 자인) · `PlanPolicy.php:19-24` `const RANK` = **코드 상수** | **KEEP_SEPARATE_WITH_REASON**(플랜 게이트 = 인가·§4.7) + fail-open 주의 |
| Workflow Registry / BPMN / Temporal·Camunda·Flowable·Zeebe·Step Functions | **backend/src grep 0** | **NOT_APPLICABLE(부재 → 신설·`5-3-2` 범위)** |
| `JourneyBuilder` | `JourneyBuilder.php:35-60`(journeys/nodes/edges) = **마케팅 여정** · 승인 노드/게이트 **grep 0** | **KEEP_SEPARATE_WITH_REASON**(승인 엔진 아님 — **전용 금지**) |

> **§0 질문 7 무응답 확정**: 현행 승인 요건의 출처는 **전부 하드코딩(코드 상수·컬럼 DEFAULT)** 이며, **테넌트·정책·계약 어디에서도 유도되지 않는다.**

## 1. CANONICAL_APPROVAL_REQUIREMENT_SOURCE_TYPE (16)

| # | Source Type | 비고 |
|---|---|---|
| 1 | `POLICY` | 정책 엔진(§33) |
| 2 | `POLICY_VERSION` | **버전 고정**(§4.6) |
| 3 | `ROLE_DEFINITION` | `TeamPermissions.php:39/41` |
| 4 | `PROGRAM_RULE` | REBATE_PROGRAM(**grep 0 → 선행 신설**) |
| 5 | `CONTRACT_TERM` | 계약 조항 |
| 6 | `FUNDING_AGREEMENT` | |
| 7 | `THRESHOLD_RULE` | 금액 임계(`5-3-5`) |
| 8 | `REGULATORY` | 법규·컴플라이언스 |
| 9 | `TENANT_SETTING` | 테넌트 설정(현행 하드코딩 `Db.php:634` 대체 후보) |
| 10 | `WORKSPACE_SETTING` | 실체 = `tenant_kv`(`WorkspaceState.php:59`) |
| 11 | `SYSTEM_DEFAULT` | **현행 전 경로가 사실상 이것**(`Alerting.php:562`·`Db.php:634`) |
| 12 | `MANUAL_OVERRIDE` | 수동 지정 |
| 13 | `RISK_ASSESSMENT` | (`5-3-5`) |
| 14 | `PROVIDER_REQUIREMENT` | 외부 채널 요구 |
| 15 | `ERP_REQUIREMENT` | |
| 16 | `LEGAL_ENTITY_RULE` | 레지스트리 **grep 0 → 선행 신설** |

## 2. CANONICAL_APPROVAL_REQUIREMENT_SOURCE 필드 (9)

| # | 필드 |
|---|---|
| 1 | `requirement_source_id` (PK) |
| 2 | `tenant_id` (격리 필수) |
| 3 | `source_type` (§18 · 16종) |
| 4 | `source_ref_id` (원 출처 레코드) |
| 5 | `source_version` (**시점 고정**·§4.6) |
| 6 | `source_expr` (요건 산출식) |
| 7 | `resolved_at` |
| 8 | `resolved_snapshot_json` (**재현용**·§4.4) |
| 9 | `created_at` |

## 3. 규칙

**Source 없는 Requirement 금지** — 필요성의 근거가 없으면 §0 질문 7·§61(Requirement Source·Policy Version 보존)을 충족할 수 없다. `SYSTEM_DEFAULT`(11)는 **현행 이관용 임시 유형**이며 신규 요건에 사용 금지. **Workflow 엔진은 부재(grep 0)** — `JourneyBuilder`를 승인 워크플로로 **전용 금지**(마케팅 여정이며 승인 노드 없음 = 죽은 스켈레톤 배선 위험·287차). 워크플로 실행은 **본 블록 범위 밖**(`5-3-2`). **코드변경 0** — 실 구현은 별도 승인 세션.
