# DSAR — Remediation Workflow: Permission Removal/Role Revocation/Scope Reduction/Assignment Suspension/Account Disable/Notification/Ticket (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §15(Remediation Workflow)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §15는 Review Decision(§10: Revoke/Reduce Scope/Reduce Permission)과 Auto Revocation(§16)이 확정한 검토 결과를 **실 권한 상태 변경으로 집행**하는 액션 계층을 정의한다. 7개 하위 액션: Permission Removal · Role Revocation · Scope Reduction · Assignment Suspension · Account Disable · Notification · Ticket Creation. 본 DSAR은 이 7종 각각이 GeniegoROI 현행 코드에서 어떤 실행 프리미티브로 재활용 가능한지, 그리고 "검토결정 → 자동집행" 오케스트레이션 워크플로 자체가 존재하는지를 정직 판정한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(워크플로) / PARTIAL(개별 액션)**

Ground-Truth ①·②의 공통 결론: Remediation의 **워크플로 오케스트레이션**(검토결정 → 7종 액션 자동 선택·실행 → Evidence 기록 → Notification/Ticket)은 grep 0 · 순신규다. 그러나 7종 액션 중 다수는 **관리자가 수동으로 트리거하는 개별 실행 프리미티브**로 이미 존재한다. 이것이 "재활용 실행액션(수동→자동 승격 대상)"의 실체다 — Certification이 자동으로 "이 배정을 revoke하라"고 결정했을 때, 호출할 함수는 이미 있다. 없는 것은 "왜/언제 호출하는가"를 결정하는 검토 루프다.

### 2.2 하위항목 대조표

| SPEC §15 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Permission Removal | **PARTIAL** | `TeamPermissions.php:356`(`scopeWithinCap`) · `TeamPermissions.php:423`(`clampActions`) — 팀 상한 초과분을 즉시 재클램프해 개별 permission을 축소하는 로직. 검토결정 트리거가 아니라 **assignable 상한 재계산 시 부수효과**로 발생 |
| Role Revocation | **PARTIAL** | `Keys.php:135`(`revoke()`) — api_key `is_active=0` 전환. **관리자 수동 클릭**만 트리거. 검토 캠페인 연동 없음 |
| Scope Reduction | **PARTIAL** | `TeamPermissions.php:356`(`scopeWithinCap`)·`:423`(`clampActions`) 동일 — data_scope 축소 강제 경로는 있으나 access-review 트리거는 부재 |
| Assignment Suspension | **PARTIAL** | `UserAdmin.php:342`(계정 비활성 시 세션 revoke) — "배정 일시정지"가 아니라 "세션 즉시 삭제"이므로 개념상 근접일 뿐 suspend(가역적 정지)와 revoke(세션삭제)는 다르다 |
| Account Disable | **PARTIAL** | `UserAdmin.php:338`(`is_active` 플래그) — 관리자 수동 온/오프. 검토 거부 결과와 무관 |
| Notification | **ABSENT** | 검토결과 통지 grep 0. §18 Reminder Engine과 동일 근본원인(별도 DSAR `DSAR_APPROVAL_CERTIFICATION_REMINDER_ENGINE.md`에서 상술) |
| Ticket Creation | **ABSENT** | 외부 이슈트래커/티켓 연동 grep 0. Remediation 액션 이력을 티켓화하는 코드 없음 |

### 2.3 KEEP_SEPARATE (해당 시)

- `TeamPermissions.php:517`(팀 status `active/disabled/archived` 전환) — 관리자가 팀 단위로 수동 전환하는 상태값이며, 이는 "이 배정을 검토했더니 revoke가 확정되었다"는 access-review 결정의 산출물이 아니다. Remediation 액션의 후보 substrate로만 §4에서 매핑하고, 접근검토 워크플로 자체로 오인해 흡수하지 않는다.
- `AgencyPortal.php:390`(agency_client_link revoke) — 대행사-클라이언트 링크 상태전이이며 role/permission access-review의 Remediation이 아니다(대행사 도메인, ADR D-6).

## 3. Canonical 설계

Remediation Workflow는 Review Decision(§10)·Auto Revocation(§16)이 산출한 결정 이벤트를 입력으로 받아 다음을 수행하는 **결정론적 실행 계약**으로 정의한다.

1. **Action Selection**: Decision 유형(Revoke/Reduce Scope/Reduce Permission)에 따라 7종 중 해당 액션을 매핑 — 예: `Revoke` → Role Revocation + Account Disable(계정 전체 배정이 0이 되는 경우) · `Reduce Scope` → Scope Reduction.
2. **Idempotent Execution**: 동일 Decision ID 재실행 시 상태 변화 없음(중복 revoke 방지).
3. **Evidence Link**: 모든 액션 실행은 Decision Evidence(§11)·Attestation(§12)과 1:1로 연결되어야 하며, Evidence 없는 액션 실행은 Runtime Guard(§29 `Missing Evidence`)가 차단한다.
4. **Notification/Ticket 부수효과**: 액션 실행 성공/실패와 무관하게 대상자·리뷰어·매니저에게 통지, 필요 시 컴플라이언스 티켓 생성.
5. **SecurityAudit 기록**: 모든 실행은 append-only 감사로그(참조 §D-2)에 기록되어야 하며 재구성 가능해야 한다(Explainable Review).
6. **부분 실행 방지**: 7종 액션 중 일부만 성공하고 일부가 실패하는 상태(예: Role Revocation은 성공했으나 Notification은 실패)를 허용하지 않는다 — 핵심 권한변경 액션(Permission Removal/Role Revocation/Scope Reduction/Assignment Suspension/Account Disable)은 원자적(atomic)으로 처리하고, 부가 액션(Notification/Ticket Creation)의 실패는 핵심 액션 롤백 사유가 아니라 별도 재시도 큐로 분리한다.
7. **rollback 정책 없음(의도적)**: Certification Remediation은 원칙적으로 단방향(forward-only)이다 — 잘못된 회수는 새로운 Grant(Part 3-3 Assignment Governance 영역)로 재부여하며, Remediation 자체가 되돌리기(un-revoke)를 제공하지 않는다. 이는 Immutable Decision(SPEC §34) 요구와 정합한다.

### 3.1 액션별 트리거 조건 세분화

- **Permission Removal**: Decision `Reduce Permission` 확정 시 대상 permission 단건 제거. 배정 전체 회수(Revocation)와 구분되는 부분 축소.
- **Role Revocation**: Decision `Revoke` 확정 시 역할 배정 자체를 제거. Permission Removal의 상위 개념(역할에 귀속된 모든 permission이 함께 소멸).
- **Scope Reduction**: Decision `Reduce Scope` 확정 시 data_scope 차원(예: 팀 전체→본인 소유 데이터만)을 축소.
- **Assignment Suspension**: 즉시 회수가 과도한 경우(예: 조사 중) 가역적 일시정지. §2.2에서 밝힌 대로 현행 `UserAdmin.php:342`는 세션 삭제(비가역에 가까움)이므로 Suspension 신설 시 "재개(resume)" 가능한 상태를 별도로 설계해야 한다.
- **Account Disable**: 대상 사용자의 모든 배정이 동시에 회수 대상이 되는 극단적 케이스(예: 퇴사·계약종료)에 한정.
- **Notification/Ticket Creation**: §2.2에서 확인된 대로 완전 신규이며 6장에서 별도 게이트로 관리한다.

### 3.2 실패 처리 계약

- **재시도 정책**: Notification/Ticket Creation은 최대 N회 지수 백오프 재시도 후 실패 시 Escalation Engine(§19, 별도 DSAR)으로 조기 이관.
- **부분 실패 가시성**: Certification Analytics(§20)의 `Revoked Assignments` 지표는 실행 완료 건만 집계하고, 재시도 중인 건은 별도 `Pending Remediation` 상태로 노출해 리뷰어가 오인하지 않도록 한다.
- **Dead Letter**: 재시도 소진 후에도 실패한 핵심 액션(Role Revocation 등)은 관리자 수동 개입 큐로 전환되며, 이 시점에는 현행 `Keys.php:135`·`UserAdmin.php:338` 수동 경로가 최종 안전망(fail-secure fallback)으로 기능한다.

## 4. Kernel/substrate 매핑

| SPEC §15 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Role Revocation | `Keys.php:135`(`revoke()`) | 승격 — 검토결정 호출 인자만 추가, 함수 자체는 재사용 |
| Permission/Scope Reduction | `TeamPermissions.php:356`(`scopeWithinCap`)·`:423`(`clampActions`) | 승격 — 즉시재클램프 로직을 검토결정 트리거로 확장 |
| Assignment Suspension | `UserAdmin.php:342`(세션 revoke) | 승격(개념 재정의 필요 — suspend≠session delete, §3에서 신규 semantics 부여) |
| Account Disable | `UserAdmin.php:338`(`is_active`) | 승격 |
| Notification | (substrate 없음) | 신규 |
| Ticket Creation | (substrate 없음) | 신규 |
| Evidence 연결 | `SecurityAudit.php:12`(클래스)·`:56`(`verify`) | 참조(흡수 아님, ADR D-2) |

## 5. 무후퇴 · Extend

Golden Rule(Wrap): `Keys.php:135`·`UserAdmin.php:338`·`:342`·`TeamPermissions.php:356`·`:423`·`:517`은 **파괴하지 않고** 그대로 유지한다. Remediation Workflow는 이들을 "누가 호출하는가"의 상위 오케스트레이션만 신설한다 — 관리자 수동 호출 경로는 병행 유지(무후퇴). 289차 P1~P5 보안수정(writeGuard 서버강제·admin SSOT·plan fail-secure)이 확립한 fail-secure 원칙을 Remediation 실행 가드에도 동일 적용한다(ADR D-7 재활용, 재플래그 금지). KEEP_SEPARATE 대상(`TeamPermissions.php:517` 팀 status·`AgencyPortal.php:390`)은 access-review 워크플로로 개명·흡수하지 않는다.

두 방향의 정직성을 동시에 지킨다: (a) "이미 자동 remediation이 있다"고 과장하지 않는다 — 인용된 모든 substrate는 관리자가 UI에서 직접 클릭해야만 발동하는 **수동 프리미티브**이며, 검토 캠페인·리뷰어 결정과 연동된 자동 실행은 지금 이 순간까지도 0건이다. (b) "이 프리미티브들이 무의미하다"고 부재를 과장하지도 않는다 — Certification Remediation 엔진이 완성되면 이 함수들을 **그대로 재사용**하므로, 지금 시점에 이들을 리팩터링·삭제·이름변경 하는 것은 Golden Rule 위반이다. 향후 실 구현 세션은 이 함수들의 시그니처를 변경하지 말고, 상위에서 호출하는 새 오케스트레이터만 추가해야 한다.

## 6. 완료 게이트

- [ ] Action Selection Engine 구축(7종 액션 매핑 로직)
- [ ] Idempotent Execution 보장(중복 Decision ID 방어)
- [ ] Evidence Link 강제(Runtime Guard `Missing Evidence` 차단)
- [ ] Notification 채널 신설(§18 Reminder Engine과 별도 DSAR로 연동)
- [ ] Ticket Creation 외부연동 신설
- [ ] `Keys.php:135`·`UserAdmin.php:338/342`·`TeamPermissions.php:356/423` 승격 검증(회귀 0)
- [ ] Assignment Suspension의 "재개(resume)" 가능한 가역적 상태 신규 설계(현행 `UserAdmin.php:342` 세션삭제와의 개념적 차이 해소)
- [ ] 부분 실행 방지(원자적 핵심 액션 + 재시도 큐 분리 부가 액션) 구현
- [ ] BLOCKED_PREREQUISITE 해소 — 선행 Part 1~3-7 인증 및 Review Queue(§9)·Decision(§10) 완료 필요
- [ ] 코드 0 유지(본 세션은 설계만)

## 7. 반날조 인용 출처

- SPEC §15(Remediation Workflow: Permission Removal/Role Revocation/Scope Reduction/Assignment Suspension/Account Disable/Notification/Ticket Creation)
- ADR D-1(Extend·Wrap) · D-2(SecurityAudit 참조) · D-7(정직분리)
- Ground-Truth ① §2.B(회수 수동): `Keys.php:135`·`UserAdmin.php:338`·`:342`·`TeamPermissions.php:517`
- Ground-Truth ① §2.D(위임/재클램프): `TeamPermissions.php:356`(`scopeWithinCap`)·`:423`(`clampActions`)
- Ground-Truth ② §4 B-5(대행사 revoke, KEEP_SEPARATE): `AgencyPortal.php:390`
- (ABSENT 항목: Notification·Ticket Creation — grep 0 실측. 근접물로 채우지 않음)
