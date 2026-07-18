# DSAR — Approval Delegation Re-delegation Policy (§37)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §37 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=37` → **기본 정책 12**(육안 금지·측정기 산출).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 재위임(re-delegation) 개념 | 🔴 `redelegation`·`re_delegation`·`delegate_id` grep **0**(ⓑ §1) — Delegate가 제3자에게 다시 위임하는 경로 자체 부재 | `ABSENT`(신설) |
| 유일 위임 인접 = `acl_permission` 위임상한 | `TeamPermissions::putMemberPermissions:615-647`가 `actionsCover:194-198`로 부여상한 초과 시 `DELEGATION_EXCEEDED` 403 — 🔴**member 재부여 경로 0·기간 없음·수락 없음**(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON`(재위임 아님) |
| "모든 Chain Snapshot 저장" | 🔴 Delegation Snapshot 엔티티 grep 0(ⓑ §2.5) — Chain 저장 대상 자체 부재 | `ABSENT` |
| Scope/Amount/Legal Entity 확대 검증 | 🔴 위임 Scope/Monetary/Legal Entity 바인딩 부재(§3.2 Authority ABSENT·§3.3 Legal Entity void) → "확대 금지"를 강제할 기준선 없음 | `ABSENT` |

★**재위임 개념 자체가 부재하므로 정책 단위 커버는 원천 불가.** 아래는 원문 전사(신설 정책)이며 현행 대조는 "부재/인접/선행조건"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 12종**(기본 정책·측정기 §37=12)

| # | 원문 정책 항목 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | 기본 금지 | 🔴 재위임 개념 부재 → "기본 금지"를 강제할 정책 엔진 0(`redelegation` grep 0·ⓑ §1) | `ABSENT` |
| 2 | 허용 시 원본 Delegator 승인 필요 | 🔴 원본 Delegator 승인 경로 부재(Delegation Approval 엔티티 0·ⓑ §2.2 승인자=actor 본인) | `ABSENT` |
| 3 | Scope 확대 금지 | 🔴 위임 Scope 바인딩 부재 → 확대 여부 판정 기준선 없음 | `ABSENT` |
| 4 | Amount Ceiling 확대 금지 | 🔴 금액축 부재 — 유일 조건 `HIGH_VALUE_KRW` 상수(boolean·ⓑ §3.2) · delegated ceiling 개념 0 | `ABSENT` |
| 5 | Legal Entity 확대 금지 | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) → 확대 판정 대상 없음 | `ABSENT` |
| 6 | Action 확대 금지 | 🔴 위임 Action 바인딩 부재 — `acl_permission` 위임상한(monotonicity)은 재위임 아님(ⓑ §2.1) | `ABSENT` |
| 7 | Resource 확대 금지 | 🔴 위임 Resource 바인딩 부재 | `ABSENT` |
| 8 | Period 연장 금지 | 🔴 Delegation Period 엔티티 부재 · `valid_to`/`effective_to` grep 0(ⓑ §3.2) → 연장 판정 없음 | `ABSENT` |
| 9 | Currency 확대 금지 | 🔴 통화 스코프 0(ⓑ §3.2) | `ABSENT` |
| 10 | 최대 깊이 기본 1 | 🔴 재위임 깊이 개념 부재 — 인접 `depth<100`/`depth<10000`은 PM/메뉴(KEEP_SEPARATE·§36) · 재위임 최대깊이 아님 | `ABSENT` |
| 11 | 모든 Chain을 Snapshot으로 저장 | 🔴 Delegation Snapshot 엔티티 grep 0(ⓑ §2.5) — 저장할 Chain 자체 부재 | `ABSENT` |
| 12 | Decision 시 전체 Chain 재검증 | 🔴 Decision 시점 Delegation 재검증(5.11) 미구현 · Chain 자체 부재 | `ABSENT` |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 12 · (그 외 0).

> 🔴 **커버 0.** 재위임 개념 자체가 부재하여 12개 정책 전부 `ABSENT`다. `acl_permission` 위임상한(`DELEGATION_EXCEEDED`)은 §0에 기록한 대로 **RBAC 부여 monotonicity**(기간·수락·재위임 전무)이므로 재위임 정책 커버가 아니라 `KEEP_SEPARATE_WITH_REASON`이다.

## 2. 원문 verbatim 명기 (§37 기본 정책 — 무수정)

> 기본 금지
> 허용 시 원본 Delegator 승인 필요
> Scope 확대 금지
> Amount Ceiling 확대 금지
> Legal Entity 확대 금지
> Action 확대 금지
> Resource 확대 금지
> Period 연장 금지
> Currency 확대 금지
> 최대 깊이 기본 1
> 모든 Chain을 Snapshot으로 저장
> Decision 시 전체 Chain 재검증

## 3. 규칙

- 🔴 **재위임을 "허용"으로 구현하기 전에 §37 verbatim 정책 전량을 강제하라** — 원본 Delegator 승인·Scope/Amount/Legal Entity/Action/Resource/Period/Currency **확대 금지**·최대 깊이 기본 1·전체 Chain Snapshot·Decision 시 재검증. 기본값은 **금지**다(§5.7).
- 🔴 **`acl_permission` 위임상한을 재위임으로 재사용 금지** — 그것은 부여자가 자기 assignable 초과 부여를 막는 monotonicity(`actionsCover:194-198`)일 뿐, 기간·수락·재위임 깊이·Chain Snapshot이 전무하다(ⓑ §2.1). 재위임은 별도 신설.
- 🔴 **"최대 깊이 기본 1" 을 PM/메뉴 depth 상수로 상속 금지** — depth 정책 정본 = [DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md](DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md)(합성).
- 🔴 **"모든 Chain Snapshot 저장" 을 `menu_audit_log.hash_chain` 으로 구현 금지**([[reference_menu_audit_log_not_tamper_evident]]) — 정본 = `SecurityAudit::verify():56-68` 확장([DSAR_APPROVAL_DELEGATION_CHAIN.md](DSAR_APPROVAL_DELEGATION_CHAIN.md) §36 evidence).
