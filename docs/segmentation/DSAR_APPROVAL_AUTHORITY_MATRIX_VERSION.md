# DSAR — Approval Authority Matrix Version (§13)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §13(901-926) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§13 측정기 정합)**: `measure_spec_denominator.mjs --sec=13` 실측 **20**(불릿 20·번호 0)과 정합. 본 문서는 §13 필수필드 **20**을 전사한다. (§12 = 필수필드 20 + MATRIX_TYPE 15 = 35 는 문서1·2 참조.)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_MATRIX_VERSION` 엔티티 | 🔴 Matrix(§12) 부재 → 그 버전 엔티티도 부재 · 불변 prev-링크 버전체인 선례 0(ⓑ §5) | `NOT_APPLICABLE`(부재→신설) |
| version 컬럼 6개 실재 | `menu_defaults.version`='baseline' 리터럴·`normalizer_version`·`ml_models.version`·`agent_version`·`risk_prediction.model_version`·`risk_model_registry.model_version` — **전부 하드코딩/서술 태그**(ⓑ §5) | `ABSENT`(체인 아님) |
| immutable_hash 정본 | `SecurityAudit.php:27`(tenant 포함 해시)·`:29-31`(prev_hash·created_at 저장)·`verify():56-68`(재계산+hash_equals+prev 교차·ⓑ §5) | `LEGACY_ADAPTER` |
| DENY 표현 | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §3·§6) → `deny_entry_count` 산출 불가 | `ABSENT` |
| binding 개념 | 🔴 subject/role/position/organization binding 축 0(ⓑ §3) → `*_binding_count` 산출 대상 없음 | `ABSENT` |

★**Version 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§13 필수필드 20**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_matrix_version_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_authority_matrix_id | Matrix(§12) 부재 → FK 참조 대상 없음 | `NOT_APPLICABLE` |
| 3 | version_number | 🔴 version 6컬럼 전부 하드코딩/서술 태그(`menu_defaults.version`='baseline' 리터럴 등·ⓑ §5) — 단조증가 버전번호 체계 0 | `ABSENT` |
| 4 | previous_version_id | 🔴 불변 prev-링크 버전체인 선례 0 · `risk_model_registry`가 append+is_deployed 로 근접하나 UPDATE-mutable(ⓑ §5) | `ABSENT` |
| 5 | entry_count | Entry(§14) 엔티티 부재 → 계수 대상 행 없음 | `NOT_APPLICABLE` |
| 6 | allow_entry_count | Entry 부재 → allow 엔트리 계수 대상 없음 | `NOT_APPLICABLE` |
| 7 | deny_entry_count | 🔴 explicit DENY 표현 자체 없음 — `acl_permission`=allow-only(ⓑ §3·§6) → 구조적 산출 불가 | `ABSENT` |
| 8 | currency_count | 🔴 통화 스코프 0 · `currency_scope`/`allowed_currency` grep 0(ⓑ §4 §26) | `ABSENT` |
| 9 | legal_entity_count | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `ABSENT` |
| 10 | subject_binding_count | 🔴 subject binding 축 0(ⓑ §3) | `ABSENT` |
| 11 | role_binding_count | 🔴 role binding 축 0 · `roleRank`↔`team_role` 매핑 0·직교(ⓑ §3 §4.2) | `ABSENT` |
| 12 | position_binding_count | 🔴 position 엔티티·binding 0(ⓑ §1·§3) | `ABSENT` |
| 13 | organization_binding_count | 🔴 조직 마스터·binding 0 · `parent_user_id`=tenant 상속용(ⓑ §3) | `ABSENT` |
| 14 | change_summary | 버전 엔티티 부재 → 변경요약 컬럼 없음 | `NOT_APPLICABLE` |
| 15 | source_version | 🔴 소스 버전 dating 0 · effective dating 은 수수료 도메인 한정(ⓑ §5) | `ABSENT` |
| 16 | effective_from | 인접 = `kr_fee_rule.effective_from VARCHAR(32) NOT NULL`(open-interval·`Db.php:898`·`KrChannel.php:128,140` INSERT·ⓑ §4표) — 승인/권한 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 17 | effective_to | 🔴 `effective_to`/`valid_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 18 | immutable_hash | 정본 = `SecurityAudit::verify():56-68`(재계산+`hash_equals`+prev 교차·`:29-31` prev_hash·created_at·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 19 | status | 인접 = 상태전이 다수이나 합법 전이집합 선언 0(ⓑ §2) | `LEGACY_ADAPTER` |
| 20 | evidence | 정본 = `SecurityAudit::verify()`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사** (§13 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4 · `ABSENT` 11 · `NOT_APPLICABLE` 5.

> 🔴 **커버 0.** Version 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건(effective_from=kr_fee_rule·immutable_hash/evidence=SecurityAudit·status)은 **확장 대상 인접 자산**이지 커버가 아니다. `deny_entry_count`·`*_binding_count`는 상위 개념(DENY·binding)이 구조적으로 부재하여 `ABSENT`(계수 컬럼만 만들면 항상 0인 장식).

## 2. 규칙

- 🔴 **`version_number`/`previous_version_id` 를 UPDATE-mutable 로 두지 마라** — `risk_model_registry` 근접 선례가 UPDATE-mutable 이라 as-of 재구성이 깨진다(ⓑ §5). **append-only 불변 prev-링크 체인** 신설.
- 🔴 **`deny_entry_count`·`*_binding_count` 계수 컬럼을 상위 개념 없이 만들지 마라** — DENY·binding 축이 부재(ⓑ §3·§6)한 상태에서 카운트 컬럼만 두면 항상 0인 fake-looks-real(action_request `required_approvals=2` 표시용 하드코딩 선례·ⓑ §9-5).
- 🔴 **`immutable_hash`/`evidence` 를 재구현하지 마라** — `SecurityAudit::verify()` 확장(ⓑ §5). `menu_audit_log.hash_chain`(verify() 0·preimage ts 소실=검증 불가능한 장식) 인용·복제 금지.
- 🔴 **`effective_to` 폐구간을 in-place 소거로 구현 금지**(§59 Retroactive) — `AgencyPortal.php:304,:381` `revoked_at=NULL` in-place 소거가 정면 반례(as-of 재구성 불가·ⓑ §5). 복제 금지.
