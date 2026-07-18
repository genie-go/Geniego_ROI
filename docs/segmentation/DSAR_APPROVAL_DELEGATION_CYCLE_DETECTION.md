# DSAR — Approval Delegation Cycle Detection (§38)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §38 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=38` → **탐지 목록 9**(육안 금지·측정기 산출).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation Cycle 개념 | 🔴 Delegator→Delegate 위임 관계 자체 부재(ⓑ §1·§2.4) → 순환할 위임 간선(edge) 없음 · Self-delegation/Cycle 무발동(ⓑ §5) | `ABSENT`(신설) |
| 인접 순환검출 알고리즘 (1) | `PM/Dependencies.php:79-100`(DFS·tenant 매홉·depth<10000) — **PM 태스크 의존성 그래프** · Delegation Chain 아님(ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 인접 순환검출 알고리즘 (2) | `AdminMenu::wouldCycle:540-555`(메뉴트리 조상 walk·depth<100) — **메뉴 계층** · Delegation Chain 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 인접 순환검출 알고리즘 (3) | `PM/Gantt` Kahn(위상정렬) — **간트 스케줄** · Delegation Chain 아님 | `KEEP_SEPARATE_WITH_REASON` |
| Position / Organization 기반 Cycle | 🔴 Position 엔티티 0·Org Unit/Hierarchy 부재(ⓑ §3.3) → position/org owner 기반 순환 판정 대상 자체 없음 | `ABSENT` |

★**Delegation Cycle 은 위임 간선이 없어 무발동이다.** 아래 §1은 원문 탐지 목록(신설 대상)이며, 인접 알고리즘 3종은 §0에 `KEEP_SEPARATE_WITH_REASON`으로 분리 기록한다(§1 분모에 계상하지 않음).

## 1. 원문 전사 + 판정 — **원문 9종**(탐지 목록·측정기 §38=9)

| # | 원문 탐지 대상 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | A → A | 🔴 Self-delegation 개념 부재 — Delegation 없어 자기순환 무발동(ⓑ §5) | `ABSENT` |
| 2 | A → B → A | 🔴 위임 간선 부재 → 2-hop 순환 판정 대상 없음 | `ABSENT` |
| 3 | A → B → C → A | 🔴 위임 간선 부재 → 다중 hop 순환 판정 대상 없음 | `ABSENT` |
| 4 | 동일 Subject가 서로 다른 Role로 Cycle 구성 | 🔴 위임 관계 부재 · `team_role`=flat enum 3값(role 기반 순환 그래프 없음·ⓑ §3.3) | `ABSENT` |
| 5 | Position 기반 Cycle | 🔴 Position 엔티티 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) → position 순환 대상 없음 | `ABSENT` |
| 6 | Organization Owner 기반 Cycle | 🔴 Org Unit/Hierarchy 부재·`parent_user_id`가 최상위 owner로 붕괴(ⓑ §3.3) → org owner 순환 대상 없음 | `ABSENT` |
| 7 | Emergency Delegation과 Standard Delegation 간 Cycle | 🔴 Emergency/Standard Delegation 유형 자체 부재(§4 전 항목 ABSENT·ⓑ §1) | `ABSENT` |
| 8 | Future-dated Delegation 활성화 시 Cycle | 🔴 Scheduled/Future-dated Delegation 부재 · `valid_to`/effective 미래 활성화 개념 0(ⓑ §3.2) | `ABSENT` |
| 9 | Delegation Version 변경으로 새 Cycle 발생 | 🔴 Delegation Version 엔티티 부재(ⓑ §2.1) → 버전 변경 재순환 판정 대상 없음 | `ABSENT` |

**실측 개수: 9 / 9 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 9 · (그 외 0).

> 🔴 **커버 0.** Delegation 위임 간선 자체가 없어 9개 탐지 대상 전부 `ABSENT`(무발동)다. §0의 인접 순환검출 3종(`PM/Dependencies` DFS·`AdminMenu::wouldCycle`·`PM/Gantt` Kahn)은 **PM/메뉴 도메인**이므로 `KEEP_SEPARATE_WITH_REASON`이며 이 탐지 목록의 커버가 아니다. 신설 시 알고리즘은 참조하되 재구현하지 마라.

## 2. 원문 verbatim 명기 (§38 차단 원칙 — 무수정)

> Cycle이 발견되면 활성화를 차단하라.

→ 신설 시 A→A / A→B→A / A→B→C→A 및 Position·Organization Owner·Emergency-Standard·Future-dated·Version 변경 기반 순환을 탐지하고, **발견 즉시 Delegation 활성화를 차단**해야 한다(`BLOCKED_CYCLE_RISK`).

## 3. 규칙

- 🔴 **cycle 검출 알고리즘을 재구현하지 마라(참조만)** — `PM/Dependencies.php:79-100`(DFS 방문표시·재귀 스택)·`AdminMenu::wouldCycle:540-555`(조상 walk) 골격을 **참조**하되, 노드=Subject(또는 Position/Org Owner)·간선=Delegator→Delegate로 재해석하고 tenant·legal entity·authority 축을 추가하라. **중복 순환검출 엔진 금지.**
- 🔴 **Cycle 발견 시 활성화 차단**(§38 verbatim) — 판정 어휘 `BLOCKED_CYCLE_RISK`. 활성화 이후 감지가 아니라 **활성화 게이트에서 선차단**.
- 🔴 **Position/Organization 기반 Cycle 은 선행조건 신설 후에만 판정 가능** — Position 엔티티·Org Hierarchy(ⓑ §3.3 부재)가 신설되기 전에는 5·6번을 "통과"로 계산 금지(우연한 부재를 준수로 오계상 금지).
- 🔴 **depth 기반 순환 종료조건은 depth governance 정본을 따르라** — [DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md](DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md)(§36/§37/§38 합성). PM/메뉴 상수(`depth<10000`·`depth<100`) 그대로 상속 금지.
