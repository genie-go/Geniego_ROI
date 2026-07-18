# DSAR — Approval Decision Command Envelope (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§15 COMMAND_ENVELOPE** — 필수 필드:
envelope id · tenant context · authenticated principal · actor subject claim · delegated actor claim reference · authorization context · request/correlation/causation/trace id · idempotency key · payload version · content type · source channel/application · trusted server timestamp · client timestamp · request hash · signature reference · replay nonce reference · expiry reference · evidence.

★ **Envelope ≠ Business Command** — 전송·인증·재전송 봉투 계층은 결정 명령 본문과 분리된다.

## 2. 기존 구현 대조

전송 봉투(Envelope) 라는 별도 계층이 **존재하지 않는다.** 4핸들러는 Slim 미들웨어가 채운 요청 속성(`auth_tenant`·`auth_key`)을 직접 읽어 곧바로 UPDATE 한다 — 인증 경계와 명령 본문이 하나의 요청 처리에 붕괴돼 있고, 재전송·서명·만료를 다루는 봉투 메타데이터가 없다.

| 계약 필드 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| tenant context | 존재(미들웨어) | `Mapping::tenantId`(auth_tenant 강제) · Tenant Guard(index.php·49핸들러 WHERE tenant_id) |
| authenticated principal / actor subject claim | 부분(서버도출) | `Mapping::actorId :36-53` (api_key/session) |
| envelope id · trace id · correlation/causation id | **부재** | no hits |
| idempotency key · request hash | **부재** | no hits |
| signature reference · replay nonce reference · expiry reference | **부재** | `oauth_nonce`(`Connectors.php:3642`)=OAuth 전용·결정 무관 |
| trusted server timestamp vs client timestamp 분리 | **부재** | audit ts 만 존재(단일 축) |
| payload version · content type | **부재** | no hits |
| delegated actor claim reference | **부재** | §3.3 Delegation ABSENT |

Envelope 의 존재 이유(재전송·서명·만료 봉투를 Business Command 와 분리)가 현행에는 전무하다 — 실경로에서 명령은 봉투 없이 인증 미들웨어 → UPDATE 로 직결된다.

## 3. 판정

- **Verdict: ABSENT** — Envelope 계층 전무. tenant/principal 은 미들웨어에 존재하나 그것은 Envelope 엔티티가 아니라 요청 속성이며, 봉투 고유 필드(envelope id·nonce·signature·expiry·request hash·client/server ts 분리)는 0.
- **선행 의존**: §3.6 Identity/Security(PARTIAL — Actor Snapshot ABSENT)·§3.3 Delegation(ABSENT, delegated actor claim 재료 없음). Replay Protection(§40)·Idempotency(§39) 미존재가 봉투를 무의미하게 만든다.
- **cover: 0**.

## 4. 확장/구현 방향 (설계)

- Envelope 를 **명령 본문과 분리된 봉투 레코드**로 신설 — authenticated principal 은 미들웨어 산출값을 그대로 담되, envelope id·request hash·trusted server timestamp·client timestamp·replay nonce·expiry 를 봉투에 기록. Business Command(§14)는 봉투에서 검증 통과 후 파생.
- Replay nonce/expiry 는 **`oauth_nonce` 패턴을 참조하되 결정 도메인 전용으로 신규**(OAuth용 재사용 금지 — 도메인 혼입).
- idempotency key/request hash 는 **Paddle UNIQUE(notification_id) 멱등**(`Paddle.php:343-368`) 일반화로 봉투 레벨 중복 차단.
- Mandatory Control: Email/Slack/Teams 등 외부 채널 봉투는 서명/만료 없이 Commit 금지(§16 연계) — 봉투 계층이 그 게이트의 자리.
- 실위험: 현행 `Alerting::actor()`(`:33-35`)가 봉투 없이 헤더를 신뢰하는 구조(BLOCKED_SECURITY) — Envelope 도입 시 authenticated principal 만 채택하고 클라이언트 헤더 claim 은 배제.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_COMMAND]] · [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
