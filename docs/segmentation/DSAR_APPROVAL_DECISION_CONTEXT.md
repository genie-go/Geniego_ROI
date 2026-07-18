# DSAR — Approval Decision Context (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§17 CONTEXT** — 필수 필드:
`context_id` · `command_id` · tenant id · actor identity/employment/role assignment/position incumbency/organization/legal entity snapshot · work item/assignment/claim/lease snapshot · authority/delegation snapshot · sequential state snapshot · workflow/chain/decision version · resource snapshot · action scope · amount · currency · risk reference · security/SoD/CoI context · effective timestamp · context hash · status · evidence.

## 2. 기존 구현 대조

명령 처리 시점의 **불변 컨텍스트 스냅샷**을 캡처하는 계층이 존재하지 않는다. 4핸들러는 처리 시점의 actor·tenant 를 라이브 조회만 하고, 그 순간의 identity/employment/authority/assignment/sequential 상태를 **snapshot 으로 동결하지 않는다** — 따라서 Validation↔Commit 사이 Drift(§51)를 탐지할 기준 컨텍스트가 없다.

| 계약 필드 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| tenant id | 존재(라이브) | `Mapping::tenantId`(auth_tenant) · Tenant Guard |
| actor identity snapshot | **부재**(라이브 도출만) | `Mapping::actorId :36-53`(스냅샷 아님·요청시점 조회) · §3.6 Actor Snapshot ABSENT |
| employment/role assignment/position incumbency snapshot | **부재** | §3.6 Position/Org/Legal Entity ABSENT |
| authority/delegation snapshot | **부재** | §3.2 Authority ABSENT · §3.3 Delegation ABSENT |
| assignment/claim/lease snapshot | **부재** | §3.4 Assignment ABSENT |
| sequential state snapshot | **부재** | §3.5 Sequential ABSENT(하드코딩 status flip) |
| resource snapshot · action scope · amount · currency | **부재** | no hits |
| security/SoD/CoI context | **부재** | SecurityAudit::verify(`:56-68`)=감사무결 전용·CoI/SoD 컨텍스트 아님 |
| `context_id` · context hash · effective timestamp | **부재** | no hits |

Snapshot Foundation(§54) 전체가 ABSENT 이므로 Context 는 그 상위에서 파생될 수 없다.

## 3. 판정

- **Verdict: ABSENT** — Decision Context 스냅샷 계층 전무. tenant/actor 는 라이브로만 존재하며 불변 컨텍스트 동결·context hash 는 0.
- **선행 의존(BLOCKED)**: §3.2 Authority·§3.3 Delegation·§3.4 Assignment·§3.5 Sequential·§3.6 Identity(Snapshot) — 컨텍스트가 동결해야 할 상위 5축이 모두 부재. §54 Snapshot Foundation ABSENT.
- **cover: 0**.

## 4. 확장/구현 방향 (설계)

- Context 는 **Command(§14) 수신 즉시 캡처하는 불변 스냅샷** — actor identity·authority·delegation·assignment·sequential state·resource·amount·currency 를 그 시점 값으로 동결하고 context hash 로 봉인. Commit 직전 §32 재검증에서 이 hash 불변을 확인해 Drift 차단.
- **선행 6군 신설이 절대 선행** — 동결할 Authority/Delegation/Assignment/Sequential/Identity Snapshot 이 존재해야 Context 가 의미를 갖는다. 그 전에는 Context 를 만들어도 빈 스냅샷(가짜녹색)이 된다.
- Snapshot 저장 시 §55 Evidence 금지 항목(전체 Session Token·PII·Credential) 준수 — identity snapshot 은 참조/해시로.
- actor identity snapshot 의 source 는 **`Mapping::actorId`(`:36-53`, CANONICAL)** 산출값 — 헤더 위조 경로(`Alerting::actor() :33-35`) 배제(BLOCKED_SECURITY).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_COMMAND]] · [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
