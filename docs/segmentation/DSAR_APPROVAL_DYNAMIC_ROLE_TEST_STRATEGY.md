# DSAR — Dynamic Role Test Strategy (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Test Strategy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§35(테스트)는 **Unit(Rule/Context/Projection/Runtime) · Integration(Assignment/Scope/Permission) · Security(Rule Injection/Context Injection/Unknown Permit/Policy Bypass) · Regression(Approval/Workflow/Assignment)**을 정의한다. ★CLAUDE.md 확정 사실 — "이 저장소에는 구성된 lint/test 스크립트가 없다(no `npm test`, no PHPUnit suite)". 따라서 §35의 4개 대분류 **전부 실행 가능한 테스트 코드 기준으로는 ABSENT**다. 본 문서는 4개 대분류·13개 세부 항목이 겨눌 **실 substrate 표적**(테스트 코드가 아니라 검증 대상 함수/시나리오)을 근접 인용과 함께 명세한다.

## 2. Canonical 필드

- **테스트 항목** — §35 원문 13종 중 1
- **분류** — Unit/Integration/Security/Regression
- **검증 표적** — 실 substrate 함수/시나리오(file:line, 없으면 ABSENT)
- **판정** — 테스트 코드 존재 여부(전항목 ABSENT) + 표적 substrate 존재 여부(PARTIAL/ABSENT)

## 3. 열거형 / 타입

**Unit(원문)**: Rule · Context · Projection · Runtime.
**Integration(원문)**: Assignment · Scope · Permission.
**Security(원문)**: Rule Injection · Context Injection · Unknown Permit · Policy Bypass.
**Regression(원문)**: Approval · Workflow · Assignment.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 분류 | 항목 | 검증 표적(현행 근접 substrate) | 판정 |
|---|---|---|---|---|
| 1 | Unit | Rule | RBAC Rule Engine 자체 grep 0(EXISTING_IMPLEMENTATION §2) — `RuleEngine.php`는 마케팅 KEEP_SEPARATE라 표적 아님 | **ABSENT(표적 없음)** |
| 2 | Unit | Context | `user_session`(`Db.php:1111-1119`)·`recordSessionMeta`/`listSessions`(`UserAuth.php:4243-4281`) — 기록·표시용, role 결정 미사용 | **PARTIAL(표적 존재·role 미연동)** |
| 3 | Unit | Projection | Dynamic Permission/Scope Projection 스키마 부재(ADR §3 순신규) | **ABSENT(표적 없음)** |
| 4 | Unit | Runtime | Dynamic/Runtime/Session/Conditional Role 개념 자체 grep 0(EXISTING_IMPLEMENTATION §1) | **ABSENT(표적 없음)** |
| 5 | Integration | Assignment | Part 3-3 Role Assignment 영역(별도 DSAR, 코드 0 선행) | **BLOCKED_PREREQUISITE** |
| 6 | Integration | Scope | ABAC data_scope(`TeamPermissions.php:236-322`) — Part 3-4 Scoped Role 영역과 결합 지점, Dynamic Role의 attribute source(ADR D-1 ABAC_SUBSTRATE) | **PARTIAL(표적 존재·테스트 0)** |
| 7 | Integration | Permission | Part 2 Permission Engine 결합 지점(코드 0, 선행 미구현) | **BLOCKED_PREREQUISITE** |
| 8 | Security | Rule Injection | RBAC Rule Engine 자체가 없으므로 injection 표적 자체 없음(#1과 동일 근거) | **ABSENT(표적 없음)** |
| 9 | Security | Context Injection | index.php RBAC 게이트(`:572-598`)·`guardTeamWrite`(`:82-89`)의 요청 컨텍스트 판정이 근접이나, 전용 Dynamic Context Injection 시나리오가 아님(EXISTING_IMPLEMENTATION §5·§6) | **PARTIAL(표적 존재·테스트 0)** |
| 10 | Security | Unknown Permit | ★ADR D-2 "UNKNOWN Permit 금지" 원칙의 근접 방어=`effectiveScope` fail-closed(DENY_SCOPE `TeamPermissions.php:234,251,260-263`) — 이 방어를 Rule Evaluation 전역으로 확장하는 것이 신규 표적. 현재는 이 한 지점만 방어, 신설 Rule Engine 전역에는 아직 적용 대상 자체가 없음 | **PARTIAL(근접 방어 실재·전역 미확장)** |
| 11 | Security | Policy Bypass | index.php RBAC 게이트(`:572-598`)·`guardTeamWrite`(`:82-89`) 이진 게이트 우회 여부가 근접 표적 | **PARTIAL(표적 존재·테스트 0)** |
| 12 | Regression | Approval | Part 3-3/3-4 계열 Approval 영역(별도 DSAR) 참조 | 별도 문서 참조 |
| 13 | Regression | Workflow | 이 3문서 인용범위 내 전용 Workflow substrate 인용 없음 — 별도 문서/재조사 필요 | **OUT_OF_SCOPE(인용범위 밖)** |
| 14 | Regression | Assignment | Part 3-3 Assignment 영역(별도 DSAR) 참조 | 별도 문서 참조 |

## 5. 설계 원칙

1. **"테스트 스크립트 0"과 "검증 표적 부재"는 다르다** — Unit/Integration/Security 대부분(#2·#6·#9·#10·#11)은 검증할 실 substrate가 이미 존재한다(PARTIAL). Projection(#3)·Runtime(#4)·Rule(#1)·Rule Injection(#8)만 표적 자체가 없다.
2. **Security > Unknown Permit(#10)이 최우선 테스트 표적** — ADR D-2 핵심 안전 규율의 유일한 실 방어선(`TeamPermissions.php:234`)을 재현·확장하는 테스트 케이스는 "신규 기능 검증"이 아니라 "기존 안전 규율이 Rule Evaluation 전역에 아직 확장되지 않았음"을 실증하는 항목. 이번 차수는 코드 미변경(설계만).
3. **Integration > Assignment/Permission(#5·#7)은 BLOCKED_PREREQUISITE로 고정** — Part 2/Part 3-3이 코드 0(설계만)이므로 결합 테스트 자체가 성립하지 않음.
4. **Context(#2)/Context Injection(#9)은 기존 세션 기록 로직을 대체하지 않고 그 위에 검증 레이어 추가** — `user_session`/`recordSessionMeta` 무후퇴 유지.
5. **Regression > Workflow(#13)는 이 3문서 인용범위 밖으로 정직 유보** — 타 도메인(마케팅 automation KEEP_SEPARATE·PM 모듈 등)의 무후퇴 근거를 이 Part 3-5 ground-truth에서 임의 차용하지 않는다(반날조 원칙).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 전체 테스트 코드 실행은 Canonical Rule/Context/Projection/Runtime Registry 실구현 + Permission Engine(Part 2)·Role Assignment(Part 3-3) 실구현 이후. Integration > Assignment(#5)·Permission(#7)은 선행 자체가 부재해 결합 테스트 성립 불가.
- **ABSENT(표적 없음)**: Unit > Rule(#1)·Projection(#3)·Runtime(#4)·Security > Rule Injection(#8).
- **OUT_OF_SCOPE**: Regression > Workflow(#13) — 인용범위 밖, 별도 재조사.
- **REAL(최우선 표적)**: Security > Unknown Permit(#10) — ADR D-2 안전 규율의 전역 미확장 상태를 재현하는 시나리오, 실 확장 전까지 정직 기록.
- **PARTIAL(표적 존재·테스트 코드 0)**: 나머지 전 항목.
- **판정**: NOT_CERTIFIED · 실 테스트 스위트 = Canonical Rule/Context/Projection/Runtime Registry 신설 + PHPUnit/CI 파이프라인 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
