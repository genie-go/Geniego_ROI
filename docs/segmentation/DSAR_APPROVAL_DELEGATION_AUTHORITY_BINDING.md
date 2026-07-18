# DSAR — Approval Delegation Authority Binding (§12)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §12(줄 859-884) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §3.2 · 인접 전사: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)(5-3-3-4)
> 분모: 측정기 `node tools/measure_spec_denominator.mjs SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=12` = **15**(불릿 15·번호 0). 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_AUTHORITY_BINDING` 엔티티 | `delegation_authority_binding`·`delegated_authority` grep **0** — Delegation Authority Binding 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 🔴 선행 Authority 자체 부재 | `approval_authority`·`authority_matrix`·`amount_band` grep **0**(ⓑ §3.2) · 5-3-3-4 결론 "레포에 Approval Authority 개념 없음" | `BLOCKED_PREREQUISITE`(이양할 권한 단위 미정의) |
| 유일 실 delegation 인접 | `acl_permission` 위임상한 = RBAC 부여 monotonicity(`TeamPermissions.php:645` `DELEGATION_EXCEEDED`·`:194` `actionsCover`) — **Authority Binding 아님**(관계 엔티티·기간·수락·재검증 전무·ⓑ §2.1) | `LEGACY_ADAPTER`(자산 실재·도메인 상이) |
| Active Authority Resolution | 🔴 **부재** — Manager/Authority Resolver 0(`parent_user_id`가 owner로 붕괴 `UserAuth.php:156-157,1225-1227`·ⓑ §3.3) → §12 원문 "Delegator Active Authority Resolution으로 검증" 실행 불가 | `BLOCKED_PREREQUISITE` |

★**엔티티 전체가 부재하고 그 선행조건(Authority Foundation)마저 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이/선행조건 차단"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 15종**(필수 필드 15)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_authority_binding_id | Delegation 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 부재 — 불변 버전체인 선례 0(ⓑ §2.5) | `NOT_APPLICABLE` |
| 3 | approval_authority_definition_id | 🔴 Approval Authority Definition 부재(5-3-3-4·`approval_authority` grep 0·ⓑ §3.2) — 참조 대상 엔티티 없음 | `BLOCKED_PREREQUISITE` |
| 4 | approval_authority_version_id | 🔴 Authority Version 부재 · 버전 6컬럼 전부 하드코딩 태그(불변 prev-링크 체인 0·ⓑ §2.5) | `BLOCKED_PREREQUISITE` |
| 5 | authority type | 🔴 Authority Type(§3.2) 자체 없음 — 유일 금액조건 = `HIGH_VALUE_KRW` 상수(boolean 게이트·`Catalog.php:1016`) | `BLOCKED_PREREQUISITE` |
| 6 | authority domain | 🔴 Authority Domain 축 없음 — 승인 4경로가 도메인별 상태머신(mapping/catalog/action_request/admin_growth)이나 Authority Domain 분류 아님(ⓑ §2.2) | `BLOCKED_PREREQUISITE` |
| 7 | include 여부 | 위임 Authority 포함/제외 플래그 — Delegation Scope(§11) 자체 부재 · include/exclude 표현 0 | `ABSENT` |
| 8 | maximum delegated effect | 🔴 위임 최대 효력 = 원본 Authority 상한 참조가 전제 · 원본 Authority Ceiling 부재로 산출 불가 | `ABSENT` |
| 9 | original authority validation policy | 🔴 원문 요구 = Delegator Active Authority Resolution 검증 · **Resolution ABSENT**(ⓑ §3.3) → 검증 정책 표현 0 | `ABSENT` |
| 10 | utilization attribution policy | 🔴 Delegator/Delegate 귀속 축 부재 · 누적차감 인접 = `AutoCampaign` 예산 페이싱(마케팅·승인 아님·ⓑ §2 FLIP) — Authority Utilization 아님 | `ABSENT` |
| 11 | revalidation policy | 🔴 Decision 시점 재검증(5.11) 정책 부재 — 승인 4경로에 위임/권한 재검증 훅 0 | `ABSENT` |
| 12 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 open-interval·질의계층·Authority Binding 아님·ⓑ §2.5 인접) — Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 13 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 14 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2.2) | `LEGACY_ADAPTER` |
| 15 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56-68` preimage ts·hash_equals·prev_hash·tenant) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_PREREQUISITE` 4 · `ABSENT` 6 · `LEGACY_ADAPTER` 3 · `NOT_APPLICABLE` 2 · `KEEP_SEPARATE_WITH_REASON` 0.

> 🔴 **커버 0.** Authority Binding 엔티티가 통째로 부재하며, 그 참조 대상인 **Authority Foundation(§3.2)마저 개념 부재**다. 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `BLOCKED_PREREQUISITE` 4건(authority_definition_id/version_id/type/domain)은 **선행 Authority 신설 전엔 판정 자체가 유예**되며, `LEGACY_ADAPTER` 3건은 확장 대상 인접 자산(evidence=SecurityAudit·valid_from=kr_fee_rule·status 전이패턴)이지 커버가 아니다.

## 2. §2 원문 검증 조항 명기

> **원문(§12·줄 881):** "위임되는 Authority는 반드시 Delegator의 Active Authority Resolution으로 검증하라."

🔴 **현행 Resolution 부재 명기** — 이 검증 조항은 **Delegator Active Authority Resolution**을 전제하나, 레포에는 (a) Approval Authority 엔티티(`approval_authority`/`authority_matrix` grep 0·ⓑ §3.2), (b) Authority Resolution 산출기, (c) Manager/Reporting-Line Resolver(`parent_user_id`가 최상위 owner로 붕괴·`UserAuth.php:156-157,1225-1227`·ⓑ §3.3) 가 **모두 부재**다. 따라서 §12 Authority Binding 은 원본 권한을 검증할 대상·산출기·해석기가 없어 **`BLOCKED_PREREQUISITE`** 이며, 실 구현은 Authority Foundation(Registry/Definition/Version/Matrix/Resolution) 신설이 **선행**돼야 한다.

## 3. 규칙

- 🔴 **Binding 은 신설이나 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장 · monotonicity 방어는 `acl_permission` 위임상한(`actionsCover:194`) 패턴 참조. **중복 엔진 금지.**
- 🔴 **`maximum delegated effect`/`utilization attribution` 을 "있음"으로 표기 금지**(5.2) — 원본 Authority Ceiling·Utilization 축이 저장계층부터 부재다. Binding 이 실제 능력을 초과 선언하면 "Delegate 가 원본 초과 한도 사용" gap 을 구조적으로 유발한다.
- 🔴 **`approval_authority_definition_id`/`version_id` 를 느슨한 VARCHAR FK 로 두지 마라** — Authority Foundation 신설 시 불변 버전체인(prev-링크)을 선결하고 Binding 은 그 version_id 를 스냅샷 참조하라.
- 🔴 **Active Authority Resolution 없이 Binding 을 활성화하지 마라**(§2 원문) — Resolver(ⓑ §3.3 ABSENT) 신설 전 위임은 원본 권한을 검증할 수 없다 → fail-closed.
