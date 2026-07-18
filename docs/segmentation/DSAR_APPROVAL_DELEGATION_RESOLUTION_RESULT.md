# DSAR — Approval Delegation Resolution Result (§31)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §31 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 해소: [DSAR_APPROVAL_DELEGATION_RESOLUTION.md](DSAR_APPROVAL_DELEGATION_RESOLUTION.md) · 우선순위: [DSAR_APPROVAL_DELEGATION_PRIORITY.md](DSAR_APPROVAL_DELEGATION_PRIORITY.md) · 특이성: [DSAR_APPROVAL_DELEGATION_SPECIFICITY_POLICY.md](DSAR_APPROVAL_DELEGATION_SPECIFICITY_POLICY.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=31` → **§31 = 41**(줄범위 1441-1493 · 불릿 41 · 번호 0). 분할 = **지원 결과 enum 23 + 필수 필드 18**(지원결과 DELEGATION_APPLICABLE~BLOCKED 23 · 필수필드 result_id/resolution_id 2 + result/reason codes 2 + matched/excluded/winning delegation 3 + priority/specificity/period/scope/authority result 5 + acceptance/approval/conflict result 3 + next action/status/evidence 3 = 18 · 재검 23+18=41).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_RESOLUTION_RESULT` 엔티티 | `delegation_resolution_result`·`resolution_result` grep **0** — 위임 해소 결과 산출 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 결과 enum 산출 엔진 | 🔴 상위 Delegation Resolution(§30) 엔진 자체 부재 → **결과(result) enum 을 산출할 주체가 없음**(ⓑ §0) | `NOT_APPLICABLE`(Resolution 엔진 부재) |
| matched/excluded/winning delegation | 🔴 후보 위임 매칭·제외·승자 선정 로직 **grep 0**(§28 Candidate·§29 Exclusion Reason 미구동) | `ABSENT`(매칭·제외 산출기 부재) |
| priority/specificity 결과 | 🔴 §32 우선순위·§33 특이성 해소 로직 **전무**(각 문서 NOT_APPLICABLE/ABSENT) → 결과 산출 불가 | `ABSENT`(우선순위·특이성 산출 부재) |

★**Resolution Result 는 상위 Resolution(§30) 엔진의 산출물이다. Resolution 엔진과 그 결과 스키마가 통째로 부재하므로 필드·enum 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 41종**(지원 결과 23 + 필수 필드 18)

### 지원 결과 (23) — Resolution Result enum

| # | 원문 결과값 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DELEGATION_APPLICABLE | 🔴 Resolution 엔진 부재 → 결과값 산출 주체 없음(ⓑ §0) | `NOT_APPLICABLE` |
| 2 | DELEGATION_APPLICABLE_WITH_WARNING | Resolution 엔진 부재 | `NOT_APPLICABLE` |
| 3 | DELEGATION_NOT_APPLICABLE | Resolution 엔진 부재 | `NOT_APPLICABLE` |
| 4 | DELEGATION_NOT_STARTED | Delegation Period(§20)·활성화(§29) 미구동 → 시작 판정 없음 | `NOT_APPLICABLE` |
| 5 | DELEGATION_EXPIRED | 만료 판정기 부재(Period 엔티티 부재) | `NOT_APPLICABLE` |
| 6 | DELEGATION_SUSPENDED | 정지 상태전이 미구동(§30 Suspension 부재) | `NOT_APPLICABLE` |
| 7 | DELEGATION_REVOKED | 폐기 판정기 부재(`revoke`=토큰/자격 폐기 오탐·ⓑ 헤더) | `NOT_APPLICABLE` |
| 8 | ACCEPTANCE_REQUIRED | Delegation Acceptance(§23) 엔티티 부재 | `NOT_APPLICABLE` |
| 9 | APPROVAL_REQUIRED | Delegation Approval(§24) 부재 | `NOT_APPLICABLE` |
| 10 | DELEGATOR_INELIGIBLE | Eligibility Profile(§25) 부재 → 적격 판정 없음 | `NOT_APPLICABLE` |
| 11 | DELEGATE_INELIGIBLE | 상동 | `NOT_APPLICABLE` |
| 12 | AUTHORITY_SCOPE_MISMATCH | Authority 전면 부재(5-3-3-4) → 스코프 대조 불가 | `NOT_APPLICABLE` |
| 13 | RESOURCE_SCOPE_MISMATCH | Resource Binding(§13) 해소 미구동 | `NOT_APPLICABLE` |
| 14 | ACTION_SCOPE_MISMATCH | Action Binding(§14) 해소 미구동 | `NOT_APPLICABLE` |
| 15 | LEGAL_ENTITY_SCOPE_MISMATCH | Legal Entity 전면 void → 대조 불가 | `NOT_APPLICABLE` |
| 16 | MONETARY_LIMIT_EXCEEDED | 금액축 저장계층 부재·원본 Ceiling 부재 → 초과 판정 불가 | `NOT_APPLICABLE` |
| 17 | CURRENCY_SCOPE_MISMATCH | Currency Binding(§19) 도메인 부재 | `NOT_APPLICABLE` |
| 18 | REDELEGATION_BLOCKED | 재위임 거버넌스(§40) 미구동 | `NOT_APPLICABLE` |
| 19 | MAXIMUM_DEPTH_EXCEEDED | Depth Governance(§39) 부재 | `NOT_APPLICABLE` |
| 20 | DELEGATION_CYCLE_DETECTED | 위임 Cycle 검출 부재(PM/메뉴 cycle 은 도메인 상이·ⓑ §2.4) | `NOT_APPLICABLE` |
| 21 | CONFLICT | Delegation Conflict(§34) 산출기 부재 | `NOT_APPLICABLE` |
| 22 | MANUAL_REVIEW_REQUIRED | 수동 검토 라우팅 미구동 | `NOT_APPLICABLE` |
| 23 | BLOCKED | 차단 결과 산출 주체(Resolution 엔진) 부재 | `NOT_APPLICABLE` |

### 필수 필드 (18)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 24 | approval_delegation_resolution_result_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 25 | approval_delegation_resolution_id | Delegation Resolution(§30) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 26 | result | 🔴 상위 23종 결과 enum 산출 엔진 부재 → 결과 필드 미산출 | `NOT_APPLICABLE` |
| 27 | reason codes | Candidate Exclusion Reason(§29) 산출 미구동 → 사유코드 없음 | `ABSENT` |
| 28 | matched delegations | 🔴 후보 위임 매칭 로직 grep 0(§28 Candidate 미구동) | `ABSENT` |
| 29 | excluded delegations | 🔴 제외 위임 산출 로직 0(§29 Exclusion Reason 미매핑) | `ABSENT` |
| 30 | winning delegation | 🔴 승자 위임 선정 로직 0(§32 우선순위·§33 특이성 미구동) | `ABSENT` |
| 31 | priority result | 🔴 우선순위 해소 결과 부재(§32 전량 NOT_APPLICABLE·우선순위 로직 부재) | `ABSENT` |
| 32 | specificity result | 🔴 특이성 해소 결과 부재(§33 전량 ABSENT·특이성 해소 로직 부재) | `ABSENT` |
| 33 | period result | Delegation Period(§20) 엔티티 부재 → 기간 해소 결과 없음 | `ABSENT` |
| 34 | scope result | Delegation Scope(§11) 해소 미구동 → 스코프 결과 없음 | `ABSENT` |
| 35 | authority result | 🔴 Authority Resolution 전면 부재(5-3-3-4) → 권한 해소 결과 없음 | `ABSENT` |
| 36 | acceptance result | Delegation Acceptance(§23) 부재 → 수락 결과 없음 | `ABSENT` |
| 37 | approval result | Delegation Approval(§24) 부재 → 위임 승인 결과 없음 | `ABSENT` |
| 38 | conflict result | Delegation Conflict(§34) 산출기 부재 → 충돌 결과 없음 | `ABSENT` |
| 39 | next action | 다음 조치 라우팅 산출 엔진 부재 → next action 없음 | `ABSENT` |
| 40 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 41 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 41 / 41 전사**(지원결과 23 + 필수필드 18). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 26 · `ABSENT` 13 · `LEGACY_ADAPTER` 2.

> 🔴 **커버 0.** Resolution Result 는 상위 Resolution(§30) 엔진의 산출 스키마이며, 그 엔진이 통째로 부재하므로 어떤 결과값·필드도 `VALIDATED_LEGACY` 가 아니다. 지원 결과 23종은 **Resolution 엔진 부재**로 산출 주체가 없어 `NOT_APPLICABLE`, 필수필드 result_id/resolution_id/result 3종도 동일. `ABSENT` 13건(matched/excluded/winning·priority/specificity/period/scope/authority/acceptance/approval/conflict result·reason codes·next action)은 §28 Candidate·§32 우선순위·§33 특이성 산출기 신설이 선행돼야 존재한다. `LEGACY_ADAPTER` 2건(status·evidence)만 확장 대상 인접 자산이다.

## 2. 규칙

- 🔴 **지원 결과 23종을 "판정 로직 있음"으로 오독 금지** — 결과 enum 은 상위 Delegation Resolution(§30) 엔진이 산출하는 값인데 그 엔진이 부재(`NOT_APPLICABLE`)다. 결과값 상수를 선언한다고 해소가 되는 게 아니며, `MONETARY_LIMIT_EXCEEDED`·`DELEGATION_CYCLE_DETECTED`·`AUTHORITY_SCOPE_MISMATCH` 같은 안전 결과는 **판정 로직이 있어야** 발동한다. enum 존재≠판정 능력(§58 ⑥ "중복 없음≠기능 충족").
- 🔴 **`matched`/`excluded`/`winning delegation` 3필드를 우선순위/특이성 없이 채우지 마라** — 승자 선정은 §32 우선순위(15단)와 §33 특이성(14단) 해소가 동반 구동돼야 성립한다. 현행은 둘 다 미구동(`ABSENT`)이므로 winning delegation 을 임의 채택하면 원문 §33 "가장 넓은 Full Delegation 을 무조건 선택하지 마라" 위반을 구조적으로 유발한다. **매칭 없이 승자 없다.**
- 🔴 **`priority result`/`specificity result`/`scope result`/`authority result` 를 "통과(준수)"로 표기 금지** — 산출기가 부재(`ABSENT`)라 "통과한" 게 아니라 "검증할 로직이 없는" 것이다. 우연한 부재를 준수로 계산 금지(§58 ⑦). Resolution Result 신설 시 이 5개 result 는 §32/§33/§25(Eligibility)/Authority Resolution 신설 이후에만 진실을 담을 수 있다.
- 🔴 **`status`/`evidence` 는 인접 자산 확장** — evidence 정본은 `SecurityAudit::verify():56-68`(`menu_audit_log.hash_chain` 인용 금지·[[reference_menu_audit_log_not_tamper_evident]]) · status 는 합법 전이집합을 별도 선언해 무선언 상태전이(전 도메인 관행)를 답습하지 마라.
