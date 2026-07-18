# DSAR — Approval Authority Subject Binding (§16 · 필수필드 16 + 예외요구 6 = 22)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분모: **필수필드 16 + 예외요구 6 = 22 = §16 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=16` → **불릿 22**). §16은 §15 Authority Binding 의 SUBJECT 특화 결속(개별 주체 직접 부여)이다. Binding Type = [BINDING_TYPE](DSAR_APPROVAL_AUTHORITY_BINDING_TYPE.md) · 공통 필수필드 = [BINDING](DSAR_APPROVAL_AUTHORITY_BINDING.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §16(1006-1039) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3·§5·§6·§7 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 주체(사람)에게 직접 승인권한 결속 | 🔴 **경로 부재**(ⓑ §3) — 4승인경로 "승인자"는 전부 진입 게이트 통과자(analyst+ / requirePro / requirePlan('admin'))이지 자격자 후보 아님 · 개별 주체 직접 grant 0 | `ABSENT`(엔티티 전체 부재) |
| subject 축 인접 | `app_user`(id·tenant_id·team_role·parent_user_id) — 주체 식별 테이블은 실재하나 승인권한 결속 대상으로 미사용(ⓑ §3) | `LEGACY_ADAPTER` |
| 고용·직급 참조 | 🔴 HR/고용(`employment`)·직급(`position`) 엔티티 **0**(ⓑ §3) | `ABSENT` |
| tenant 권위 참조 | 🔴 **Tenant 마스터 테이블 부재** — `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`)·열거는 `SELECT DISTINCT` 역추론(ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| Conflict 검증(§53) | 🔴 충돌 탐지/해소(§53/§54) 전 항목 코드 부재(ⓑ §6) | `ABSENT` |
| Audit 정본 | `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

★**직접 Subject Authority 결속 경로가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **필수필드 16**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | subject_authority_binding_id | 결속 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 🔴 참조 대상 Authority Matrix 엔티티 부재(§72 전량 ABSENT·ⓑ §0) — FK 걸 상대 없음 | `NOT_APPLICABLE` |
| 3 | subject_id | 인접 = `app_user`(id·tenant_id·team_role·parent_user_id) — 주체 식별 테이블 실재하나 승인권한 결속 대상으로 미배선(ⓑ §3) | `LEGACY_ADAPTER` |
| 4 | employment_reference | 🔴 고용(employment) 엔티티 **0** — 재직/고용 마스터 부재(ⓑ §3) | `ABSENT` |
| 5 | position_reference | 🔴 직급(position) 엔티티 **0** — 조직 직위 개념 부재(ⓑ §3) | `ABSENT` |
| 6 | tenant_id | 🔴 **Tenant 마스터 부재** · 인접 = 느슨한 `tenant_id VARCHAR`(FK 0·`Db.php:944`) — 격리 강제는 `index.php:600` REAL이나 strict 기본 OFF(`:585`) | `BLOCKED_CROSS_TENANT` |
| 7 | legal_entity_id | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `ABSENT` |
| 8 | organization_id | 🔴 조직(organization) 엔티티 부재 — 5-3-3-1 조직 엔티티 부재 확정(ⓑ §3) | `ABSENT` |
| 9 | direct assignment reason | 직접 부여 사유 저장 부재 — 직접 grant 경로 자체가 없어 사유 기록 대상 없음(신설) | `NOT_APPLICABLE` |
| 10 | approval reference | 🔴 승인권한 grant 를 승인한 근거 참조 부재 — 후보 도출(§47)·자격자 후보 **0**(ⓑ §3·§6) · 4승인경로는 진입 게이트이지 authority grant 승인 아님 | `ABSENT` |
| 11 | exceptional 여부 | 예외 결속 플래그 선례 0 — 예외성 표기 대상 없음(신설) | `NOT_APPLICABLE` |
| 12 | temporary reference 여부 | 임시 부여 참조 0 · TTL/만료 결속 선례 부재(`valid_to` grep 0·ⓑ §5) — 임시성 표기 대상 없음(신설) | `NOT_APPLICABLE` |
| 13 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료/VAT open-interval·ⓑ §5) — 수수료 도메인 한정, 결속 엔티티엔 없음 | `NOT_APPLICABLE` |
| 14 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` 제외·ⓑ §5) → 폐구간 신규 · 결속 만료 표현 불가 | `ABSENT` |
| 15 | status | 결속 엔티티 부재 → 합법 상태전이집합 선언 0(ⓑ §5) · 판별할 status 컬럼 없음 | `NOT_APPLICABLE` |
| 16 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

## 2. 원문 전사 + 판정 — **예외요구 6** (원문 1029 "직접 Subject Authority는 …보다 예외성이 높으므로 다음을 요구하라")

| # | 원문 요구 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 17 | 명확한 사유 | 직접 부여 사유 저장 부재(필수필드 9와 동일) — 사유 강제 선례 0(신설) | `NOT_APPLICABLE` |
| 18 | 승인 근거 | 승인권한 grant 를 승인한 근거 참조 부재 · 자격자 후보 도출 §47 ABSENT(ⓑ §3·§6) — 신설 | `NOT_APPLICABLE` |
| 19 | 종료일 또는 Review Date | 🔴 종료일=`valid_to` grep 0 · Review Date 개념 0(ⓑ §5) — 폐구간/재검토 축 신규 신설 | `NOT_APPLICABLE` |
| 20 | Conflict 검증 | 🔴 충돌 탐지/해소(§53/§54) 전 항목 코드 부재 · explicit-deny>allow(§4.9) 구조 없음(ⓑ §6) | `ABSENT` |
| 21 | Audit | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) — 무결 해시체인 감사 실재(단 직접 결속 감사엔 미배선) · 🔴`menu_audit_log` 인용 금지 | `LEGACY_ADAPTER` |
| 22 | 최소 권한 원칙 | 최소권한(least-privilege) 강제 선례 부재 — `acl_permission`은 allow-only이고 위임상한 자기정합(`TeamPermissions.php:639` `DELEGATION_EXCEEDED`)은 위임 상한이지 최소권한 강제 아님(ⓑ §3.4·§4.2) — 신설 | `NOT_APPLICABLE` |

**실측 개수: 22 / 22 전사**(필수필드 16 + 예외요구 6). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3(3·16·21) · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_CROSS_TENANT` 1(6) · `ABSENT` 7(4·5·7·8·10·14·20) · `NOT_APPLICABLE` 11(1·2·9·11·12·13·15·17·18·19·22).

> 🔴 **커버 0.** 직접 Subject Authority 결속 경로가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. subject_id·evidence·Audit 의 `LEGACY_ADAPTER` 는 **app_user 식별 / SecurityAudit 해시체인** 인접일 뿐 커버가 아니다. employment/position/legal_entity/organization·approval reference·valid_to·Conflict 검증 7건은 🔴 HR·직급·법인·조직 엔티티 및 후보 도출·만료·충돌 축이 저장/판정계층부터 부재해 `ABSENT`. tenant_id 는 Tenant 마스터 부재로 `BLOCKED_CROSS_TENANT`.

## 3. 규칙

- 🔴 **직접 Subject Authority 를 "예외" 안전장치 없이 도입 금지** — 원문 §16(1029)이 명시하듯 직접 주체 결속은 Role·Position 결속보다 예외성이 높다. 예외요구 6(사유·승인근거·종료일/Review·Conflict·Audit·최소권한)은 **Conflict 검증(§53 ABSENT)·후보 승인(§47 ABSENT)** 이 선행 부재라 지금 도입하면 §65 "Actor에게 Authority 없는데 승인 성공"·"Explicit Deny 우선 위반" gap 을 그대로 상속한다. 예외요구는 결속 신설과 **동시** 신설이어야 한다(부분 도입 금지).
- 🔴 **`subject_id` 를 `app_user` 로만 결속하고 tenant 격리를 상속받지 마라** — `app_user.tenant_id`/`api_key.tenant_id` 는 FK 없는 VARCHAR(Db.php:944)이고 Tenant 마스터가 부재하다(ⓑ §7). subject 결속 신설 시 권위 tenant 참조를 선결하고 strict fail-closed 기본 ON(`index.php:585` 옵트인 → ON 전환)을 권장한다(§66 Cross-Tenant Binding).
- 🔴 **`employment_reference`/`position_reference`/`organization_id` 를 `parent_user_id`·`team_role` 로 우회 채우기 금지** — HR·직급·조직 엔티티는 0이며(ⓑ §3), `parent_user_id` 는 owner 판별/tenant 상속 전용이라 의미 변경 시 전역 붕괴한다. 고용/직급/조직 참조는 별도 엔티티 신설이 선행 조건이다.
- 🔴 **`Audit` 를 `menu_audit_log.hash_chain` 으로 만족 처리 금지** — verify() 0·preimage ts 소실 = 검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]). 정본 = `SecurityAudit::verify():56-68` 확장. Audit 은 예외요구 6 중 유일 인접 실재(`LEGACY_ADAPTER`)이나 직접 결속 이벤트엔 아직 미배선이다.
- 🔴 **`approval reference` 를 4승인경로로 채우지 마라** — Mapping/catalog/action_request/admin_growth 는 진입 게이트 통과자를 기록할 뿐 "이 주체에게 이 authority 를 부여할 자격자"를 도출하지 않는다(§47 후보 도출 ABSENT·ⓑ §3·§6). 직접 Subject 결속의 approval reference 는 authority-grant 전용 승인 흐름 신설을 요구한다.
