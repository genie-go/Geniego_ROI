# DSAR — Revalidation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §23(Revalidation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §23 Revalidation은 특정 변경 이벤트가 발생했을 때 이미 인증(certify)된 배정을 **재검토 대상으로 재소환(re-trigger)**하는 계층이다. 원문 트리거: Policy 변경 · Assignment 변경 · Reviewer 변경 · Organization 변경.

Revalidation은 §22 Drift Detection과 인접하지만 역할이 다르다 — Drift Detection은 "무엇이 변했는가"를 **탐지**하고, Revalidation은 그 탐지(또는 명시적 이벤트)를 근거로 "다시 검토 큐에 넣는다"는 **트리거·상태전이**를 수행한다(ADR D-3 Review Queue 상태머신의 일부). 이 문서는 4개 트리거 조건 각각이 현재 시스템에 실측 가능한 근접 로직이 있는지, 아니면 순수 신설인지를 정직하게 판정한다.

4개 트리거 중 "Assignment 변경"은 특히 주의 깊게 다룬다 — 현재 시스템에 `reclampTeamMembers`(`TeamPermissions.php:810`)라는, 이름 그대로도 "배정 변경에 반응한다"는 실 코드가 있기 때문이다. 이 근접성 때문에 "이미 Revalidation이 구현되어 있다"는 가짜녹색 오판이 가장 발생하기 쉬운 트리거이며, §2.1·§2.3에서 이를 정면으로 다룬다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ② §2 실측표는 §23 Revalidation을 포함한 SPEC §7~§30 전 계층을 ABSENT로 확정한다. 근접 후보로 검토할 만한 유일한 실 코드는 `TeamPermissions.php:810`(reclampTeamMembers)이며, 이는 "권한 정책이 축소되었을 때 팀원 권한을 즉시 재계산해 강제로 좁히는" 로직이다. 그러나 이는 SPEC §23이 정의하는 **주기적/이벤트 기반 review 재트리거(사람의 재검토를 다시 큐에 넣는 거버넌스 동작)**가 아니라, **즉시 자동 재클램프(사람 개입 없는 강제 축소)**다. 두 동작의 목적·산출물이 다르므로 "이미 Revalidation이 구현되어 있다"로 오판하는 것은 금지된다(ADR D-7).

### 2.2 하위항목 대조표

| SPEC §23 트리거 | 판정 | 실 substrate / 근거(허용목록) |
|---|---|---|
| Policy 변경 → 재검증 | ABSENT | 정책 버전 변경을 감지해 관련 배정을 review 큐로 재소환하는 로직 grep 0 |
| Assignment 변경 → 재검증 | ABSENT(근접 substrate PARTIAL — 즉시 재계산이지 재검증 아님) | `TeamPermissions.php:810`(reclampTeamMembers)는 배정/정책 변경 시 팀원 권한을 **즉시 재클램프**하지만, 이는 review 큐에 재검토 항목을 생성하는 것이 아니라 시스템이 스스로 강제 조정하는 것 — SPEC §23의 "사람 재검토 재소환"과 목적이 다름(ADR D-7). 관련 위임 상한 로직(`TeamPermissions.php:613`·`:16`)도 동일하게 즉시 실행형이며 재검증 큐 편입 기능이 없음 |
| Reviewer 변경 → 재검증 | ABSENT | 검토자 배정·교체 시 기존 review를 재트리거하는 로직 grep 0(§9 Review Queue 자체가 ABSENT) |
| Organization 변경 → 재검증 | ABSENT | 조직 개편(부서 이동 등) 시 관련 배정을 재검증 큐에 넣는 로직 grep 0. `AgencyPortal.php:60`·`:208`(만료·휴면), `AgencyPortal.php:390`(revoke)·`:20`·`:69`(상태전이)는 대행사-클라이언트 링크의 상태전이일 뿐 조직변경발 재검증 트리거가 아님(KEEP_SEPARATE) |

### 2.3 KEEP_SEPARATE (해당 시)

- `TeamPermissions.php:810`(reclampTeamMembers)은 **즉시 자동 강제 재계산**이며 §23이 정의하는 "재검증(사람이 다시 확인하도록 큐에 올리는 거버넌스 이벤트)"이 아니다. 두 개념을 혼동해 reclampTeamMembers를 Revalidation 엔진의 이미 완성된 구현체로 개명·흡수하면, 실제로는 "누군가 다시 확인했다"는 보장이 전혀 없는데도 review 완료로 오인되는 가짜녹색이 발생한다(ADR D-7 핵심 경고).
- `AgencyPortal.php:390`(revoke)·`:20`·`:69`(agency_client_link 상태전이)는 대행사 관계의 활성/해지 상태를 관리하는 도메인 로직이며, 조직변경발 access review 재트리거가 아니다.
- 판정 원칙: "이벤트가 발생하면 시스템이 즉시 무언가를 한다"는 형태만으로 트리거·상태전이 substrate로 오판하지 않는다. Revalidation의 본질은 "사람의 재검토를 다시 요구한다"는 거버넌스 행위이며, `reclampTeamMembers`·`AgencyPortal` 상태전이 모두 이 요건(사람 개입 재소환)을 충족하지 않는다.

## 3. Canonical 설계

SPEC §23 원문 기반 신규 설계 계약:

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation_trigger_id | 트리거 이벤트 식별자 |
| 2 | trigger_type | Policy/Assignment/Reviewer/Organization 중 하나 |
| 3 | source_event_ref | 트리거 원인이 된 원 이벤트(정책 변경 이력, 배정 변경 등) 참조 |
| 4 | affected_assignments[] | 재검증 대상이 되는 배정 목록 |
| 5 | queued_at | Review Queue(§9) 재편입 시각 |
| 6 | resolution_deadline | 재검증 완료 기한(SLA) |
| 7 | immediate_action_ref | 병행된 즉시 강제 조치(`reclampTeamMembers` 등) 참조, 존재 시 |

Revalidation은 Review Queue(§9) 상태머신에 새 상태 전이(예: `CERTIFIED → PENDING_REVALIDATION`)를 추가하는 형태로 설계하며, `reclampTeamMembers`류의 **즉시 강제 축소는 그대로 유지한 채 병행**한다 — 즉시 강제와 재검증 큐 편입은 상호 배타가 아니라 fail-secure 관점에서 이중 방어로 공존한다.

resolution_deadline(SLA) 값은 §20 Analytics의 Overdue Reviews 지표가 참조하는 동일 기준을 재사용해야 한다(값 단일소스 원칙) — Revalidation 문서와 Analytics 문서가 서로 다른 SLA 기준을 각자 정의하면 지표 정합성이 깨지므로, 실 구현 세션에서 SLA 정책은 §9 Review Queue 레벨에서 한 번만 정의하고 양쪽이 참조하는 구조로 확정한다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Assignment 변경 감지 트리거 | `TeamPermissions.php:810`(reclampTeamMembers) 호출 지점을 트리거 hook으로 참조 | 신규(hook 신설, 즉시 재계산 로직 자체는 무변경) |
| Policy 변경 감지 | 부재 | 신규 |
| Reviewer 변경 감지 | 부재(§9 Review Queue 선행 필요) | 신규 |
| Organization 변경 감지 | 부재. `AgencyPortal.php:60`·`:208`(만료 필드)는 원료로 참고 가능하나 조직개편 이벤트 소스 아님 | 신규 |
| Revalidation 상태전이 자체 | 부재(§9 Review Queue 상태머신 확장 필요) | 신규 |
| resolution_deadline(SLA) 산출 | 부재(§20 Analytics SLA 기준 공유 필요) | 신규 |
| 주기적 강제 스윕(배치) | 부재 | 신규 |
| immediate_action_ref 연동 | `TeamPermissions.php:810`(reclampTeamMembers) 실행 이력 참조 | 신규(hook), 원 함수 무변경 |

## 5. 무후퇴 · Extend

- Golden Rule Wrap(D-1): `reclampTeamMembers`(`:810`)의 즉시 강제 재계산 동작은 **그대로 유지**한다. Revalidation은 이 함수의 실행을 감지해 별도의 review 큐 항목을 **추가로** 생성하는 hook으로 설계하며, 함수 자체의 로직·반환값·호출 시점을 변경하지 않는다.
- 무후퇴: 즉시 강제 축소(fail-secure 관점에서 이미 유효한 방어선)를 Revalidation 도입 후에도 절대 약화·제거하지 않는다 — "이제 review 큐가 처리하니 즉시 강제는 필요 없다"는 식의 대체는 금지(D-1 Extend, not Replace).
- `AgencyPortal.php` 상태전이 로직은 KEEP_SEPARATE 유지 — 대행사 도메인 상태머신과 access-review 상태머신은 별개 스키마로 설계한다.
- fail-secure: 트리거 감지가 실패하거나 이벤트 소스가 누락된 경우 "재검증 불필요"로 기본 처리하지 않고, 주기적 강제 스윕(예: 정기 배치)으로 누락을 보완하는 이중 안전장치를 설계에 포함(구체 주기는 별도 정책 결정 필요 — 임의 숫자 금지).

본 문서는 SPEC §23 원문·ADR D-1~D-8·Ground-Truth ①②에만 근거하며 실코드 파일을 직접 열람하지 않았다. 4개 트리거 판정은 전부 위 4개 정본의 교차 대조로 도출했다.

## 6. 완료 게이트

- [ ] SPEC §9 Review Queue 상태머신에 재검증 상태(`PENDING_REVALIDATION`) 확장 설계
- [ ] Policy/Reviewer/Organization 변경 이벤트 소스 식별(현재 grep 0 — 이벤트 발행처 신설 필요)
- [ ] Assignment 변경 트리거의 근접 substrate(`reclampTeamMembers`) hook 연동 설계 상세화
- [ ] `reclampTeamMembers` hook 연동 지점 확정(무후퇴 원칙 재검증)
- [ ] `AgencyPortal.php` KEEP_SEPARATE 재검증(오흡수 0 확인)
- [ ] §22 Drift Detection과의 연동 계약(자동 트리거 vs 명시 트리거 구분) 확정
- [ ] resolution_deadline(SLA) 기준이 §20 Analytics Overdue Reviews와 단일소스인지 확인
- [ ] 주기적 강제 스윕(배치) 주기 정책 확정(임의 숫자 금지 원칙 준수)
- [ ] immediate_action_ref 필드가 §9 Review Queue 상태전이와 이중 방어로 공존하는지 재확인
- [ ] 289차 확정분(P4 위임상한 봉인)·EPIC 06-A Part 3-4 판정과 재충돌 여부 최종 확인
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만

## 7. 반날조 인용 출처

- SPEC §23(Revalidation 4개 트리거) / SPEC §9(Review Queue 상태머신 확장 대상) / SPEC §22(Drift Detection과의 연동)
- ADR D-1(Extend-Wrap) · D-3(Review Queue 상태머신) · D-6(KEEP_SEPARATE) · D-7(정직 분리 — 즉시 재계산≠주기 재검증)
- Ground-Truth ① §2.D(위임: `TeamPermissions.php:810` reclampTeamMembers)·§2.C(`AgencyPortal.php:60`·`:208`)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §23 ABSENT 확정)·§4 B-5(`AgencyPortal.php:390`·`:20`·`:69` 상태전이 KEEP_SEPARATE)
- ABSENT 항목(Policy/Reviewer/Organization 변경 트리거, 재검증 상태전이 자체)은 grep 0 실측 — `reclampTeamMembers`(즉시 강제 재계산)를 "이미 재검증이 구현됨"으로 오판·채우기 금지(D-7)
- 본 문서의 핵심 반날조 포인트: Assignment 변경 트리거만 근접 substrate(즉시 강제 재계산)가 있고, 나머지 3개(Policy/Reviewer/Organization)는 원료조차 없는 순수 신설이다 — 4개 트리거를 뭉뚱그려 "일부 구현됨"으로 표기하지 않고 항목별로 분리 판정했다.
- 289차 확정분(P4 manager scope 위임상한 봉인) 및 EPIC 06-A Part 3-4(Scoped Role Governance) 판정과 재충돌하지 않음을 재확인 — 본 문서는 그 위에 재검증 트리거 레이어를 얹을 뿐, 위임 상한 강제 로직 자체를 재플래그하지 않는다.
