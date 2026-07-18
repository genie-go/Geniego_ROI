# DSAR — Approval Delegation Organization Binding (§15)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §15 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 상위 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=15` → **§15 = 11**(줄범위 962-981 · 불릿 11 · 번호 0). 분할 = **필수필드 11**(하위 ENUM 없음 · binding_id/version_id 2 + organization_unit_id 1 + include descendants/maximum descendant depth/required organization relationship/exclude organization references 4 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_ORGANIZATION_BINDING` 엔티티 | `delegation_organization_binding`·`organization_binding` grep **0** — 위임 조직 바인딩 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| `Organization Unit`/`Organization Hierarchy` 엔티티 | 🔴 **부재**(5-3-3-1 확정·ⓑ §3.3) — 조직 단위/계층 엔티티 0 · `team_role` flat enum 3값(owner>manager>member)만 존재 | `ABSENT` |
| Reporting-Line / Manager Resolver | 🔴 **ABSENT** — `parent_user_id` 판독자가 최상위 owner/tenant 로 붕괴(`UserAuth.php:156-157,1225-1227`·ⓑ §3.3) · "관리자→위임대상" 관계 산출 불가 | `ABSENT` |
| 인접 "descendants/depth" 선례 | `PM/Dependencies.php:79-100`(DFS·tenant 매홉·depth<10000·PM 태스크 의존성)·`AdminMenu::wouldCycle:540-555`(메뉴트리 조상 walk·depth<100·ⓑ §2.4) — **PM 태스크/메뉴트리 도메인 · 조직 하위트리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| exclusion(제외) 표현 | 🔴 `acl_permission`=**allow-only** — explicit exclusion/deny 표현 없음(`__deny__`=data_scope fail-closed 센티넬·ⓑ §3.4) | `ABSENT` |

★**Organization Binding 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 11종**(필수 필드 11 · 하위 ENUM 없음)

### 필수 필드 (11)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_organization_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | organization_unit_id | 🔴 `Organization Unit`/`Organization Hierarchy` 엔티티 0(5-3-3-1 확정·ⓑ §3.3) — 조직 단위 식별자 참조 대상 자체 미정의 | `ABSENT` |
| 4 | include descendants 여부 | 인접 = `PM/Dependencies.php:79-100` DFS(tenant 매홉·depth<10000)·`AdminMenu::wouldCycle:540-555`(조상 walk·depth<100·ⓑ §2.4) — **PM 태스크/메뉴 하위트리 순회이지 조직 하위트리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | maximum descendant depth | 인접 = 동일 그래프 깊이캡(PM `depth<10000`·AdminMenu `depth<100`·ⓑ §2.4) — **PM/메뉴 도메인 순환/깊이 방어 · 조직 위임 깊이 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | required organization relationship | 🔴 Reporting-Line/Manager Resolver **ABSENT**(`parent_user_id`가 최상위 owner 로 붕괴 `UserAuth.php:156-157,1225-1227`·ⓑ §3.3) — "관리자→하위" 조직 관계 산출 불가 | `ABSENT` |
| 7 | exclude organization references | Organization Unit 부재 + `acl_permission`=allow-only(제외 표현 없음·ⓑ §3.4) → 조직 배제 참조 대상·표현 계층 모두 부재 | `ABSENT` |
| 8 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Organization Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 9 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 10 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 11 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식) | `LEGACY_ADAPTER` |

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 4 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Organization Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(valid_from=kr_fee_rule·status=상태전이·evidence=SecurityAudit)은 **확장 대상 인접 자산**이고, `KEEP_SEPARATE_WITH_REASON` 2건(include descendants·maximum descendant depth=PM/AdminMenu DFS)은 **알고리즘 참조 대상**이지 커버가 아니다. `organization_unit_id`·`required organization relationship` 은 선행 Organization Unit·Reporting-Line Resolver(§3.3) 신설 없이는 존재 불가다.

## 2. 규칙

- 🔴 **`organization_unit_id` 를 `team_role` 이나 `parent_user_id` 로 대체하지 마라** — `team_role` 은 flat enum 3값(owner>manager>member)이고 `parent_user_id` 는 최상위 owner 로 붕괴한다(`UserAuth.php:156-157,1225-1227`). 둘 다 **조직 단위/계층 엔티티가 아니다**. Organization Unit·Organization Hierarchy(§3.3)를 선행 신설해야 조직 바인딩이 의미를 갖는다.
- 🔴 **`include descendants`/`maximum descendant depth` 를 PM/AdminMenu DFS 로 재구현하지 마라** — `PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`는 **PM 태스크 의존성/메뉴트리 순환·깊이 방어**이지 조직 하위트리 순회가 아니다. 순환검출/깊이캡 **알고리즘 패턴만 참조**하고, 조직 계층 walk 는 Organization Hierarchy 신설 위에 별도로 얹어라(중복 엔진 금지).
- 🔴 **`required organization relationship` 을 "충족됨"으로 표기 금지** — Manager/Reporting-Line Resolver 가 **ABSENT** 다(상급자 반환 0). "관리자→위임대상 동일조직" 같은 조직 관계 제약은 Reporting-Line Resolver 선행 신설 후에만 판정 가능하다. 부재 상태에서 통과 처리하면 §5.5 "Cross-Legal-Entity/조직 경계 검증 우회" gap 을 구조적으로 유발한다.
- 🔴 **`exclude organization references` 를 acl deny 로 표현하려 하지 마라** — `acl_permission`=allow-only(`__deny__`=data_scope 센티넬)다. 조직 배제(특정 하위조직 제외)는 신설 표현 계층이 필요하다.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`(검증기 실재)이며 `menu_audit_log.hash_chain` 은 인용 금지다([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` 는 grep 0 이므로 폐구간 유효기간을 신규 도입한다.
