# DSAR — Approval Evidence (§50·필드 35·저장 금지 7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §50**
> ✅ **REQ 집계 일치**: 필드 **35** · 저장 금지 **7** — 원문 실측과 동일.

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q20 "승인 결정의 근거와 Evidence를 재현할 수 있는가") | 현행 | 분류 |
|---|---|---|
| **APPROVAL_EVIDENCE** 엔티티 | **부재**(grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 현행 승인 감사 저장소 | `audit_log` `Db.php:540-546` — `id, actor, action, details_json, created_at` | **MIGRATION_REQUIRED**(아래 결함 2건) |
| 🔴 그 한계 ① **tenant_id 없음** | `Db.php:540-546` 실측 — 승인 감사가 **테넌트 격리 밖**에 쌓인다. 테넌트별 증거 조회·DSAR 응답·격리 감사 **원리적 불가** | **MIGRATION_REQUIRED** |
| 🔴 그 한계 ② **해시체인 없음** | 같은 스키마 실측 — **tamper-evident 아님**. 증거가 사후 수정돼도 **탐지 불가** → §0 Q20 "재현 가능"을 만족 못 함 | **MIGRATION_REQUIRED** |
| **★해시체인 선례** | `menu_audit_log.hash_chain CHAR(64)` `Handlers/AdminMenu.php:123-131`(+ 생성 `:166-206`) — **저장소 내 유일**한 tamper-evident 감사(N-152-A) | **★VALIDATED_LEGACY**(재사용 근거·패턴 승격) |
| Snapshot 기반 재현 | Resource Snapshot(§30)·Context Snapshot(§32) **전부 부재**(grep 0) — 승인 당시 데이터가 보존되지 않아 **재현 불가**(§4.4 미충족) | **NOT_APPLICABLE** |
| 첨부·문서 증거 | 승인 도메인 attachment **부재**(grep 0) | **NOT_APPLICABLE** |

> **부재가 아니라 미확산**: 저장소는 이미 **해시체인을 한 곳에서 구현**했다(`AdminMenu.php:123-131`). Evidence 무결성은 **신설이 아니라 그 패턴의 승인 도메인 확장**이다(Golden Rule = Extend).

## 1. Evidence = **결정을 사후에 재현하기 위한 불변 근거 묶음**

### 1.1 필수 필드 — **원문 전사 35** (§50)

`APPROVAL_EVIDENCE`

| # | 필드(원문) | 현행 대조 (file:line) | 분류 |
|---|---|---|---|
| 1 | evidence_id | 부재(grep 0) · 인접 = `audit_log.id`(`Db.php:540-546`) | NOT_APPLICABLE |
| 2 | approval_request_id | **부분** — 현행 4개 감사가 `details_json`에 `id`를 담음(`Alerting.php:597,655` · `Mapping.php:291` · `AdminGrowth.php:1342`). 단 **JSON blob**이지 컬럼 아님 | LEGACY_ADAPTER |
| 3 | approval_request_version_id | Version 축 부재 | NOT_APPLICABLE |
| 4 | approval_case_id | Case 축 부재(§4.2) | NOT_APPLICABLE |
| 5 | approval_case_version_id | 부재 | NOT_APPLICABLE |
| 6 | approval_item_id | Item 축 부재 | NOT_APPLICABLE |
| 7 | approval_requirement_id | Requirement 축 부재(§17) | NOT_APPLICABLE |
| 8 | approval_actor_id | **부분** — `audit_log.actor`(`Db.php:540-546`). 🔴 단 `Alerting::actor`는 **`X-User-Email` 헤더/`?actor=` → 'unknown'**(`Alerting.php:33-36`) = **위조 가능**. `Mapping::actorId`(`:36-53`)만 위조불가 | ★혼재 — Mapping=VALIDATED_LEGACY / Alerting=MIGRATION_REQUIRED |
| 9 | approval_decision_id | Decision 테이블 부재 | NOT_APPLICABLE |
| 10 | requester reference | **부분** — `requested_by` 컬럼(`Db.php:623-636` · `AdminGrowth.php:142-149`)이나 **증거에 미복사** | LEGACY_ADAPTER |
| 11 | requested resource reference | 부재(증거 축) | NOT_APPLICABLE |
| 12 | resource version | 부재(§4.4 미충족) | NOT_APPLICABLE |
| 13 | action | **부분** — `audit_log.action`(4종 실측 · [Audit Event 문서](DSAR_APPROVAL_AUDIT_EVENT.md) §0) | LEGACY_ADAPTER |
| 14 | amount | 부재 | NOT_APPLICABLE |
| 15 | currency | 부재 — 재사용 후보 `Connectors::fxToKrw`(`Connectors.php:1749`) | NOT_APPLICABLE |
| 16 | scope | 부재 | NOT_APPLICABLE |
| 17 | tenant | 🔴 **부재 — `audit_log`에 `tenant_id` 컬럼 없음**(`Db.php:540-546`). 승인 증거가 **테넌트 격리 밖**에 쌓인다 | **MIGRATION_REQUIRED**(§0 한계 ①) |
| 18 | workspace | 부재 — 실체는 `tenant_kv` KV(`WorkspaceState.php:59`) | NOT_APPLICABLE |
| 19 | legal entity | 부재(grep 0) | NOT_APPLICABLE |
| 20 | environment | 부재 | NOT_APPLICABLE |
| 21 | role assignment reference | 부재 — Role Version/Assignment 축 부재(§4.6 미충족) | NOT_APPLICABLE |
| 22 | authorization decision reference | 부재 | NOT_APPLICABLE |
| 23 | policy reference | 부재(§33) · `PlanPolicy` fail-open(`PlanPolicy.php:12`) | BLOCKED_POLICY_DRIFT |
| 24 | policy version | 부재 | NOT_APPLICABLE |
| 25 | resource snapshot reference | 부재(§30 · grep 0) | NOT_APPLICABLE |
| 26 | context snapshot reference | 부재(§32 · grep 0) | NOT_APPLICABLE |
| 27 | decision reason reference | 부재(§24) — 현행 승인은 사유를 요구하지 않음 | NOT_APPLICABLE |
| 28 | execution binding reference | 부재([Binding 문서](DSAR_APPROVAL_EXECUTION_BINDING.md)) | NOT_APPLICABLE |
| 29 | consumption reference | 부재([Consumption 문서](DSAR_APPROVAL_CONSUMPTION.md)) | NOT_APPLICABLE |
| 30 | correlation reference | 부재(§34 · grep 0) | NOT_APPLICABLE |
| 31 | effective_at | 부재 | NOT_APPLICABLE |
| 32 | recorded_at | **존재** — `audit_log.created_at`(`Db.php:540-546`) | VALIDATED_LEGACY |
| 33 | result hash | 🔴 **부재 — `audit_log`에 해시 없음**(tamper-evident 아님). ★선례 = `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:123-131` · 생성 `:166-206`) — **저장소 유일** | **MIGRATION_REQUIRED**(§0 한계 ② · 선례는 ★VALIDATED_LEGACY) |
| 34 | lineage | 부재(승인 도메인) | NOT_APPLICABLE |
| 35 | audit reference | **부분** — 증거가 곧 `audit_log`이며 **분리된 참조 관계가 없음**(증거 축과 감사 축 미분화) | CONSOLIDATION_REQUIRED |

**대조 결과 — 35종 중 온전히 존재 1종(#32 recorded_at) · 부분 5종(#2·#8·#10·#13·#35) · 부재 29종.**
🔴 **#17 tenant · #33 result hash는 §0 Q20("재현 가능")을 원리적으로 막는 2대 결함**이며, #8은 **핸들러에 따라 위조 가능**하다. 커버리지를 "1/35 존재"로 읽지 말 것 — **#32는 타임스탬프일 뿐 증거 축의 구현이 아니다**.

### 1.2 저장 금지 — **원문 전사 7** (§50 "다음을 저장하지 마라")

| # | 저장 금지 대상(원문) | 저장소 근거·현행 |
|---|---|---|
| 1 | Password | 평문 저장 금지 원칙 |
| 2 | Access Token | 동상(Refresh Token 포함 해석) |
| 3 | Credential Secret | `channel_credential` **AES-256-GCM**(`Db.php:976` · 267차) · `ChannelCreds` 마스킹 — **증거에 복호 원문 복제 금지** |
| 4 | Bank Account 원문 | 금융 식별자 원문 금지 |
| 5 | 불필요한 PII | 저장소 원칙 = **집계 전용**(v418.1 decisioning 설계 의도) |
| 6 | 승인에 필요하지 않은 Claim Evidence 원문 | 🔴 **본 항목은 원문 수령 전 저장소 추정에 없었다** — Claim 축은 현행 부재(grep 0) |
| 7 | 내부 Risk Model 전체 원문 | 🔴 **본 항목도 원문 수령 전 추정에 없었다** — Risk 축 현행 부재(grep 0) |

> **★원문 전사가 정정한 것**: 본 절은 원문 수령 전 **저장소 원칙에서 5종을 역산**해 적었고, 그 5종은 원문 #1~#5와 **일치**했다. 그러나 **#6·#7은 역산으로 도출되지 않았다** — 역산은 아는 것만 재생산할 뿐 **모르는 요구를 만들어내지 못한다**. REQ §15 역산 금지가 옳았음을 이 두 항목이 실증한다.

→ 증거에는 **원문이 아니라 참조·마스킹·해시**를 담는다. `ChannelCreds` 마스킹 패턴을 재사용한다.

영속된 요구(§0 Q20·§4.4·§4.9)에서 확정 가능한 구조 요구:
- Evidence는 **Append-only·불변**이다(§4.9) — 수정은 새 레코드이지 덮어쓰기가 아니다.
- Evidence는 **Tenant 스코프 필수** — `audit_log`의 tenant 결함을 **복제하지 않는다**.
- Evidence는 **Snapshot(§30·§32)을 참조**한다 — Snapshot 없이 Evidence만 쌓으면 "무엇에 대한 승인이었는지"가 빠져 재현 불가.

## 2. 규칙

- **`menu_audit_log.hash_chain` 패턴을 승인 Evidence로 승격**한다 — 별도 무결성 모델 신설 **금지**(Golden Rule).
- **`audit_log`를 그대로 Evidence 저장소로 쓰지 않는다** — tenant 부재 + 해시체인 부재 **2결함**을 승인 도메인에 상속시키면 §0 Q20을 원리적으로 못 채운다. 단 **기존 `audit_log` 호출부 제거 금지**(무후퇴 · 확장이지 대체 아님).
- **자격증명·PII 원문 저장 절대 금지** — 증거 수집을 이유로 복호 원문을 복제하면 267차 암호화가 **무력화**된다.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
