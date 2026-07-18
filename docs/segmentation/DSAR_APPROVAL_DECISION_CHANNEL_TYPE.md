# DSAR — Approval Decision Channel Type (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§16 CHANNEL_TYPE** enum:
`WEB` / `MOBILE` / `API` / `ERP` / `CRM` / `WORKFLOW_ENGINE` / `EMAIL_LINK_REFERENCE` / `SLACK_REFERENCE` / `TEAMS_REFERENCE` / `BATCH_REFERENCE` / `SYSTEM` / `CUSTOM`.

★ **Email/Slack/Teams = 별도 인증/서명/만료 없이 직접 Commit 금지.**

## 2. 기존 구현 대조

승인 명령이 **어떤 채널로 유입됐는지 분류·기록하는 축이 존재하지 않는다.** 4핸들러는 채널 무관하게 동일한 HTTP 요청 → in-place UPDATE 경로만 갖는다. Email 링크·Slack·Teams 를 통한 승인 유입 자체가 결정 도메인에 부재하므로, "외부 채널 승인" 이 코드로 존재하지 않는다.

| 계약 요소 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| channel type 분류/기록 필드 | **부재** | no hits (Command 자체가 영속 안 됨 → 채널 축 없음) |
| Email link 승인 유입 | **부재** | no hits |
| Slack / Teams 승인 액션 | **부재** | no hits |
| Workflow engine 채널 | **부재** | §3.1 Approval workflow ABSENT |
| WEB/API 구분 | 암묵적(구분 안 함) | 4핸들러 모두 채널 무관 단일 UPDATE (`Mapping::approve :288` · `AdminGrowth::approvalDecide :1330` · `Alerting::decideAction :594` · `Catalog::approveQueue :2397`) |

외부 채널(Email/Slack/Teams)을 통한 승인 자체가 없으므로 "별도 인증/서명/만료 없이 Commit" 하는 위반 사례도 현재는 발생하지 않는다 — 그러나 그것은 통제가 있어서가 아니라 **채널 개념 자체가 부재**하기 때문이다.

## 3. 판정

- **Verdict: ABSENT** — Channel Type enum·채널 분류 기록·외부 채널 승인 유입 전무. 외부 채널 승인이 없다(부재이지 통제됨이 아님).
- **선행 의존**: §14 COMMAND(ABSENT — 채널을 담을 명령 레코드 없음)·§15 COMMAND_ENVELOPE(ABSENT — source channel 필드의 자리). Replay/Signature(§40·§43) 부재.
- **cover: 0**.

## 4. 확장/구현 방향 (설계)

- Channel Type 은 **Command Envelope(§15)의 `source channel` 필드로 신설** — 명령 유입 채널을 봉투에 분류·기록. WEB/MOBILE/API/SYSTEM 은 기존 미들웨어 컨텍스트에서 도출 가능.
- Mandatory Control(★): `EMAIL_LINK_REFERENCE`·`SLACK_REFERENCE`·`TEAMS_REFERENCE` 채널은 **별도 인증·서명·만료 없이 Commit 금지** — one-time link consumption(§40)·nonce·expiry 게이트를 봉투에서 강제(fail-closed). 이 통제는 **채널을 신설하기 전에 함께 설계**해야 한다(채널만 열고 게이트를 나중에 = 우회 경로 상시화).
- 외부 채널 승인 도입 시 actor 는 반드시 **`Mapping::actorId`(`:36-53`, CANONICAL·서버도출)** 로 재해석 — Email/Slack user id 만으로 actor 판정 금지(§18 연계). `Alerting::actor()`(`:33-35`) 헤더 신뢰 패턴은 외부 채널로 확장 금지(BLOCKED_SECURITY 확대 위험).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_COMMAND_ENVELOPE]] · [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
