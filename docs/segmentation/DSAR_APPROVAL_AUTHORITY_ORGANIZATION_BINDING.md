# DSAR — Organization Authority Binding (§19)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §19(1095-1115) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_ORGANIZATION_BINDING` 엔티티 | `organization_authority`·`org_binding` grep **0** — Org↔Authority 결속 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| Organization Unit 엔티티 | 🔴 **부재 확정** — `organization_unit`·`org_unit`·`department`·`cost_center` grep 0(5-3-3-1 조직 엔티티 부재 확정) · tenant/owner 축만 존재(ⓑ §3) | `ABSENT` |
| 계층 순회(descendants) 인접 | 실재 = `PM/Dependencies.php:79-100` DFS(스택 순회 · cycle 검출)·`AdminMenu.php:545` `depth<100` 상향 walk — **PM 태스크·메뉴 도메인이지 조직 계층 아님** | `LEGACY_ADAPTER` |
| owner 관계 인접 | 실재 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유자 개념은 있으나 조직 소유 관계 아님 | `LEGACY_ADAPTER` |

★**Organization Unit 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 순회 자산/부재 깊이"를 기록한다. include descendants·maximum descendant depth 는 **마케팅/PM 도메인의 계층 순회 로직이 인접**하나 조직 승인 계층이 아니다(도메인 상이).

## 1. 원문 전사 + 판정 — **원문 13종**(필수 필드 13)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 결속 대상 Authority Matrix Entry(§16) 미신설 → FK 없음 | `NOT_APPLICABLE` |
| 3 | organization_unit_id | 🔴 조직 엔티티 부재 확정(5-3-3-1 · `organization_unit`/`department`/`cost_center` grep 0) — 참조할 조직 단위 없음 | `ABSENT` |
| 4 | organization hierarchy version policy | 🔴 조직 계층 자체 부재 → 계층 버전 정책 원천 불가 · 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 5 | include descendants 여부 | 인접 = `PM/Dependencies.php:79-100` DFS(하위 순회)·`AdminMenu.php:545` 계층 walk — **PM/메뉴 도메인 하위 포함 로직이나 조직 승인 계층 아님** | `LEGACY_ADAPTER` |
| 6 | maximum descendant depth | 인접 = `AdminMenu.php:545` `depth<100` 상향 walk 상한 · `PM/Dependencies.php:84` `depth<10000` DFS 순회 상한 — **무한루프 방지 상한이지 Authority 상속 깊이 제한 아님** | `LEGACY_ADAPTER` |
| 7 | organization role requirement | 🔴 조직 엔티티 부재 → 조직 내 역할 요건 표현 불가 · `team_role`은 tenant 단위 서열이지 조직단위 role 아님(ⓑ §3) | `ABSENT` |
| 8 | owner relationship requirement | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — parent owner 관계 판별은 있으나 조직 소유 요건 아님 | `LEGACY_ADAPTER` |
| 9 | legal entity restriction | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0 · ⓑ §4) | `ABSENT` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval · 수수료 도메인 · `Db.php:898`·ⓑ §5 FLIP) — 조직/승인 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외) → 폐구간 신규(ⓑ §5) | `ABSENT` |
| 12 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인 · ⓑ §5) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기 · ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사(§19 측정기 `--sec=19` = 13 일치).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `ABSENT` 5 · `NOT_APPLICABLE` 2 · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_CROSS_TENANT` 0.

> 🔴 **커버 0.** Organization Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건(descendants=PM DFS · depth=AdminMenu walk · owner=parent_user_id · valid_from=kr_fee_rule · status · evidence=SecurityAudit)은 **다른 도메인의 인접 자산**이지 조직 승인 계층의 커버가 아니다.

## 2. 규칙

- 🔴 **Parent Organization Authority 를 하위 조직에 상속할 경우 상속 깊이와 Legal Entity Boundary 를 명시하라**(원문 §19 말미 명령). 현행 인접(`AdminMenu.php:545` depth<100·`PM/Dependencies.php:84` depth<10000)은 **무한루프 방지 상한**일 뿐 Authority 상속 경계가 아니다 — Organization Binding 은 maximum descendant depth 를 **명시적 상속 정책값**으로 두고, Legal Entity 경계를 넘는 상속을 fail-closed 로 차단하라(부재하는 Legal Entity 를 "무제한 상속"으로 열지 마라).
- 🔴 **PM/메뉴 도메인의 계층 순회 로직(`PM/Dependencies` DFS·`AdminMenu` walk)을 조직 승인 계층으로 재사용하지 마라** — 순회 알고리즘은 참조하되(중복 순회 엔진 신설 금지) **조직 단위 마스터는 별도 신설**하라. 두 도메인은 순회 대상(태스크 의존·메뉴 트리 vs 조직 단위)이 다르다.
- 🔴 **`organization_unit_id` 를 느슨한 VARCHAR 로 두지 마라** — 5-3-3-1 이 확정한 조직 엔티티 부재를 상속하므로 조직 단위 마스터가 선결이며, 권위 참조 없이 두면 tenant_id 무권위 참조 문제(ⓑ §7)를 조직 축에 복제한다. `parent_user_id`(owner 판별)를 조직 계층으로 재해석하지 마라 — 의미 변경 시 tenant 해석이 전역 붕괴한다(ⓑ §3).
