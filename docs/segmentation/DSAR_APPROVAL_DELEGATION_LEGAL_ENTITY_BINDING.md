# DSAR — Approval Delegation Legal Entity Binding (§16)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §16 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 상위 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=16` → **§16 = 13**(줄범위 982-1005 · 불릿 13 · 번호 0). 분할 = **필수필드 13**(하위 ENUM 없음 · binding_id/version_id 2 + legal_entity_id 1 + authority responsibility type/delegate eligibility required/cross legal entity allowed/permitted·prohibited destination/intercompany restriction 6 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_LEGAL_ENTITY_BINDING` 엔티티 | `delegation_legal_entity_binding`·`legal_entity_binding` grep **0** — 위임 법인 바인딩 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| `Legal Entity` 엔티티 | 🔴 **전면 부재** — `biz_no`·`corp_reg`·`tax_id` grep **0**(ⓑ §3.3) · 유일 인접 = `business_number`=회사프로필 **단일 문자열**(법인 엔티티 아님) | `ABSENT` |
| Cross-Legal-Entity 판정 계층 | 🔴 Legal Entity 개념 자체가 없으므로 "법인 간 위임 허용/금지" 판정을 수행할 대상이 **성립하지 않음** | `BLOCKED_LEGAL_ENTITY_RISK` |
| Delegate 법인 자격(eligibility) | Delegate Eligibility(§27)·Legal Entity·Employment/Role 상태 참조 모두 부재(§3.3·§3.4) | `ABSENT` |
| exclusion(제외) 표현 | 🔴 `acl_permission`=allow-only — permitted/prohibited destination 배제 표현 없음(ⓑ §3.4) | `ABSENT` |

★**Legal Entity 개념 자체가 전면 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 13종**(필수 필드 13 · 하위 ENUM 없음)

### 필수 필드 (13)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_legal_entity_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | legal_entity_id | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·`business_number`=회사프로필 단일 문자열·법인 아님·ⓑ §3.3) — 법인 식별자 참조 대상 미정의 | `ABSENT` |
| 4 | authority responsibility type | 🔴 Legal Entity 부재 + Approval Authority 전면 부재(§3.2·5-3-3-4) — 법인별 권한/책임 유형 성립 불가 | `ABSENT` |
| 5 | delegate eligibility required | Delegate Eligibility(§27)·Employment/Role 상태 참조 부재(§3.3) — 법인 자격 검증 대상 없음 | `ABSENT` |
| 6 | cross legal entity allowed 여부 | 🔴 Legal Entity 개념 부재 → "법인 간 위임 허용" 판정을 내릴 대상 자체가 성립하지 않음(원문 §16 "Cross-Legal-Entity Delegation은 기본 금지" 도 현행에선 금지 대상 부재) | `BLOCKED_LEGAL_ENTITY_RISK` |
| 7 | permitted destination legal entities | 목적지 법인 집합 부재 + acl allow-only | `ABSENT` |
| 8 | prohibited destination legal entities | 금지 목적지 법인 집합 부재 + acl allow-only(deny 표현 없음) | `ABSENT` |
| 9 | intercompany restriction | 🔴 법인 간(intercompany) 개념·제약 계층 0 | `ABSENT` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Legal Entity Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 12 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `BLOCKED_LEGAL_ENTITY_RISK` 1 · `ABSENT` 7 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Legal Entity 개념이 전면 부재(`biz_no`/`corp_reg`/`tax_id` grep 0)하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(valid_from·status·evidence)은 **확장 대상 인접 자산**이지 커버가 아니다. `cross legal entity allowed` 는 `BLOCKED_LEGAL_ENTITY_RISK` — **금지할 법인 경계 자체가 없어 판정 불가**하며, 나머지 법인 관련 6필드는 Legal Entity 엔티티 신설이 **선행**돼야 존재한다.

## 2. 규칙

- 🔴 **원문 §16 "Cross-Legal-Entity Delegation은 기본 금지다" — 그러나 현행에선 판정 자체가 없다.** 스펙은 법인 간 위임을 기본 금지로 규정하지만, 현행 레포에는 **Legal Entity 엔티티가 전면 부재**(`biz_no`/`corp_reg`/`tax_id` grep 0·`business_number`=회사프로필 단일 문자열)하여 "법인 A ↔ 법인 B" 경계를 표현할 대상이 없다. 따라서 `cross legal entity allowed`=`BLOCKED_LEGAL_ENTITY_RISK` — **금지 규칙을 집행할 법인 경계가 신설되기 전에는 이 게이트가 존재하지 않는다.** 부재를 "기본 금지 준수"로 오독하지 마라(우연한 부재≠준수·§58 ⑦).
- 🔴 **`legal_entity_id` 를 `business_number` 로 대체하지 마라** — `business_number` 는 회사프로필의 **단일 문자열 속성**이지 법인 마스터 엔티티가 아니다(FK·법인 계층·intercompany 관계 전무). Legal Entity(§3.3)를 선행 신설해야 법인 바인딩이 성립한다.
- 🔴 **`permitted/prohibited destination legal entities` 를 acl deny 로 표현하려 하지 마라** — `acl_permission`=allow-only(`__deny__`=data_scope fail-closed 센티넬)다. 목적지 법인 허용/금지 집합은 신설 표현 계층이 필요하며, §5.5 "Delegate 가 법인 A 에서 승인할 Identity·Employment·Role·Authorization 조건 충족" 검증이 여기에 얹힌다.
- 🔴 **`intercompany restriction` 을 "없음=제약 없음"으로 처리 금지** — intercompany 개념 자체가 부재다. 신설 시 법인 간 위임은 기본 차단(fail-closed)으로 두고 명시적 허용만 열어라.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규 도입.
