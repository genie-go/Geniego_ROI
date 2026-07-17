# DSAR — Approval Requirement Type (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §17 Requirement Type = 20). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

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

## 1. CANONICAL_APPROVAL_REQUIREMENT_TYPE (20)

| # | 타입 | 현행 대응 |
|---|---|---|
| 1 | `QUORUM_COUNT` | ★`Db.php:634` |
| 2 | `SEGREGATION_OF_DUTIES` | ★`Mapping.php:268-271` |
| 3 | `DISTINCT_APPROVER` | ★`Mapping.php:278-283` |
| 4 | `IDENTITY_RESOLVED` | ★`Mapping.php:246-250` |
| 5 | `PRECONDITION_STATE` | ★`Mapping.php:262-265` · `FeedTemplate.php:248-285` |
| 6 | `ROLE_REQUIRED` | `TeamPermissions.php:39/41` 재사용 |
| 7 | `SCOPE_REQUIRED` | `TeamPermissions.php:41` |
| 8 | `PARTICIPANT_TYPE_REQUIRED` | 부재 |
| 9 | `AMOUNT_THRESHOLD` | 부재(상세 = `5-3-5`) |
| 10 | `CURRENCY_MATCH` | 부재(§13 금지 4) |
| 11 | `TENANT_MATCH` | `Alerting.php:582` 재사용 |
| 12 | `LEGAL_ENTITY_MATCH` | 부재(레지스트리 grep 0) |
| 13 | `ENVIRONMENT_MATCH` | `Db.php:46,57` 근거 |
| 14 | `POLICY_VERSION_PINNED` | 부재(§4.6) |
| 15 | `EVIDENCE_REQUIRED` | 부재(§50) |
| 16 | `REASON_REQUIRED` | 부재 — **Rejection Reason 강제**(§61) |
| 17 | `SNAPSHOT_REQUIRED` | 부재(§4.4) |
| 18 | `IDEMPOTENCY_REQUIRED` | 부재(§35) |
| 19 | `EXTERNAL_CONFIRMATION` | 부재(ERP/Provider) |
| 20 | `TIME_WINDOW` | 부재(기한·상세 = `5-3-6`) |

## 2. 규칙

**§4.7 준수**: 6·7·11은 **인가(Authorization)와 승인 요건이 겹치는 축**이나, **Deny(403)와 Rejection은 다른 결과**다 — `requirePro`/`requirePlan`을 Requirement로 승격하지 말 것(KEEP_SEPARATE). **1~5는 이미 REAL 구현이 존재**하므로 **재구현 금지·`Mapping::approve` 확장**(Golden Rule = Extend·중복 신설 금지). **NOT_APPLICABLE 11종을 "있다고 가정"하고 배선 금지**(287차). **코드변경 0**.
