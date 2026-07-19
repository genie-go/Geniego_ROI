# DSAR — Impersonation Session Governance (06-A-03-02-03-03 · §39)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §39.

## 1. 원문 전사 (Canonical Contract)

**§39 Impersonation Session Governance** — 관리자/지원 인력이 타 주체를 가장(impersonate)하여 수행할 때의 신원 거버넌스. 필수 필드(원문):
- `original principal`(가장하는 실제 인증 주체) · `support/admin actor` · `effective subject`(가장 대상)
- `impersonation type` · `reason` · `ticket` · `approval`
- `requested/approved/started/expires/ended_at`
- `allowed/prohibited actions` · `read-only` · `decision actions allowed`
- `session` · `audit ref`

원칙 계약(§5.8·§84): **기본적으로 Impersonation 세션에서의 Approval Decision 금지.** 예외는 명시된 고위험 Policy + 별도 승인 + 감사가 있을 때만. **Original Principal을 지우고 Effective Actor만 저장 금지**(Impersonation 은닉 금지).

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Member impersonation 세션 = 실재(PRESENT·위험).** GROUND_TRUTH §1: `UserAdmin.php:472-534`(`:493-497,499,525`) — admin이 대상 user의 **실 세션(`imp_` 접두·2h)** 을 발급하고 발급 시점 audit 기록·`_impersonated` 플래그를 프론트 배너 payload로 전달.
- **★그러나 Original Principal 미보존(BLOCKED).** 발급된 `imp_` 세션은 대상 user로 동작하며, 그 세션으로 수행한 행위의 canonical actor는 `Mapping::actorId`(`Mapping.php:36-53`)가 **대상 user(`user:{email}`)로 반환** — 실제 수행한 admin(support actor)이 소실. 승인 저장(`Mapping.php:210` approvals_json)도 effective subject 문자열만 기록 → **대행 승인이 회원 본인 승인과 구별 불가**(GROUND_TRUTH §3.6).
- **거버넌스 필드 부재**: `impersonation type`·`reason`·`ticket`·`approval`·`allowed/prohibited actions`·`read-only`·`decision actions allowed`·`expires/ended_at` 중 실존은 발급 audit + 2h 만료뿐. **승인 행위 자체를 impersonation 세션에서 차단하는 게이트 부재** → 현재는 `imp_` 세션으로 승인 경로 진입 시 정책적 차단 없음.
- 인접 `X-Act-As-Tenant`(`UserAuth.php:398`)는 tenant 치환일 뿐 subject 가장이 아님 — 혼동 금지.

## 3. 판정 (Verdict)

- Verdict: **PRESENT-substrate(가장 세션 실재) · BLOCKED(Original Principal 미보존·승인차단 부재)**
- 근거: 세션 발급/만료/발급감사는 실동작하나, (a) Original Principal↔Effective Subject **이중보존 부재**, (b) Impersonation 세션의 Approval Decision **기본금지 게이트 부재**, (c) `ticket/reason/approval/read-only/allowed actions` 거버넌스 필드 부재. §5.8·§39 정면 미충족.
- cover: **부분**. 재사용 대상 = 실 `imp_` 세션 발급/audit 골격(`UserAdmin.php:472-534`). 재생성 금지·확장 대상. **BLOCKED_SECURITY 연계**: GROUND_TRUTH §3.6은 이 미보존을 라이브 실결함으로 등재 — 신원 assurance 설계가 이를 닫는 정본 방향을 제공.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_IMPERSONATION_SESSION` — 기존 `imp_` 세션(`UserAdmin.php:472-534`)을 **확장**하여 발급 시점에 `original principal`(admin `Mapping::actorId`)·`effective subject`·`impersonation type`·`reason`·`ticket`·`approval`·`allowed/prohibited actions`·`read-only`·`decision actions allowed`·`expires/ended_at`를 함께 영속. Original Principal 소실 = 차단(§62 Lint: Original Principal 없는 Impersonation).
- **Golden Rule=Extend**: 새 impersonation 메커니즘 발명 금지. 기존 발급 audit를 §47 Authentication Evidence로 승격하고, canonical actor 산출(`Mapping::actorId`)이 **impersonation 상태에서 Original+Effective 이중값**을 반환하도록 On-behalf-of Chain(§41)과 결합.
- **Mandatory Control(§39·§5.8)**: Impersonation 세션의 Approval Decision **기본금지**. 예외 집행은 명시 고위험 Policy + 별도 승인(§40 Supervisor Approval 연계) + Full Audit. `decision actions allowed=false`가 기본값.
- **선행 필수(BLOCKED)**: 불변 Decision Record(§3.3) 실구현이 선행 — 그 위에서만 "impersonation 하의 승인"을 Snapshot(§43)으로 고정 가능. 이번 차수=설계.

관련: [[DSAR_APPROVAL_SUPPORT_ACCESS_GOVERNANCE]] · [[DSAR_APPROVAL_ON_BEHALF_OF_CHAIN]] · [[DSAR_APPROVAL_AUTHENTICATION_SNAPSHOT]] · [[reference_platform_growth_actas_tenant_hijack]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
