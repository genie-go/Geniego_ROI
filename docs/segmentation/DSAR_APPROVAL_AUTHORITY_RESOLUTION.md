# DSAR — Approval Authority Resolution (§50 · 필수필드 44)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> 분모: **필수필드 44 = §50 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=50` → **불릿 44**).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §50(2049-2098) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_RESOLUTION` 엔티티 | `authority_resolution`·`approval_resolution` grep **0** — 🔴 **Resolution/Specificity 파이프라인 전무**(ⓑ §6). "권한 있는가"가 아니라 "게이트 통과했는가"뿐 | `NOT_APPLICABLE`(부재→신설) |
| Domain·Action·Scope·Amount 대비 Authority 매칭 | grep **0** — 승인 4경로는 **진입 게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))일 뿐 자격자 후보 도출 없음(ⓑ §3) | `ABSENT` |
| 특이성(구체 binding > 일반) 비교 | grep **0** — binding 개념 자체가 없음(ⓑ §6·§52) | `ABSENT` |
| explicit deny > allow 우선순위 | 🔴 `acl_permission` **allow-only**(deny 표현 자체 없음·ⓑ §6·§4.9) | `ABSENT` |
| `resolution_hash`/immutable | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| `effect` DENY | **ABSENT** — DENY effect 표현 없음(ⓑ §6·[DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md)) | `ABSENT` |
| matrix/authority version | 불변 prev-링크 버전체인 선례 **0**(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `BLOCKED_PREREQUISITE` |
| `fx_reference` | 🔴 **환율 이력 부재** — `app_setting` KV 단일행 덮어쓰기·`rate_date` 컬럼 없음(`Connectors.php:1790`·ⓑ §4 §27) | `ABSENT` |
| `tenant_id` 격리 | Cross-tenant 차단 **REAL**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기·`:593` auth_tenant) · 단 strict fail-closed 기본 OFF(`:585`) | `LEGACY_ADAPTER` |

★**Resolution 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **필수필드 44**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_resolution_id | Resolution 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_request_id | approval_request 엔티티 부재(5-3-3-3 ABSENT) → FK 없음 | `NOT_APPLICABLE` |
| 3 | approval_request_version_id | request version 부재 | `NOT_APPLICABLE` |
| 4 | approval_case_id | approval_case 부재 | `NOT_APPLICABLE` |
| 5 | approval_item_id | approval_item 부재 | `NOT_APPLICABLE` |
| 6 | approval_requirement_id | 🔴 요건 모델 부재 — `required_approvals` 유일 생산자=`Mapping.php:209-210` 리터럴 `2`+`Db.php:634 DEFAULT 2`(금액·건종류 무관 상수·ⓑ §1) | `ABSENT` |
| 7 | approval_chain_resolution_id | Chain Resolution 부재(§47~§54 전 ABSENT·ⓑ §6) → FK 없음 | `NOT_APPLICABLE` |
| 8 | resolution_level_id | resolution 레벨 개념 부재 | `NOT_APPLICABLE` |
| 9 | subject_id | 🔴 subject/actor 판독 정본축 부재 — §4.1 Manager Resolver·§4.2 권한축 2벌 분열(machine api-key vs team_role 매핑0·ⓑ §3) | `ABSENT` |
| 10 | action | action 대비 Authority 매칭 **0**(ⓑ §0·§6) | `ABSENT` |
| 11 | authority_domain | 🔴 Authority Domain 자체 없음(ⓑ §1·§3.4 44항목 전부 0) | `ABSENT` |
| 12 | authority_type | 🔴 Authority Type 자체 없음(ⓑ §1) | `ABSENT` |
| 13 | resource_type | resource scope 판별 부재 — 인접 `acl_permission` scopeSql(데이터-행 필터·`TeamPermissions.php:286`)은 Authority 리소스 스코프 아님 | `ABSENT` |
| 14 | resource_id | resource 바인딩 부재 | `ABSENT` |
| 15 | tenant_id | Cross-tenant 차단 REAL(`index.php:600`·`:593`) 단 Tenant 마스터 부재(`api_key.tenant_id`=FK 없는 VARCHAR·`Db.php:944`·ⓑ §7)·strict 기본 OFF(`:585`) | `LEGACY_ADAPTER` |
| 16 | workspace_id | workspace 엔티티 부재 | `ABSENT` |
| 17 | organization_id | org 마스터 부재 — `seedOrg`(`TeamPermissions.php:708-717`)는 acl 스코프 시드·조직 계층 마스터 아님 | `ABSENT` |
| 18 | legal_entity_id | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1 Registry 필드12) | `ABSENT` |
| 19 | region | 지리 축 = `Geo`(IP→ISO→언어) — Authority 지리 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 20 | country | TikTok `country_code` 차원 — Authority 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 21 | original_amount | 🔴 금액축 부재 — 유일 금액조건 `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`) 상수는 boolean 만 켬(ⓑ §4) | `ABSENT` |
| 22 | original_currency | 통화 스코프 0 — 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 23 | comparison_amount | 비교금액 산출 로직 부재 | `ABSENT` |
| 24 | comparison_currency | 비교통화 정규화 부재 | `ABSENT` |
| 25 | fx_reference | 🔴 환율 이력 부재 — `app_setting` KV 덮어쓰기·`rate_date`/`business_day` 컬럼 없음(`Connectors.php:1790,1804-1805`·ⓑ §4 §27) → as-of/USE_PREVIOUS_BUSINESS_DAY 구현 불가 | `ABSENT` |
| 26 | matrix_id | 🔴 DOA/Authority Matrix 부재(`doa_matrix`·`authority_matrix` grep 0·ⓑ §1) | `ABSENT` |
| 27 | matrix_version_id | Matrix version 체인 부재 — 불변 prev-링크 선례 0(ⓑ §5) | `BLOCKED_PREREQUISITE` |
| 28 | matrix_entry_id | Matrix Entry 부재 | `ABSENT` |
| 29 | authority_definition_id | Authority Definition 부재(ⓑ §1) | `ABSENT` |
| 30 | authority_version_id | 불변 version 체인 선례 0(version 6컬럼 전부 하드코딩·`risk_model_registry`는 append+is_deployed이나 UPDATE-mutable·ⓑ §5) | `BLOCKED_PREREQUISITE` |
| 31 | amount_band_id | Amount Band 0(`amount_band`·`approval_threshold` grep 0·ⓑ §4) | `ABSENT` |
| 32 | limit_period_id | 인접 실재 = `AutoCampaign.php:855` `periodSpentToDate`(기간 내 누적) — 마케팅 도메인·승인 워크플로 아님(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 33 | utilization_reference | 인접 = `AutoCampaign:843-889` 예산 누적차감(`:856` budget 비교·`:864` pause) — 승인 authority 아님 | `LEGACY_ADAPTER` |
| 34 | remaining_authority | 인접 = `AutoCampaign` budget−spent 잔여(승인 authority 잔여 아님) | `LEGACY_ADAPTER` |
| 35 | effect | 🔴 effect 판별 축 부재 — DENY 표현 자체 없음(`acl_permission` allow-only·ⓑ §6·EFFECT doc) | `ABSENT` |
| 36 | eligibility_result | Eligibility(§45/§46) `BLOCKED_PREREQUISITE` — "이 행위자가 이 단계를 승인할 권한 있는가" 정본축 없음(ⓑ §3) | `BLOCKED_PREREQUISITE` |
| 37 | conflict_result | Conflict 탐지/해소(§53/§54) 부재 — "conflict" 60+ 히트는 전부 SQL ON CONFLICT·ad_schedule precedence(ⓑ §6) | `ABSENT` |
| 38 | next_level_required 여부 | Chain/level 부재(5-3-3-3 ABSENT) → 판정 자체 없음 | `NOT_APPLICABLE` |
| 39 | additional_approval_required 여부 | 인접 = `required_approvals=2` 리터럴 정족수(`Mapping.php:209-210`·금액/건종류 무관 고정·ⓑ §1 §2) | `LEGACY_ADAPTER` |
| 40 | manual_review_required 여부 | high_value(₩5M+)는 `requires_approval=true`만 켜고 `approveQueue:2350-2357`이 approval_type 무시·unregister와 동일경로 붕괴(ⓑ §4) → 구별되는 manual-review 판정 없음 | `NOT_APPLICABLE` |
| 41 | resolution_hash | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·재계산 hash_equals·ⓑ §5) 🔴 `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 42 | resolved_at | resolution 시각 부재 — 승인 ts(`Mapping:285`{user,ts})는 상태전이 기록·resolution 아님 | `ABSENT` |
| 43 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 44 | evidence | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·검증기) 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 44 / 44 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 8(15·32·33·34·39·41·43·44) · `KEEP_SEPARATE_WITH_REASON` 2(19·20) · `BLOCKED_PREREQUISITE` 3(27·30·36) · `ABSENT` 22 · `NOT_APPLICABLE` 9(1·2·3·4·5·7·8·38·40).

> 🔴 **커버 0.** Resolution 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 8건은 **확장 대상 인접 자산**(hash/evidence=SecurityAudit·utilization/limit_period/remaining=AutoCampaign·additional_approval=Mapping 정족수·tenant=index.php 격리·status=미선언 전이)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Resolution 은 신설이나, 하위 인접 선례를 재구현하지 마라** — resolution_hash/evidence=`SecurityAudit::verify()` 확장 · utilization/limit_period/remaining=`AutoCampaign` 페이싱 참조 · additional_approval=`Mapping` 4중 방어 정족수 확장. **중복 엔진 금지.**
- 🔴 **`effect` 를 ALLOW-only 로 도입 금지** — DENY 표현이 저장계층부터 부재(`acl_permission` allow-only·ⓑ §6)다. Resolution 이 explicit-deny>allow(§4.9·§52) 우선순위를 표현하려면 effect=DENY 를 최초 스키마에 포함해야 §65 Critical Gap 이 구조화되지 않는다.
- 🔴 **`original_amount`/`fx_reference`/`amount_band_id` 를 "있음"으로 표기 금지** — 금액축·환율 이력이 저장계층부터 부재다(ⓑ §4). Resolution 필드가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **`tenant_id` 를 느슨한 VARCHAR 로 상속 금지**(§66 Cross-Tenant Binding) — 격리 집행은 REAL(`index.php:600`)이나 Tenant 마스터 부재(ⓑ §7)를 상속하지 말고 권위 tenant 참조를 선결하라. strict fail-closed 기본 ON 권장.
- 🔴 **`matrix_version_id`/`authority_version_id` 를 하드코딩 태그로 두지 마라** — 레포의 version 6컬럼은 전부 서술 태그이며 불변 prev-링크 체인 선례가 0(ⓑ §5)이므로 `BLOCKED_PREREQUISITE`다. Version 엔티티(5-3-3-4 §12~§13) 선결 없이 Resolution 이 as-of 매트릭스를 참조하면 §65 "Current Matrix 로 과거 재해석" gap 이 발생한다.
