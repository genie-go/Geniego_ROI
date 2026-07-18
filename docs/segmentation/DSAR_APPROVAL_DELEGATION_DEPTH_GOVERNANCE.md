# DSAR — Approval Delegation Depth Governance (합성 §36/§37/§38)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §36(depth·maximum allowed depth)·§37("최대 깊이 기본 1")·§38(depth 기반 순환 종료) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
>
> ★**§65 문서 목록엔 `DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md` 가 있으나 원문에 전용 § 섹션이 없다** → 본 문서는 **§36 depth/maximum allowed depth + §37 "최대 깊이 기본 1" + §38 depth 기반 순환 종료**의 depth 관련 요구를 **합성(cross-ref)**한다.
> ★**전용 § 측정기 없음** — `measure_spec_denominator.mjs --sec=N` 은 이 합성 문서를 세지 못한다. 아래 §1 항목은 **명시 카운트(explicit count)** 로 표기한다.
> ★**중복계상 주의** — §1의 depth 항목은 이미 §36(측정기 15) 및 §37(측정기 12) 분모 안에 계상돼 있다. 커버리지 합산 시 본 문서 항목을 별도로 다시 더하지 마라.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation depth 개념 | 🔴 재위임(re-delegation) 개념 부재 → 위임 체인 깊이 자체 없음(`redelegation`·`delegate_id` grep 0·ⓑ §1) | `ABSENT`(신설) |
| 인접 depth 캡 (1) | `PM/Dependencies.php:84 depth<10000`(DFS 재귀 깊이 상한·PM 태스크 의존성·ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 인접 depth 캡 (2) | `AdminMenu:545 depth<100`(`wouldCycle` 메뉴트리 조상 walk 상한·ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 재위임 최대깊이 정책 | 🔴 §37 "최대 깊이 기본 1" 을 강제할 정책 엔진 0(재위임 부재) | `ABSENT` |

★**depth 항목은 §36·§37·§38에 분산 존재하며 전용 섹션이 없다.** 아래는 depth-specific 요구만 **합성 명시 카운트**한다(중복계상 주의).

## 1. depth-specific 합성 전사 + 판정 — **명시 카운트 4종**(전용 §측정기 없음)

| # | 출처 § | 원문 항목(depth-specific) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|---|
| 1 | §36 | depth | 🔴 Delegation Chain 깊이 부재 · 인접 = `PM/Dependencies.php:84 depth<10000`·`AdminMenu:545 depth<100`(PM/메뉴 그래프 깊이·도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | §36 | maximum allowed depth | 🔴 위임 최대깊이 상한 부재 · 인접 = `AdminMenu::wouldCycle:540-555`의 `depth<100` 상수(메뉴트리 walk 한계·재위임 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | §37 | 최대 깊이 기본 1 | 🔴 재위임 개념 부재 → 기본값 1 을 강제할 대상 없음(`redelegation` grep 0·ⓑ §1) | `ABSENT` |
| 4 | §38 | depth 기반 순환 종료 조건(Cycle Detection depth bound) | 🔴 Delegation 순환 무발동 · 인접 = PM/Dependencies DFS depth cap·AdminMenu walk depth cap(순환 종료용 상수·Delegation Chain 아님) | `KEEP_SEPARATE_WITH_REASON` |

**명시 카운트: 4** (§36 depth 2 + §37 depth 1 + §38 depth 1). 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 1.

> 🔴 **커버 0.** depth governance 는 Delegation 체인이 없어 전면 미구현이며, `KEEP_SEPARATE_WITH_REASON` 3건은 **PM/메뉴 그래프 깊이 상수**(`depth<10000`·`depth<100`)이지 Delegation depth 자산이 아니다. **이 4항목을 §36/§37 커버리지 합계에 재가산하지 마라(중복계상).**

## 2. 원문 verbatim 명기 (depth 관련 — 무수정)

- **§36 Delegation Chain 필드**: `depth` · `maximum allowed depth`
- **§37 Re-delegation Governance**: `최대 깊이 기본 1`
- **§38 Cycle Detection**: `Cycle이 발견되면 활성화를 차단하라` (순환 종료 판정 시 depth 상한 필요)

## 3. 규칙

- 🔴 **재위임 최대깊이 기본값 = 1**(§37) — 허용 시에만 상향하되 원본 Delegator 승인·Scope 축소·전체 Chain Snapshot 을 요구하라([DSAR_APPROVAL_DELEGATION_REDELEGATION_POLICY.md](DSAR_APPROVAL_DELEGATION_REDELEGATION_POLICY.md)). 기본은 재위임 금지이므로 실질 깊이는 1.
- 🔴 **depth 상한을 PM/메뉴 상수(`depth<10000`·`depth<100`)로 상속 금지** — 그것은 무한루프 방어용 그래프 캡이지 재위임 거버넌스가 아니다. 재위임 최대깊이는 §37 정책·Delegation Type(`maximum delegation depth` 필드·§8)에서 파생하라.
- 🔴 **depth 초과 시 `MAXIMUM_DEPTH_EXCEEDED`** (§29 Candidate Exclusion·§31 Resolution Result 어휘) — 활성화/해석 게이트에서 선차단.
- 🔴 **Cycle Detection 의 depth bound 는 순환 종료 목적일 뿐 재위임 정책 상한과 혼동 금지** — 검출 알고리즘 참조는 [DSAR_APPROVAL_DELEGATION_CYCLE_DETECTION.md](DSAR_APPROVAL_DELEGATION_CYCLE_DETECTION.md)(PM/Dependencies DFS·AdminMenu wouldCycle KEEP_SEPARATE).
- 🔴 **중복 depth 엔진 금지** — Chain(§36)·Re-delegation(§37)·Cycle(§38)이 각기 depth 상수를 두지 말고 단일 depth governance 정본(본 문서)을 참조하라.
