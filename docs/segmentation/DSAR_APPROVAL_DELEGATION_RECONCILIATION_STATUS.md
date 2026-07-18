# DSAR — Approval Delegation Reconciliation 상태 (§50 status enum 27)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §50(2057-2088) Reconciliation 상태 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §1·§3·§4 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> 대사 비교/필드축(§49 45종) = [DSAR_APPROVAL_DELEGATION_RECONCILIATION.md](DSAR_APPROVAL_DELEGATION_RECONCILIATION.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Delegation Reconciliation 상태머신` = **`NOT_APPLICABLE`**(엔티티 전무)

**위임 대사 상태(Reconciliation status)를 산출하는 상태머신이 0건이다.** `APPROVAL_DELEGATION_RECONCILIATION` grep 0 — 대사 엔진 자체가 없으므로([별편 RECONCILIATION §0](DSAR_APPROVAL_DELEGATION_RECONCILIATION.md)) 상태를 부여할 대사 결과도 없다. 아래 27종은 **분기할 대사가 없어** 전량 `NOT_APPLICABLE`(신설)이나, 그중 **외부 소스 5개 mismatch** 는 상태머신뿐 아니라 **소스 커넥터 자체가 부재**해 부재 깊이가 한 단계 더 깊다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_RECONCILIATION` 상태 열거 | grep **0** — 대사 상태머신 부재 | `NOT_APPLICABLE`(부재→신설) |
| 외부 소스(HRIS/Calendar/ERP/Workflow/Tenant Setting) mismatch | 🔴 소스 5개 전부 부재(ⓑ §1·§4) → mismatch 판정 대상 소스 없음 | `ABSENT` |
| 합법 전이집합(MATCH↔MISMATCH↔RESOLVED) | 🔴 전 도메인 합법 전이집합 선언 0(5-3-3-4 §0) → 상태 enum 만으로 상태머신 아님 | `NOT_APPLICABLE` |

★**대사 상태머신 자체가 부재하므로 상태별 능력은 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 부재 깊이를 기록한다.

## 1. 원문 전사 + 판정 — **원문 27종**(Reconciliation 상태)

> ★분모 주의: **측정기 `--sec=50` 총 = 27**(불릿 27). 본 편이 27 전량 담당. 원문 오탈자(`POSITION_INCMUMBENCY_MISMATCH` `:2068`)를 **원문 그대로 전사**(verbatim·정정하지 않음).

| # | 원문 상태 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MATCH | 🔴 대사 상태머신 부재 — 일치 판정할 대사 결과 없음 | `NOT_APPLICABLE` |
| 2 | HRIS_DELEGATION_MISMATCH | 🔴 HRIS 소스 부재(`hris`=`hig`hRis`k` 오탐·ⓑ §1) → mismatch 대상 소스 없음 | `ABSENT` |
| 3 | CALENDAR_DELEGATION_MISMATCH | 🔴 Calendar OOO 소스 부재(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |
| 4 | ERP_DELEGATION_MISMATCH | 🔴 ERP Delegate 소스 부재(ⓑ §1·§4) | `ABSENT` |
| 5 | WORKFLOW_DELEGATION_MISMATCH | 🔴 Workflow Delegate 소스 부재(ⓑ §1·§4 — 외부소스 5개 전부 ABSENT) | `ABSENT` |
| 6 | TENANT_SETTING_MISMATCH | 🔴 Tenant Setting(Vacation Delegate) 소스 부재(grep 0·ⓑ §4) | `ABSENT` |
| 7 | DELEGATOR_AUTHORITY_MISMATCH | Authority 부재(5-3-3-4·ⓑ §3.2)·대사 상태머신 부재 → 분기 대상 없음 | `NOT_APPLICABLE` |
| 8 | DELEGATE_ELIGIBILITY_MISMATCH | Eligibility Profile(§26) 부재·상태머신 부재 | `NOT_APPLICABLE` |
| 9 | ROLE_ASSIGNMENT_MISMATCH | `team_role` flat 실재이나 대사 상태머신 부재 → 분기 대상 없음 | `NOT_APPLICABLE` |
| 10 | POSITION_INCMUMBENCY_MISMATCH | Position 전역 0(ⓑ §3.3)·상태머신 부재 (★원문 오탈자 그대로 전사) | `NOT_APPLICABLE` |
| 11 | LEGAL_ENTITY_MISMATCH | Legal Entity 0(ⓑ §3.3)·상태머신 부재 | `NOT_APPLICABLE` |
| 12 | ORGANIZATION_MISMATCH | Org 엔티티 0(ⓑ §3.3)·상태머신 부재 | `NOT_APPLICABLE` |
| 13 | PERIOD_MISMATCH | Delegation Period 0(ⓑ §2.1)·상태머신 부재 | `NOT_APPLICABLE` |
| 14 | ACCEPTANCE_MISMATCH | Delegate 수락(§23) 부재·상태머신 부재 | `NOT_APPLICABLE` |
| 15 | APPROVAL_MISMATCH | 범용 Approval(§3.1) 부재·상태머신 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 16 | REDELEGATION_POLICY_MISMATCH | 재위임 정책 부재(ⓑ §2.1·§2.4)·상태머신 부재 | `NOT_APPLICABLE` |
| 17 | TASK_ASSIGNEE_MISMATCH | Task 모델 부재·상태머신 부재 | `NOT_APPLICABLE` |
| 18 | DECISION_ACTOR_MISMATCH | Decision 모델·Delegation Snapshot 부재(ⓑ §2.5)·상태머신 부재 | `NOT_APPLICABLE` |
| 19 | DECISION_TIME_MISMATCH | Decision 모델·Delegation Period 부재·상태머신 부재 | `NOT_APPLICABLE` |
| 20 | MONETARY_LIMIT_MISMATCH | 금액축 부재(HIGH_VALUE_KRW boolean·ⓑ §3.2)·상태머신 부재 | `NOT_APPLICABLE` |
| 21 | CURRENCY_SCOPE_MISMATCH | 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2)·상태머신 부재 | `NOT_APPLICABLE` |
| 22 | VERSION_SNAPSHOT_MISMATCH | 불변 버전체인·Case Snapshot 부재(ⓑ §2.1·§2.5)·상태머신 부재 | `NOT_APPLICABLE` |
| 23 | REVOKED_DELEGATION_ACTIVE_TASK | Revoke 라이프사이클·Task 모델 부재(ⓑ §2.1)·상태머신 부재 | `NOT_APPLICABLE` |
| 24 | EXPIRED_DELEGATION_CLAIMED_TASK | expiry 컬럼 자체 부재(영구·ⓑ §2.1)·Task 모델 부재 | `NOT_APPLICABLE` |
| 25 | SUSPENDED_DELEGATION_DECISION_ATTEMPT | Suspension=로그인 스로틀(권한정지 아님·ⓑ §3.4)·Decision 모델 부재 | `NOT_APPLICABLE` |
| 26 | MANUAL_REVIEW | 대사 수동 검토 게이트 부재·상태머신 부재 | `NOT_APPLICABLE` |
| 27 | BLOCKED | 대사 차단 상태 부재·상태머신 부재 | `NOT_APPLICABLE` |

**실측 개수: 27 / 27 전사.** (측정기 `--sec=50` 분모 **27** · 전사 **27** — 정합)

커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 22 · `ABSENT` 5(#2~6 외부소스 mismatch).

> 🔴 **커버 0.** 대사 상태머신이 통째로 부재하므로 어떤 상태도 `VALIDATED_LEGACY` 가 아니다. 22종은 **분기할 대사·상태전이집합 부재**로 `NOT_APPLICABLE`(신설). 외부 소스 mismatch 5종(#2~6)만 `ABSENT` 로 격상 — 다른 상태는 "엔진·선행 엔티티만 세우면 되는" 반면, 이들은 **HRIS/Calendar/ERP/Workflow/Tenant Setting 소스 커넥터가 존재조차 하지 않아**(ⓑ §1·§4) 상태머신 신설만으로는 불가하기 때문이다. (★헤더 지시서는 HRIS/CALENDAR/ERP 를 예시로 명기했고, ⓑ §49/§4 "외부소스 5개 전부 부재"에 따라 WORKFLOW·TENANT_SETTING mismatch 도 동일 근거로 `ABSENT` 로 확장했다 — [별편 RECONCILIATION §1-a #1~5](DSAR_APPROVAL_DELEGATION_RECONCILIATION.md) 5개 비교 `ABSENT` 판정과 정합.)

## 2. 규칙

- 🔴 **상태 enum 27종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로. 특히 원문 오탈자 `POSITION_INCMUMBENCY_MISMATCH`(#10)를 코드 상수로 굳히면 정정 시 마이그레이션 부채가 되니 신설 시 정규 철자(`POSITION_INCUMBENCY_MISMATCH`) 채택 권장(전사는 verbatim 유지).
- 🔴 **외부 소스 mismatch 5종(#2~6)을 "탐지 가능"으로 오표기 금지** — 상태 enum 만 선언하고 소스 커넥터가 없으면 대사가 영원히 `MATCH`(가짜 녹색)로 귀결된다. HRIS/Calendar/ERP/Workflow/Tenant Setting 소스 어댑터가 선행 구축돼야 mismatch 판정이 성립한다(ⓑ §1·§4).
- 🔴 **상태 enum ≠ 상태머신** — 27종 나열만으로 대사가 되지 않는다. 전 도메인에 합법 전이집합 선언이 0(5-3-3-4 §0)이므로, 대사 신설 시 MATCH↔MISMATCH↔MANUAL_REVIEW↔RESOLVED↔BLOCKED 의 **합법 전이집합**을 명시 선언해야 한다.
- 🔴 **코드 변경 0 유지** — 대사 상태머신 신설은 [별편 RECONCILIATION](DSAR_APPROVAL_DELEGATION_RECONCILIATION.md) §2 선행조건(외부 소스 어댑터·Canonical Delegation/Tenant 마스터·§3 4축) 구축 후 **별도 승인세션**(Golden Rule + verify + 배포승인).
