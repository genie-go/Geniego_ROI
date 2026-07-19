# DSAR — Identity Reconciliation (06-A-03-02-03-03 · §57)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§57 **Identity Reconciliation** (SPEC 원문):

정합 대조 대상 — `Principal Registry vs IdP` · `Principal vs Canonical Subject` · `Account vs Subject` · `Subject vs Person/Employment/Tenant/Legal Entity/Organization Membership/Role/Position` · `Decision Actor vs Identity/Authentication Snapshot` · `Effective Actor vs Delegation` · `Original Principal vs Impersonation` · `Service Account vs Client` · `System Actor vs Auto-decision Policy` · `Ledger Actor Digest vs Identity Digest` · `ERP/Workflow/Legacy User vs Canonical Subject`.

연계: §48 Identity Conflict(불일치 분류) · §65 `IDENTITY_RECONCILIATION WARNING`·`MANUAL_REVIEW_REQUIRED` · §18 Migration(Legacy 매핑).

의미: 승인에 쓰인 Principal·Canonical Subject·Effective/Original Actor·Ledger Actor Digest가 IdP·고용/멤버십/역할·위임·임퍼소네이션·서비스계정·시스템 정책 원장과 **주기적으로 대조·정합**되어, 신원 표현이 원천과 어긋난 상태로 남지 않도록 한다.

## 2. 기존 구현 대조

- **IdP(SSO) 원천은 프로덕션급 실재하나, canonical subject와의 reconcile 계층은 부재.**
  - SSO OIDC(`EnterpriseAuth.php:206-244` `:194,534` Auth Code+id_token RS256/JWKS+state+nonce)·SAML(`EnterpriseAuth.php:247-298,568-619` `:271-283` ds:Signature C14N+RSA-SHA256·XSW/replay 방어·assertion 1회+NotOnOrAfter)·**SCIM 2.0**(`EnterpriseAuth.php:315-434` Bearer scim_token sha256) 모두 실재. 즉 IdP 세션/프로비저닝 원천은 있으나, 그 provider subject를 **canonical subject로 reconcile하는 대조 루틴은 없다.**
  - Canonical actor 정본은 `Mapping::actorId`(`Mapping.php:36-53`)로 존재하나 **문자열만**(api_key→`apikey:{id}`·세션→`user:{email}`). Principal↔Canonical Subject 분리·Account↔Subject 분리(`Person↔Account 분리 ABSENT`·app_user 단일)가 없어 대조할 두 축이 아직 한 축이다.
- **부재 축**: Person/Employment/Position(`ABSENT`·team_role만 `TeamPermissions.php:120-136`), Legal Entity·Organization Membership(`ABSENT`), Delegation(`ABSENT`·전용 클래스/테이블 0), Effective/Original Actor 이중보존(`ABSENT`), Service Account/System Actor governance(`ABSENT`), Identity/Authentication Snapshot(`ABSENT`) → reconcile의 대조 상대들이 존재하지 않는다.
- **Ledger Actor Digest vs Identity Digest**: 승인 감사가 비체인 `audit_log`(`Mapping.php:60`·`Alerting.php:28`)에 기록되고 `SecurityAudit` 불변체인(`SecurityAudit.php:14-33` `:27` preimage에 actor 포함)과 **분리**되어 있어, 원장 actor digest를 identity digest와 대조할 단일 원장이 없다.
- ERP/Workflow/Legacy User 이중 Source 대조: Legacy actor는 email/문자열만(`Mapping.php:210` approvals_json) — canonical subject로 정합할 매핑 자체가 없다.

## 3. 판정

- Verdict: **ABSENT** (reconcile 계층 부재 · IdP/SCIM substrate PRESENT).
- cover: **IdP·SCIM 원천 실재(OIDC/SAML/SCIM 프로덕션급)이나 reconcile = 0.** SSO/SCIM은 실재하나 app_user↔canonical subject·Principal↔Subject·Ledger Actor Digest↔Identity Digest 대조가 전무하며, Person/Employment/Delegation/Impersonation 이중보존 등 대조 상대 축이 부재.
- 선행 의존: §3.1 Canonical Identity Foundation·§3.4 Delegation Foundation·§42 Snapshot ABSENT → reconcile 대상 다수 부재로 **BLOCKED_PREREQUISITE**. IdP↔Principal Registry 대조는 SSO/SCIM 실재로 substrate가 있어 우선 착수 가능한 축.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_identity_reconciliation` 배치/온디맨드 대조 — 항목별 결과(MATCH/DRIFT/CONFLICT/UNRESOLVED)를 §48 Identity Conflict 분류로 기록하고 §65 WARNING/Manual Review로 라우팅. **실 identity를 변경하지 않는 관측 전용(observe-only).**
- Golden Rule=Extend: IdP 원천은 기존 SSO/SCIM(`EnterpriseAuth.php:206-434`)을 재사용해 provider subject를 확보하고, canonical actor는 `Mapping::actorId`(`Mapping.php:36-53`)를 재사용. Ledger 대조 정본은 `SecurityAudit` 해시체인(`SecurityAudit.php:14-33`)의 actor preimage를 identity digest 원천으로 사용(비체인 `audit_log`는 승격/통합 대상, §57 대조 원장으로 계상 금지).
- 착수 순서: ① Principal Registry vs IdP(SSO/SCIM substrate 有) → ② Ledger Actor Digest vs Identity Digest(SecurityAudit 有) → ③ Subject vs Person/Employment/Role/Position·Delegation·Impersonation(선행 Foundation 신설 후).
- 무후퇴: reconcile는 대조·경보만 수행(자동 정정·자동 차단 없음) — 기존 SSO/SCIM 프로비저닝·로그인·actorId 도출 동작 불변.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHENTICATION_RECONCILIATION]] · [[DSAR_APPROVAL_IDENTITY_MIGRATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
