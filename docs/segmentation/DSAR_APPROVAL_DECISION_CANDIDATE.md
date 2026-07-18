# DSAR — Approval Decision Candidate (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§22 CANDIDATE` — Decision Actor Candidate.

TYPE (7): `CURRENT_ASSIGNEE` · `VALID_DELEGATE` · `SUBSTITUTE_APPROVER` · `ACTING_APPROVER` · `ADMINISTRATIVE_ACTOR` · `SYSTEM_ACTOR` · `CUSTOM`.

필수 필드 (12): `candidate_id` · `command_id` · candidate type · subject id · assignment id · delegation version id · authority resolution id · eligibility result · priority · exclusion reasons · selected · status · evidence.

전제(§18 Actor Resolution 순서): Authenticated Principal → Canonical Subject → Actor Subject Claim → Tenant Membership → Active Identity → Active Employment/허용 External → Role Assignment → Position Incumbency → Security Suspension → **Current Assignee → Delegate → Substitute/Acting** → Explicit Admin Authority → SoD → CoI. ★Display Name/Email/Channel User ID만으로 후보 판정 금지.

## 2. 기존 구현 대조

- **Candidate 엔티티 부재**: `candidate_id`·candidate type·`assignment id`·`delegation version id`·`authority resolution id`를 담는 후보 산출/선정 구조가 실존하지 않는다. 4개 승인 결정 핸들러는 모두 후보 집합을 계산하지 않고, 요청 시점에 도착한 actor를 곧바로 결정자로 취급한다.
- **CURRENT_ASSIGNEE 부재**: Assignment(선행 §3.4)가 **ABSENT**(omni_outbox는 패턴참조일 뿐). `Mapping::approve`(:238-293)의 정족수 검사는 승인 카운트(:287)일 뿐 "이 actor가 이 슬롯의 배정 담당자인가"를 검증하는 Assignment 참조가 없다. 자기승인차단(:268)·중복차단(:278)은 후보 자격이 아니라 사후 필터다.
- **VALID_DELEGATE 부재**: Delegation(선행 §3.3)이 **ABSENT**. `TeamPermissions.php:614-647`의 `DELEGATION_EXCEEDED`는 위임 위계가 아니라 RBAC 부여상한 오탐이므로 Delegate 후보의 근거가 될 수 없다.
- **ADMINISTRATIVE_ACTOR만 근사 존재**: `AdminGrowth::approvalDecide`(:197 세션 actor)와 `Mapping`(:36-53 api_key/session, 미확인 fail-closed null·:247 403)은 관리 주체의 신원 해석에 그친다 — 이는 §18 순서 중 Authenticated Principal~Admin Authority 축의 부분치일 뿐, 후보 **집합**과 exclusion reasons·priority·selected 산출이 아니다.
- **actor 위조 위험**: `Alerting::actor()`(:33-35)는 `X-User-Email`/`?actor=` 헤더로 주체를 받는다 — Channel User ID/Email만으로 후보를 판정하지 말라는 §22/§18 금칙의 정확한 반례다.

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존: §3.4 Assignment(ABSENT) + §3.3 Delegation(ABSENT). Candidate의 핵심 타입 `CURRENT_ASSIGNEE`/`VALID_DELEGATE`/`SUBSTITUTE_APPROVER`/`ACTING_APPROVER`는 Assignment·Delegation 축이 없으면 산출 자체가 불가능하다. Actor Resolution 상위축(§3.6 Identity/Security)은 PARTIAL이나, 후보 집합의 분모가 되는 배정/위임이 부재하여 전체가 막힌다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **선행 신설 필수**: Candidate는 Assignment(§3.4)·Delegation(§3.3) 실엔티티가 선행 신설된 뒤에만 구현 가능. 두 축 부재 상태에서 Candidate 테이블을 먼저 만들면 `assignment id`·`delegation version id`가 항구적 NULL이 되어 장식이 된다(가짜녹색 클래스).
- **재사용 자산**: 주체 해석은 `Mapping`의 actor 확정(:36-53, 미확인 fail-closed null)을 Canonical Actor Resolution의 출발점으로 확장. `Alerting::actor()`(:33-35) 헤더 위조 경로는 후보 산출 입력에서 **배제(BLOCKED_SECURITY)** — Authenticated Principal이 아닌 Display Name/Email을 후보 근거로 삼지 말 것.
- **Mandatory Control**: 후보 산출은 Fail-closed — Active Identity·Active Employment·Security Suspension 미통과 주체는 후보에서 exclusion reasons와 함께 제외하고, `selected` 후보 0이면 결정 진행 차단.
- 실 구현 = 별도 승인 세션(Golden Rule = Extend·무후퇴·verify·배포 승인). 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
