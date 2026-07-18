# DSAR — Approval Delegation Approval (§24)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §24 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 수락: [DSAR_APPROVAL_DELEGATION_ACCEPTANCE.md](DSAR_APPROVAL_DELEGATION_ACCEPTANCE.md) · Authority Snapshot: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=24` → **§24 = 14**(줄범위 1189-1213 · 불릿 14 · 번호 0). 분할 = **필수필드 14**(하위 ENUM 없음).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_APPROVAL` 엔티티 | `delegation_approval`·`delegate_approval` grep **0** — 위임 승인 엔티티 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 위임 승인 절차(Delegation 자체를 승인) | 🔴 **위임 정의를 별도 승인하는 절차 없음** — 승인 4경로(mapping/catalog/action_request/admin_growth)는 **업무 승인**이지 "위임 정의 승인"이 아님(ⓑ §2.2·§3.1) | `ABSENT` |
| approver authority snapshot | 🔴 **Authority Snapshot 부재** — 5-3-3-4 결론 "레포에 Approval Authority 개념 없음"(§3.2·[[DSAR_APPROVAL_AUTHORITY_REGISTRY]]) → 승인자 권한 스냅샷 성립 불가 | `BLOCKED_PREREQUISITE` |
| approved monetary limit | 🔴 금액축 부재 — 유일 금액조건 = `Catalog.php:1016` HIGH_VALUE_KRW 상수(boolean·ⓑ §3.2) | `ABSENT` |
| immutable hash / evidence(인접 정본) | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) — 위임 승인 도메인 아님 | `LEGACY_ADAPTER` |

★**위임 승인 절차 자체가 전면 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산·선행조건 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 14종**(필수 필드 14 · 하위 ENUM 없음)

### 필수 필드 (14)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_approval_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | approval policy | 🔴 위임 정의를 승인하는 정책 부재 — 승인 4경로는 업무 승인이지 위임 승인 아님(ⓑ §2.2) | `ABSENT` |
| 4 | approver subject | 🔴 위임 승인자 주체 지정 계층 0(Subject Registry 부재·§3.3) | `ABSENT` |
| 5 | approver role | 🔴 위임 승인 권한 역할 지정 0 · `team_role` flat enum(roleRank=쓰기게이트·승인역할 아님·ⓑ §3.4) | `ABSENT` |
| 6 | approver authority snapshot | 🔴 **Authority Snapshot 부재**(5-3-3-4 "Approval Authority 개념 없음"·§3.2) — 승인 시점 승인자 권한 스냅샷을 산출할 Authority 계층 자체가 없음 | `BLOCKED_PREREQUISITE` |
| 7 | approval decision | 위임 승인/반려 결정 기록 계층 0 | `ABSENT` |
| 8 | approved scope | 승인된 위임 Scope 기록 0 | `ABSENT` |
| 9 | approved monetary limit | 🔴 금액축 부재(HIGH_VALUE_KRW 상수만·ⓑ §3.2) — 승인 한도 기록 대상 없음 | `ABSENT` |
| 10 | approved period | 위임 유효기간 승인 기록 0(Delegation Period §20 엔티티 부재) | `ABSENT` |
| 11 | approved_at | 위임 승인 시각 기록 계층 0 | `ABSENT` |
| 12 | immutable hash | 정본 = `SecurityAudit::verify():56-68`(preimage ts·hash_equals+prev_hash·tenant·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 13 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 14 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 8 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** 위임 정의를 승인하는 절차가 전면 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(immutable hash·status·evidence)은 **확장 대상 인접 자산**(evidence=`SecurityAudit::verify()`)이지 커버가 아니다. `approver authority snapshot`(#6)은 `BLOCKED_PREREQUISITE` — **Authority Snapshot(5-3-3-4·§3.2) 이 선행 신설되기 전에는 판정 불가**하며, 나머지 승인 관련 필드 8종은 위임 승인 절차 자체가 부재다.

## 2. 규칙

- 🔴 **원문 §24: "고액, Payment, Payout, Write-off, Contract, Executive 및 Emergency Delegation 은 별도 승인 정책을 적용하라" — 그러나 현행엔 Authority/금액축이 없다.** 스펙은 위험도 높은 위임(고액·지급·상각·계약·임원·긴급)에 별도 승인 정책을 요구하지만, 현행 레포에는 **Approval Authority 개념이 전면 부재**(5-3-3-4·§3.2)하고 **금액축도 부재**(`HIGH_VALUE_KRW` boolean 상수 1개뿐·ⓑ §3.2)하여 "고액/Payment/Executive Delegation" 을 판별할 Authority·금액 밴드 축이 성립하지 않는다. 따라서 `approved monetary limit`=`ABSENT`·`approver authority snapshot`=`BLOCKED_PREREQUISITE` — **Authority Foundation(Registry/Matrix/Snapshot) + 금액 밴드가 선행 신설**돼야 위험도별 승인 정책이 집행된다.
- 🔴 **위임 승인(§24)을 업무 승인 4경로로 대체하지 마라** — mapping/catalog/action_request/admin_growth 는 **개별 업무 요청을 승인**하는 상태머신이지 "위임 정의 자체를 승인"하는 계층이 아니다(ⓑ §2.2·승인자=진입게이트 통과 actor 본인). 위임 승인은 Delegation Definition(§9)/Version(§10)을 대상으로 하는 별도 승인 엔티티가 필요하며, 업무 승인과 혼용 금지(중복 아니라 부재·§59).
- 🔴 **`approver authority snapshot` 을 "없음=승인자 무제한"으로 처리 금지** — 승인자 권한 스냅샷이 부재(`BLOCKED_PREREQUISITE`)한 것은 Authority Snapshot 계층(5-3-3-4)이 없기 때문이다. 신설 시 승인 시점 승인자의 유효 Authority 를 스냅샷으로 각인해 사후 Authority 변경과 무관하게 재현 가능해야 한다(§5.12 Snapshot 보존).
- 🔴 **`immutable hash`·`evidence` 는 `SecurityAudit::verify()` 확장** — 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). 위임 승인 증거는 새 엔진을 만들지 말고 SecurityAudit 검증형 체인을 확장하라(중복 엔진 금지).
