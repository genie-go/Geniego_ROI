# DSAR — Approval Delegation Chain (§36)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §36 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=36` → **필수 필드 15**(육안 금지·측정기 산출).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_CHAIN` 엔티티 | 🔴 Delegation Chain(Delegator→Delegate 재위임 연결) 개념 **전무** — `delegation_chain`·`redelegation`·`delegate_id` grep **0**(ⓑ §1·§2.4) | `ABSENT`(신설) |
| Delegator→Delegate 관계 | 🔴 위임 관계 엔티티 자체 부재 — 유일 이름히트 `DELEGATION_EXCEEDED`(`TeamPermissions.php:645`)는 RBAC 부여상한 오탐(ⓑ §2.1) | `ABSENT` |
| 인접 "cycle 검출" 선례 | `PM/Dependencies.php:79-100`(DFS·tenant 매홉·depth<10000)·`AdminMenu::wouldCycle:540-555`(메뉴트리 조상 walk·depth<100)·`PM/Gantt` Kahn — **전부 PM 태스크/메뉴 도메인 · Delegation Chain 아님**(ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 인접 "path hash / evidence" 정본 | `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| Authority / Legal Entity 선행 | 🔴 Authority 개념 부재(5-3-3-4)·Legal Entity void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.2·§3.3) → consistency 검증 대상 자체 없음 | `BLOCKED_PREREQUISITE` |

★**Chain 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이/선행조건"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 15종**(필수 필드·측정기 §36=15)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_delegation_chain_id | Chain 엔티티 통째 부재 → PK 없음 | `ABSENT` |
| 2 | root delegator subject id | 🔴 Delegation 관계 부재 — root delegator 개념 0(ⓑ §1) | `ABSENT` |
| 3 | current delegate subject id | 🔴 Delegate 엔티티 부재(승인자=진입게이트 통과 actor 본인·ⓑ §2.2) | `ABSENT` |
| 4 | parent delegation version id | 🔴 Delegation Version 자체 부재 → parent 링크 없음 | `ABSENT` |
| 5 | child delegation version id | 🔴 재위임(child) 개념 부재 — `redelegation` grep 0(ⓑ §1) | `ABSENT` |
| 6 | depth | 인접 = `PM/Dependencies.php:84 depth<10000`·`AdminMenu:545 depth<100` — **PM 태스크/메뉴 그래프 깊이캡 · Delegation Chain 깊이 아님**(ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | maximum allowed depth | 인접 = `AdminMenu::wouldCycle:540-555`의 `depth<100` 상수 캡 — 메뉴트리 walk 한계 · 재위임 최대깊이 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | re-delegation policy | 🔴 재위임 정책 전무 — `redelegation`/`delegate_id` grep 0 · `acl_permission` 위임상한은 기간/재위임 없음(ⓑ §2.1) | `ABSENT` |
| 9 | scope reduction result | 🔴 재위임 시 Scope 축소 검증 개념 부재(재위임 자체 없음) | `ABSENT` |
| 10 | cycle detection result | 인접 = `PM/Dependencies.php:79-100` DFS·`AdminMenu::wouldCycle:540-555`·`PM/Gantt` Kahn — **도메인 상이(PM/메뉴)·Delegator→Delegate 체인 아님**(ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | legal entity consistency result | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·회사프로필 단일 문자열·ⓑ §3.3) → 일관성 검증 선행조건 미충족 | `BLOCKED_PREREQUISITE` |
| 12 | authority consistency result | 🔴 Approval Authority 개념 부재(5-3-3-4·§3.2 ABSENT) → 일관성 검증할 Authority 단위 자체 없음 | `BLOCKED_PREREQUISITE` |
| 13 | path hash | 정본 = `SecurityAudit::verify():56-68`(preimage 저장·hash_equals·prev_hash) 확장 대상 · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 14 | status | 🔴 Chain 라이프사이클 상태전이집합 선언 0(Delegation 상태 전 도메인 부재·ⓑ §1) | `ABSENT` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·검증기) 확장 · 🔴`menu_audit_log.hash_chain` 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 7 · `KEEP_SEPARATE_WITH_REASON` 3 · `BLOCKED_PREREQUISITE` 2 · `LEGACY_ADAPTER` 2 · (`NOT_APPLICABLE` 0).

> 🔴 **커버 0.** Chain 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `KEEP_SEPARATE_WITH_REASON` 3건(depth·max depth·cycle detection)은 **PM/메뉴 그래프 알고리즘**이지 Delegation Chain 자산이 아니며, `LEGACY_ADAPTER` 2건(path hash·evidence)은 **확장 대상 인접 자산**(SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Delegation Chain 은 신설이나, cycle/depth 검출을 재구현하지 마라** — `PM/Dependencies.php:79-100`(DFS 순환검출)·`AdminMenu::wouldCycle:540-555`(조상 walk depth 캡) 알고리즘을 **참조**하되 Delegation 도메인(Delegator→Delegate·tenant·legal entity·authority 일관성)으로 재해석하라. **중복 엔진 금지.**
- 🔴 **`authority consistency result`/`legal entity consistency result` 를 "있음"으로 표기 금지** — Authority(5-3-3-4 ABSENT)·Legal Entity(void) 선행 엔티티가 신설되기 전에는 `BLOCKED_PREREQUISITE`다. 선행 없이 chain 일관성 검증을 구현하면 근거 없는 통과를 구조적으로 만든다.
- 🔴 **`path hash`/`evidence` 를 `menu_audit_log.hash_chain` 으로 구현 금지**([[reference_menu_audit_log_not_tamper_evident]]) — 검증 불가능한 장식이다. 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·hash_equals·prev_hash·tenant) 확장.
- 🔴 **depth/maximum allowed depth 를 PM/메뉴 상수(`depth<10000`·`depth<100`)로 상속 금지** — 재위임 최대깊이는 §37 "최대 깊이 기본 1" 정책에서 파생돼야 한다(합성 정본 = [DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md](DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md)).
