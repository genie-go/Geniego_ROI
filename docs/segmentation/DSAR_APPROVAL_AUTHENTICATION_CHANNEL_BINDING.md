# DSAR — Approval Authentication Channel Binding (06-A-03-02-03-03 · §25)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§25 Channel Binding** — channel 11종:
`WEB` · `MOBILE` · `API` · `ERP` · `WORKFLOW_ENGINE` · `EMAIL_LINK_REF` · `SLACK_REF` · `TEAMS_REF` · `SYSTEM` · `BATCH` · `CUSTOM`.

★ **Email/Slack/Teams Identity 만으로 Canonical Actor 결정 금지**(§5.11·§62). 채널이 전달한 사용자 식별자(Email 헤더, Slack/Teams user id)는 인증 Context 없이 신뢰 불가.

## 2. 기존 구현 대조

- **채널 자체는 사실상 WEB/API 두 갈래로만 존재**하고, 그 채널을 승인 레코드에 **결합·검증하는 구조는 없다.**
  - `WEB`/`MOBILE`: 세션 토큰(`UserAuth.php:964-970`) 경유 — 채널을 구분 저장하지 않음.
  - `API`: api_key(`index.php:483-493`) — 채널이 아니라 인증수단으로만 취급.
  - `ERP`/`WORKFLOW_ENGINE`/`BATCH`/`SYSTEM`: 별도 채널 개념 부재(Service Account/System Actor governance 자체가 ABSENT).
- **★`EMAIL_LINK_REF`/`SLACK_REF`/`TEAMS_REF` 위반 실사례(BLOCKED_SECURITY):** `Alerting::actor()`(`Alerting.php:33-36`)는 클라이언트가 보내는 `X-User-Email` 헤더(없으면 `?actor=` 쿼리)를 그대로 actor 로 채택한다. 이는 §25 가 금지한 "Email Identity 만으로 Canonical Actor 결정" 을 정면 위반하며, `decideAction`(`Alerting.php:574,591,593,597`)·policy ops(`:82,127,171,189,603`)가 이 위조 가능한 채널 식별자를 `action_request.approvals_json`+audit 에 기록한다.
- **대조 정본**: `Mapping::actorId`(`Mapping.php:36-53`)는 채널 전달 식별자를 신뢰하지 않고 **서버 인증 context**(api_key 행·세션→app_user)에서만 actor 를 도출하며 미확인 시 fail-closed null 이다 — §25 원칙에 부합. 그러나 이는 "채널 무시" 이지 "채널을 결합·검증" 은 아니다. Web/API 를 구분해 policy 로 허용/차단하는 Channel Binding 엔티티는 없다.
- **EMAIL_LINK 성 substrate**: DSAR nonce(`index.php:147`)·phone 링크(`UserAuth.php:2641-2656`)는 외부 링크 채널의 one-time 검증을 하지만, 승인 채널 결합용은 아니다.

## 3. 판정

- **Verdict: ABSENT(엔티티) + BLOCKED_SECURITY(Email 채널 위조)**.
  - Channel 을 11종으로 분류·승인 레코드에 결합·policy 로 허용/차단하는 구조 = **ABSENT**.
  - `Alerting::actor()`(`:33-36`)의 Email 헤더/쿼리 채택 = **BLOCKED_SECURITY**(§25·§5.11 위반).
  - `Mapping::actorId`(`:36-53`)의 "채널 미신뢰·서버 context 도출" = 원칙 부합 substrate(PRESENT·단 결합 아님).
- **선행 의존**: `ERP`/`WORKFLOW_ENGINE`/`SYSTEM`/`BATCH` 채널은 Service Account/System Actor governance(ABSENT)에 종속 → BLOCKED_PREREQUISITE.
- **cover: 0** — 채널 결합/검증 전무. Mapping 은 "채널 무시" 로만 원칙을 만족.

## 4. 확장/구현 방향 (설계)

- **`Alerting::actor()` 채널 식별자 신뢰 제거는 Mandatory Control(자립 수정 가능)**: 승인 판정 경로에서 `X-User-Email`·`?actor=`(Email/Slack/Teams user id 류) 를 actor 로 채택 금지 → `Mapping::actorId`(`:36-53`)의 서버 context 도출로 통일(CANONICAL). BLOCKED_SECURITY 최우선 봉합.
- **Channel Binding 엔티티 신설**: 승인 요청마다 `WEB/MOBILE/API/ERP/WORKFLOW_ENGINE/EMAIL_LINK/SLACK/TEAMS/SYSTEM/BATCH` 채널을 인증 Context 에 결속하고 policy(§9·§10)로 특정 채널의 승인 허용/차단(예: Email/Slack 링크만으로 고위험 승인 금지)을 강제.
- **Email/Slack/Teams 는 알림/시작 채널로만 허용**하고, 실 actor 는 반드시 세션/api_key 인증 context 로 재확인(채널 식별자→Canonical Subject 매핑은 §54 Actor Snapshot 으로 동결, 라이브 신뢰 금지).
- **ERP/Workflow/System/Batch 채널**은 Service Account/System Actor Identity(§36·§37) 신설에 의존 — 그 전까지 BLOCKED_PREREQUISITE 로 명시.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_CLIENT_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_DEVICE_BINDING]] · [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
