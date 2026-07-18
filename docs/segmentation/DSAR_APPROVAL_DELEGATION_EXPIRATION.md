# DSAR — Approval Delegation Expiration (§45 처리 항목)

> EPIC 06-A-01 Delegation Foundation · 289차 13회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §45 Expiration(1878-1892) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=45` → **Expiration 처리 항목 10**(불릿10·번호0·육안 금지·측정기 산출).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation Expiration 처리 | 🔴 만료 처리 개념 **전무**(ⓑ §1·§4) — Delegation Period(§20) 엔티티 부재·`valid_to`/`effective_to` grep **0**(ⓑ §3.2) → 자동 만료 트리거·워커 0 | `ABSENT`(신설) |
| New Candidate / Backup Delegate | 🔴 Delegation Candidate(§28)·Backup/Substitute Delegate 부재(`backup`→DB백업 오탐·ⓑ §0 grep 오염) — 만료 시 후보 재생성/대체 평가 대상 0 | `ABSENT` |
| Assignment Eligibility 제거 | 🔴 Assignment Engine=EPIC 06-A-02 비대상(§0 상세구현 제외 목록) — 만료 이벤트 소비자 미구현 | `NOT_APPLICABLE`(06-A-02) |
| Audit Event 정본 | `SecurityAudit::verify():56-68`(preimage ts·`hash_equals`·`prev_hash`·tenant) — 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |

★**Delegation Expiration 처리 자체가 부재**하므로 처리 항목 단위 커버는 원천 불가. 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재/비대상/인접"을 기록한다. `VALIDATED_LEGACY` 0 (cover 0).

## 1. 원문 전사 + 판정 — **§45 처리 항목 10종**

| # | 원문 처리 항목 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | New Candidate 생성 중지 | 🔴 Delegation Candidate(§28) 엔티티 부재 — 중지할 후보 생성 경로 0(`delegation_candidate` grep 0) | `ABSENT` |
| 2 | New Assignment Eligibility 제거 | 🔴 Delegation Eligibility(§25) 부재 + Assignment 자격은 EPIC 06-A-02 대상 — 제거할 자격 상태 미정의 | `ABSENT` |
| 3 | Pending Decision 재검증 | 🔴 Approval Decision(§3.1) 부재 · Decision 시점 재검증(5.11) 미구현 — 재검증 대상 pending decision 집합 0 | `ABSENT` |
| 4 | Claimed Task 재검증 | 🔴 Task Claim 도메인 미구현(06-A-02)·Claim 엔티티 0 — 재검증할 claimed task 없음 | `ABSENT` |
| 5 | Unclaimed Task Assignment Engine 전달용 이벤트 생성 | 🔴 Assignment Engine = **EPIC 06-A-02 비대상**(§0 상세구현 제외)·이벤트 소비자 미구현 → 본 블록 대상 아님 | `NOT_APPLICABLE` |
| 6 | Delegation Snapshot 생성 | 🔴 Delegation Snapshot(§41) 엔티티 grep 0(ⓑ §2.5) — 만료 시점 동결 대상 없음 | `ABSENT` |
| 7 | Reconciliation 생성 | 🔴 Delegation Reconciliation(§43) 엔티티 부재 — 생성 대상 없음 | `ABSENT` |
| 8 | 원본 Actor 복귀 가능성 평가 | 🔴 Delegator/원본 Actor 복귀 로직 부재 · Manager Resolver **ABSENT**(`parent_user_id`가 owner로 붕괴·ⓑ §3.3) — 복귀 대상·평가 기준 0 | `ABSENT` |
| 9 | Backup Delegate 평가 | 🔴 Backup/Substitute Delegate(§8 BACKUP_APPROVER·§17) 부재(`backup`→DB백업 오탐·ⓑ §0) — 대체 평가 대상 0 | `ABSENT` |
| 10 | Audit Event 생성 | 🔴 정본 = `SecurityAudit::verify():56-68`(검증형 근거·확장 대상)·`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(Audit Event) · `NOT_APPLICABLE` 1(Unclaimed Task Assignment Engine 이벤트) · `ABSENT` 8.

> 🔴 **커버 0.** Delegation Expiration 처리가 통째로 부재하므로 어떤 처리 항목도 `VALIDATED_LEGACY` 가 아니다.
> - `LEGACY_ADAPTER` 1건(Audit Event=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다.
> - `NOT_APPLICABLE` 1건(Unclaimed Task Assignment Engine 전달 이벤트)은 **EPIC 06-A-02 Assignment Engine 비대상** — 본 블록은 Delegation 정의/검증/버전/해석/Snapshot/Simulation·Runtime Governance만 완성(§0 목적).

## 2. 원문 verbatim 명기 (§45 Expiration — 무수정)

> Expiration 시 다음을 처리하라.
> New Candidate 생성 중지 / New Assignment Eligibility 제거 / Pending Decision 재검증 / Claimed Task 재검증 / Unclaimed Task Assignment Engine 전달용 이벤트 생성 / Delegation Snapshot 생성 / Reconciliation 생성 / 원본 Actor 복귀 가능성 평가 / Backup Delegate 평가 / Audit Event 생성

## 3. 규칙

- 🔴 **만료 트리거를 신설하되 `valid_to`/`effective_to` 부재를 상속하지 마라** — Delegation Period(§20)에 폐구간 종료시각(+timezone·grace period·review date)을 필수로 두고 자동 만료(`automatic expiration`)를 워커로 구동하라. 종료일 없는 Delegation 은 `PERMANENT_WITH_REVIEW` 유형 + Review Date 필수(§5.3·§20).
- 🔴 **Unclaimed Task Assignment Engine 전달 이벤트는 본 블록에서 상세구현 금지**(`NOT_APPLICABLE`) — 이벤트 **발행 계약(shape)** 만 명세하고 소비/재분배는 EPIC 06-A-02 로 이월(§0 제외 목록). Delegation ↔ Task Reassignment 분리(§5.10).
- 🔴 **Audit Event 를 `menu_audit_log.hash_chain` 으로 구현 금지** — 정본 = `SecurityAudit::verify()` 확장(중복 엔진 금지·[[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **원본 Actor 복귀 평가는 Manager Resolver 신설 선행** — 현재 `parent_user_id` 판독자가 owner/tenant 로 붕괴(ⓑ §3.3)하여 "원본 승인자→복귀 대상" 관계 산출 불가. 별도 승인세션.
