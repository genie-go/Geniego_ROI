# DSAR — Decision Inbox Dedup (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**INBOX_DEDUP(§47)** 필수 필드:
`inbox dedup id` · source system · source event id · source event version · `tenant id` · event type · payload hash · first received_at · last received_at · processing result · related command id · related record id · status · evidence.

대상 축: DUPLICATE_PREVENTION(§45) — "ERP/Workflow Redelivery · Email Link/Slack · Teams Action 재사용 · Recovery Worker/Outbox Consumer 역방향 중복". 즉 **외부 소스(source system)가 동일 이벤트를 재전달**할 때, source event id + payload hash로 1회만 처리(Inbox 측 멱등). ★IDEMPOTENCY(§39)와 구별: §39는 **클라이언트 command key 멱등**(내향 제출), §47은 **외부 시스템 이벤트 재전달 dedup**(내향 수신).

## 2. 기존 구현 대조

- **Decision Inbox Dedup = PARTIAL.** 실존 선례는 **Paddle 웹훅 UNIQUE(notification_id) 멱등**(`Paddle.php:343-368`) 하나뿐이다 — source event id(`notification_id`) 기반 중복 수신 1회 처리로 §47 골격과 **동형**이나, **결제 웹훅 단일 소스에 국한**되며 결정 도메인(command/record 연결·tenant·event type·payload hash 축)에 배선돼 있지 않다.
- 승인 결정 4핸들러(Mapping/AdminGrowth/Alerting/Catalog) 중 **외부 소스 이벤트 재전달을 dedup하는 경로는 없다.** `AdminGrowth::approvalDecide`는 이미처리 시 409(`:1330` 경로의 `:1327`)로 **종결 후 재요청**은 막지만, 이는 상태 기반 CAS-lite이지 source event id/payload hash 기반 Inbox Dedup이 아니다. `Mapping::approve`의 dedup(`:278`)은 **동일 승인자 중복 append 방지**(승인자 집합 내 중복)이지 외부 이벤트 재수신 dedup이 아니다.
- 결정 제출은 현재 **동기 HTTP 핸들러 직접 UPDATE**여서 ERP/Workflow 재전달·Email/Slack/Teams 재사용이라는 §45 시나리오의 **소스 이벤트 개념 자체가 부재**하다.

## 3. 판정

- **Verdict: PARTIAL**(Paddle 웹훅 = **VALIDATED_LEGACY**, 결정 Idempotency/Inbox Dedup 일반화의 실전 선례).
- **선행 의존**: §3.4 Assignment · Command(§14)/Command Envelope(§15) 부재. Inbox Dedup은 수신 이벤트를 command로 물리는 축(related command id)이 필요한데 Command 실체가 없어 절반만 성립.
- **cover: PARTIAL** — `Paddle.php:343-368` 결제 웹훅 dedup만. 결정 도메인 cover 0.

## 4. 확장/구현 방향 (설계)

- **Paddle 웹훅 UNIQUE(source event id) 멱등 패턴을 일반화**하여(Golden Rule=Extend) source system + source event id + payload hash 복합키를 가진 Decision Inbox Dedup으로 확장한다 — Paddle 전용 테이블에 결정 이벤트를 밀어넣지 않는다.
- §39 IDEMPOTENCY(command key)와 §47 INBOX_DEDUP(source event)은 **다른 축**이므로 별도 저장 — 하나로 뭉개면 클라이언트 재시도와 외부 재전달이 구분 불가.
- **동일 source event id + 동일 payload hash = 기존 processing result 반환**(재처리 금지), **동일 id + 다른 hash = Conflict(§50)로 승격 + Commit 차단 + Audit**(§39 규칙 이식). 조용히 최신값으로 덮어쓰기 금지.
- Email/Slack/Teams(§16 CHANNEL_TYPE)발 이벤트는 **별도 인증/서명/만료 없이 직접 Commit 금지** — Inbox Dedup 통과가 인증을 대체하지 않는다.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
