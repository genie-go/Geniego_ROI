# DSAR — Approval Decision Actor Resolution (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§18 ACTOR_RESOLUTION** — 해석 순서:
Authenticated Principal → Canonical Subject → Actor Subject Claim → Tenant Membership → Active Identity → Active Employment/허용 External → Role Assignment → Position Incumbency → Security Suspension → Current Assignee → Delegate → Substitute/Acting → Explicit Admin Authority → SoD → CoI.

★ **Display Name / Email / Channel User ID 만으로 판정 금지.**

## 2. 기존 구현 대조

Actor Resolution 은 **핸들러마다 불균일**하다 — 같은 승인 도메인 안에서 한쪽은 서버 인증 컨텍스트에서 위조불가하게 도출하고, 다른 쪽은 클라이언트 헤더를 그대로 신뢰한다. 이 불균일이 본 엔티티의 핵심 소견이다.

| 핸들러 | actor 도출 방식 | 근거(허용목록) | 판정 |
|---|---|---|---|
| **`Mapping`** | 서버 인증 컨텍스트 — ① `auth_key`(api_key 행·위조불가) ② session→app_user JOIN ③ 미확인 시 **fail-closed null**(호출측 403) | `Mapping::actorId :36-53` · 403 `:247` | **CANONICAL** |
| `AdminGrowth` | actor session(서버측) | `AdminGrowth::approvalDecide` actor `:197` | PARTIAL(서버측이나 순서 미검증) |
| `Catalog` | **승인자 미기록** | `Catalog::approveQueue :2383-2407`(bulk UPDATE·approver 필드 없음) | PARTIAL(누락) |
| ★ **`Alerting`** | `X-User-Email` 헤더 → 없으면 `?actor=` 쿼리파라미터 → `'unknown'` | `Alerting::actor() :33-35` | **BLOCKED_SECURITY** |

★ **`Alerting::actor()`(`:33-35`) 는 클라이언트가 보내는 `X-User-Email` 헤더 또는 `?actor=` 쿼리스트링을 그대로 actor 로 채택한다.** 값만 바꾸면 임의의 승인자로 위조되고, 미전송 시 `'unknown'` 으로 얼버무린다 — §18 의 "Display Name/Email/Channel User ID 만으로 판정 금지" 를 정면 위반. 이는 계약 위반이자 실보안 결함이다.

계약이 요구하는 후단(Role Assignment → Position Incumbency → Security Suspension → Current Assignee → Delegate → Substitute → Admin Authority → SoD → CoI)은 어느 핸들러에도 없다 — Assignment/Authority/Delegation(§3.2·3.3·3.4) 자체가 ABSENT.

## 3. 판정

- **Verdict: PARTIAL(불균일)** — 전반부(Authenticated Principal→Canonical Subject→Tenant Membership→Active Identity)는 **`Mapping::actorId`(`:36-53`)에서 CANONICAL** 로 구현됨. 그러나 **`Alerting::actor()`(`:33-35`)는 BLOCKED_SECURITY**(헤더 위조). 후반부 순서(Role/Position/Assignee/Delegate/Admin/SoD/CoI)는 ABSENT.
- **선행 의존**: §3.2 Authority·§3.3 Delegation·§3.4 Assignment(모두 ABSENT) — Current Assignee/Delegate/Substitute/Admin Authority 단계는 그 상위 없이는 해석 불가.
- **cover: 부분** — 인증 principal ~ active identity 단계는 `Mapping::actorId :36-53` 로 커버(정본). 나머지 0.

## 4. 확장/구현 방향 (설계)

- **`Mapping::actorId`(`:36-53`)를 전 승인 도메인의 유일 Actor Resolution 정본으로 통일**(CANONICAL·Golden Rule=Extend). api_key/session 위조불가 도출 + 미확인 fail-closed null 패턴을 Command Envelope(§15) 레벨로 끌어올려 모든 핸들러가 공유.
- ★ **`Alerting::actor()`(`:33-35`) 헤더/쿼리 신뢰 제거는 Mandatory Control** — 승인 판정 경로에서 클라이언트 제공 Email/actor 파라미터를 actor 로 채택 금지(fail-closed). 이는 BLOCKED_SECURITY 로 실 구현 세션의 최우선 봉합 대상.
- `Catalog::approveQueue`(`:2383-2407`) 승인자 미기록은 actor 축을 UPDATE 에 반드시 남기도록 확장.
- 후반 순서(Role Assignment 이후)는 **선행 6군(Authority/Delegation/Assignment/Sequential) 신설에 의존** — 그 전 단계까지만 판정하고 이후는 BLOCKED_PREREQUISITE 로 명시(순서를 조용히 건너뛰지 말 것).
- Display Name/Email/Channel User ID → Canonical Subject 매핑은 라이브 조회가 아니라 **Actor Snapshot(§54)로 동결**(§3.6 Actor Snapshot ABSENT — 함께 신설).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CONTEXT]] · [[DSAR_APPROVAL_DECISION_ELIGIBILITY]] · [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
