# DSAR — Support Access Governance (06-A-03-02-03-03 · §40)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §40.

## 1. 원문 전사 (Canonical Contract)

**§40 Support Access Governance** — 지원(Support) 인력의 고객 테넌트 접근 거버넌스. 필수 통제(원문):
- `Ticket 필수` · `목적/Tenant 제한` · `Time-bound`
- `Read-only 기본` · `Approval 금지 기본`
- `Data Masking` · `Session Recording` · `Supervisor Approval`
- `Customer Notification` · `Full Audit` · `Automatic Expiration`

원칙 계약(§5.8·§40): Support 접근은 **Ticket에 근거**하고 목적·Tenant로 제한되며 시간 제한·Read-only가 기본이다. **Approval Decision은 기본 금지**, 예외는 Supervisor Approval + 고객 통지 + Full Audit. Session Recording·Data Masking으로 최소권한·추적성 보장.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Support Access 거버넌스 = 부재.** GROUND_TRUTH 표에 `ticket`·`supervisor approval`·`data masking`·`session recording`·`customer notification`·`read-only 기본`·`automatic expiration`을 데이터로 강제하는 구조체 → **no hits**.
- 실존하는 유일 인접물은 **admin→user 가장 세션**(`UserAdmin.php:472-534`, `imp_` 2h) — 그러나 이는 Ticket·목적제한·Supervisor Approval·고객통지·Read-only·Session Recording 없이 **전권 세션**을 발급한다(GROUND_TRUTH §1·§3.6). 즉 Support Access의 통제 요건과 정반대(무티켓·무읽기전용·무통지).
- Approval 경로 차단: 현재 승인 저장(`Mapping.php:186-190,210`)은 support/impersonation 여부를 구분하지 않으므로 **Support 세션의 승인 기본금지 게이트도 부재**.

## 3. 판정 (Verdict)

- Verdict: **ABSENT**
- 근거: Support Access를 별도 거버넌스 대상으로 정의·강제하는 실코드 전무. 존재하는 `imp_` 가장 세션은 오히려 §40 통제(Ticket/Read-only/Supervisor/Notification/Recording)를 **결여**한 상태로 존재 → §40 관점에서 통제되지 않은 위험 표면.
- cover: **0**. 재사용 substrate = 세션 발급/만료/발급감사 골격(`UserAdmin.php:472-534`)뿐. 이를 Support Access 통제로 계상 금지(요건 미충족).

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_SUPPORT_ACCESS` — `ticket`·`purpose`·`tenant scope`·`time-bound(started/expires_at)`·`read-only`·`supervisor approval`·`customer notification`·`session recording ref`·`data masking policy`·`automatic expiration`을 데이터로 강제. Support Actor의 신원은 §42 Actor Identity Snapshot, 세션은 §43 Authentication Snapshot으로 고정.
- **Golden Rule=Extend**: 기존 `imp_` 세션 발급 경로(`UserAdmin.php:472-534`)를 Support 목적 시 **본 거버넌스 게이트를 통과하도록 확장** — 별도 세션 시스템 발명 금지. §39 Impersonation Session Governance와 필드·Audit 공유(Support=Impersonation의 Ticket-gated 특수형).
- **Mandatory Control(§40·§62)**: Support 세션 = `read-only=true`·`decision actions allowed=false` 기본. Approval Decision은 Supervisor Approval(별도 승인) + Full Audit 없이는 차단. Automatic Expiration 필수(만료 후 Commit 차단은 §55 Commit-time Revalidation).
- **선행 필수(BLOCKED)**: 불변 Decision Record(§3.3) 및 Ticket 시스템 연동이 선행. 이번 차수=설계 명세.

관련: [[DSAR_APPROVAL_IMPERSONATION_SESSION_GOVERNANCE]] · [[DSAR_APPROVAL_ON_BEHALF_OF_CHAIN]] · [[DSAR_APPROVAL_AUTHENTICATION_SNAPSHOT]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
