# DSAR — Approval Authentication Resource · Action · Decision Slot (Scope) Binding (06-A-03-02-03-03 · §29)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§29 Resource · Action · Decision Slot Binding** — 인증/step-up 을 승인 대상에 결속:
`Resource ID/Version` · `Action Type` · `Decision Slot` · `Approval Case Version` · `Amount` · `Currency` · `Command Digest`.

★ **Step-up 이 다른 Action/Resource 에 재사용 금지**(§60 ACTION/RESOURCE_MISMATCH·§49 DECISION_SLOT/ACTION/RESOURCE_BINDING_MISMATCH).

## 2. 기존 구현 대조

- **인증의 scope 는 RBAC coarse-grained 만 존재하고, 승인 대상(resource/action/decision slot/amount)에 결속되지 않는다.**
  - RBAC scopes(`index.php:553-587` `:554,564-567,568-578,585`): role rank(viewer<connector<analyst<admin)·`admin:keys`·`write:*`/`write:ingest`. 이는 **HTTP method 수준**(쓰기=analyst+/write:*) 권한이지, 특정 resource id/version·action type·decision slot·amount 에 묶인 scope 가 아니다.
  - api_key `scopes_json`(`Db.php:942-955`)도 문자열 scope 목록일 뿐 승인 대상 결속이 없다.
- **★부재 축(§29 핵심)**:
  - `Resource ID/Version`·`Decision Slot`·`Approval Case Version`·`Command Digest` 를 인증/승인에 결속하는 구조 = **부재**. `mapping_change_request`(`Db.php:623-634`)는 변경 대상을 담지만 command digest·decision slot·resource version 을 인증 context 와 묶지 않는다.
  - `Amount`/`Currency` 결속: 고액 승인 게이트는 catalog 도메인에 부분 실재(high_value ₩5M 승인 게이트, 289차 13회차 수정)하나, 이는 authentication scope binding 이 아니라 라우팅 게이트다 — 인증 step-up 을 amount 에 결속하지 않는다.
  - **Step-up 자체가 부재**: GROUND_TRUTH "commit-time 재검증·session↔command 결합: ABSENT"(`Alerting.php:572-599,601-665` `:562`) — 재인증/MFA 를 특정 action/resource 에 요구·결속하는 로직이 없으므로 "step-up 재사용 금지" 를 논할 대상조차 없다.
- **MFA 는 로그인 전용·decision 미결합**(TOTP `UserAuth.php:3459-3484`·SMS `:3970-3976`·email `:3924-3934`) → action/resource scope 에 묶인 재인증 없음.

## 3. 판정

- **Verdict: ABSENT(decision-scope 결속) + PARTIAL substrate(RBAC coarse scope)**.
  - PRESENT(부분): RBAC method-level scope(`index.php:553-587`)·api_key scopes_json — 그러나 resource/action/decision-slot/amount 비결속.
  - ABSENT: Resource ID/Version·Decision Slot·Command Digest·Amount/Currency 인증 결속·Step-up 및 그 action/resource 재사용 금지.
- **선행 의존**: Decision Slot·Command Digest·Approval Case Version 은 §3.3 Decision Foundation·Command Envelope 부재로 BLOCKED_PREREQUISITE.
- **cover: 부분** — coarse RBAC scope 만 커버. fine-grained decision scope 0.

## 4. 확장/구현 방향 (설계)

- **Scope Binding 을 Command Envelope 에 결속**: 승인 커맨드에 `resource id/version`·`action type`·`decision slot`·`approval case version`·`amount`·`currency`·`command digest` 를 담고, 인증 context(session/token/step-up)를 이 command digest 에 결속. Commit 직전(§30) digest/action/slot/resource version 일치 재검증.
- **Step-up 신설 + 재사용 금지(Mandatory)**: 고위험(고액/결제/정산/계약/관리자취소/Correction/Supersession) 승인에 재인증(MFA/step-up)을 요구하되, 그 챌린지를 **특정 decision slot/action/resource 에 결속**해 타 액션 재사용을 차단(§60·§29). MFA substrate(`UserAuth.php:3459-3484` 등)를 §32 MFA Binding 으로 decision 에 결합(로그인 전용 탈피).
- **RBAC coarse scope 재사용**(Golden Rule=Extend): `index.php:553-587` 의 role rank·write scope 를 유지하되, 그 위에 resource/action/amount fine-grained scope 를 별도 축으로 추가(중복 금지·KEEP_SEPARATE — method 권한 ≠ decision scope).
- **Amount/Currency step-up 연동**: catalog high_value ₩5M 게이트를 인증 assurance 요구(§10·§31 High Amount 조건)와 연결 — 금액 임계 초과 시 step-up 유발.
- **Command Digest**: §23 Token Scope Digest·앞 단계 Canonical Hash Policy(SecurityAudit sha256 `SecurityAudit.php:27`)를 재사용해 command digest 를 산출(새 해시 정책 발명 금지).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_TOKEN_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_NONCE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
