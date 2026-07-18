# DSAR — Replay Protection (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### REPLAY_PROTECTION (§40)

Replay 방어 구성요소: `Nonce`·`Token Expiry`·`Request Timestamp Window`·`Channel Signature Reference`·`One-time Link Consumption Reference`·`Idempotency Key`·`Request Hash`·`Actor Session Binding`·`Device Binding Reference`·`Decision Slot Binding`·`Action Binding`.

★ 규칙: **만료된 Email Link·오래된 Mobile Token·재사용된 One-time Link 로 Commit 금지.**

## 2. 기존 구현 대조

- 결정 도메인 = **ABSENT**. 승인 4핸들러(Mapping/AdminGrowth/Alerting/Catalog) 어디에도 nonce·one-time consumption·timestamp window·session binding 개념이 없다. 동일 요청을 반복 전송하면 그대로 재실행된다(Alerting `Alerting.php:572-599` 은 매번 UPDATE).
- **nonce 검색 결과**: 코드베이스의 유일한 nonce = `oauth_nonce`(`Connectors.php:3642`, `bin2hex(random_bytes(16))`). 이는 **X Ads OAuth 1.0a 서명용**(아웃바운드 API 서명 base string 구성요소)이지, **결정 커맨드 replay 방어와 무관**하다. 재사용 판정을 위한 저장·소비 기록도 없다.
- **One-time Link Consumption Reference** = no hits. 이메일/모바일 승인 링크의 1회성 소비 추적 부재.
- **Actor Session Binding**: `Alerting::actor()`(`Alerting.php:33-35`)는 헤더(`X-User-Email`/`?actor=`)로 actor 를 받아 **위조 가능**(BLOCKED_SECURITY) — 세션 결속이 아니라 자유 헤더. replay 는커녕 신원 자체가 미검증.
- 채널 서명·timestamp window·device binding = 전부 no hits.

## 3. 판정

- Verdict: **ABSENT** (재사용 방어 구성요소 전무).
- 선행 의존: §3.6 Identity/Security(Actor Session Binding 은 세션 정본 필요)·§14 COMMAND(nonce/idempotency key 발급)·§15 COMMAND_ENVELOPE(replay nonce reference·expiry)에 종속. 특히 `Alerting` actor 위조가 해소되지 않으면 Session Binding 자체 성립 불가 → **BLOCKED_PREREQUISITE** + Alerting 경로 **BLOCKED_SECURITY**.
- cover: **0** (oauth_nonce 는 무관 자산으로 카운트 제외).

## 4. 확장/구현 방향 (설계)

- **순신규 Mandatory Control**: nonce 발급/소비 저장소·one-time link consumption 기록·request timestamp window·channel signature 검증을 신설. `oauth_nonce`(OAuth 서명)는 **재사용 금지**(용도 상이·소비추적 없음).
- **Fail-closed**: 만료/재사용/미소비 nonce → Commit 차단(§40 ★). Email/Slack/Teams 채널(§16)은 별도 서명·만료 없이 직접 Commit 금지.
- **선행 차단**: `Alerting::actor()` 헤더 위조(`Alerting.php:33-35`)를 세션 기반 신원으로 교체하기 전까지 Actor Session Binding 은 구현 불가 — 신원 위조 위에 replay 방어를 쌓으면 무의미.
- **Idempotency 와 결합**: §39 Idempotency 의 request hash + §40 nonce 를 함께 저장해 "동일 결과 재현(멱등)"과 "재사용 차단(replay)"을 구분. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
