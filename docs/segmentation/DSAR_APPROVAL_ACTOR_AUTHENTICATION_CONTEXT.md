# DSAR — Actor Authentication Context (06-A-03-02-03-03 · §21)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§21 AUTHENTICATION_CONTEXT (원문 전사):

필드: `principal` · `canonical subject` · `original principal` · `effective actor` · `session` · `method + version` · `auth time` · `last reauth` · `assurance AAL` · `credential AAL` · `session AAL` · `device AAL` · `provider assurance claim` · `token id ref` · `nonce ref` · `client` · `device` · `channel` · `network` · `impersonation status` · `delegation status` · `created/expires_at` · `immutable digest`.

의미: Authentication Context는 "이 Decision을 제출한 시점의 인증 상태 전체"를 **불변 스냅샷**으로 고정한 것이다(§5.6). §20 Session이 가변 상태라면 Context는 특정 Decision 시점의 동결본으로, §22 Binding이 Command와 결합하고 §45 Digest·§43 Snapshot·§47 Evidence의 원천이 된다. Principal↔Effective Actor·4종 AAL·impersonation/delegation 상태를 한 봉인 단위로 묶어 "과거 Decision을 현재 세션 재조회 없이 재현"하게 한다.

## 2. 기존 구현 대조

- **Decision 시점 인증 컨텍스트를 불변 스냅샷으로 고정하는 구조는 부재** — 인증 상태는 요청마다 `user_session` 실시간 조회(`UserAuth.php:229-318`)로만 존재하며, 특정 Decision에 동결·봉인되지 않는다. §5.6 "현재 세션 재조회 금지"가 구조적으로 불가능(항상 재조회).
- **부분 substrate(가변, 미봉인)**:
  - principal/effective actor: `Mapping::actorId`(`Mapping.php:36-53`)가 요청 시점 반환 — 스냅샷 아님.
  - session: user_session(`UserAuth.php:964-970`) 실재하나 Context로 동결되지 않음.
  - provider assurance claim: SSO OIDC/SAML(`EnterpriseAuth.php:206-244,247-298`)이 `acr`/assertion을 받지만 인증 컨텍스트로 보존·재사용되지 않음.
- **부재 필드**:
  - `original principal`: 미보존(GROUND_TRUTH §1·§3-6) — impersonation(`UserAdmin.php:472-534`) 시 admin 원 주체 소실.
  - 4종 AAL(assurance/credential/session/device): §12 Level 모델 미산출.
  - `token id ref`·`nonce ref`: 세션 nonce는 로그인/SSO/DSAR 국한(OIDC `EnterpriseAuth.php:194,534`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`)이며 **로그인 세션·승인 커맨드에는 부재**(GROUND_TRUTH §2 Nonce/state 행).
  - `device AAL`·`device`: Device/Fingerprint substrate ABSENT.
  - `impersonation/delegation status`: impersonation은 프론트 배너 payload(`UserAdmin.php:472-534` `_impersonated`)로만 노출·컨텍스트 필드 아님. delegation 부재.
  - **`immutable digest`**: 인증 컨텍스트 해시 봉인 부재. SecurityAudit 불변체인(`SecurityAudit.php:14-33,27`)은 감사 이벤트용이지 per-Decision 인증 컨텍스트 봉인이 아님.

## 3. 판정

- Verdict: **ABSENT (불변 인증 컨텍스트 봉인)** · **substrate PARTIAL (principal/session/provider claim 가변 실재)**.
- cover: **부분(하한)** (principal=`Mapping.php:36-53`·session=`UserAuth.php:964-970` 재사용 가능 · original principal·4 AAL·nonce/token ref·device·impersonation/delegation status·immutable digest = 순신규).
- 선행 의존: Context는 §16 Resolution Context·§18 Result·§12 AAL·§20 Session을 입력으로 봉인 — 이들 미완이므로 완전 봉인 BLOCKED_PREREQUISITE. 봉인 대상 Decision(§3.3)도 부재.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_actor_authentication_context` — Decision 제출 시점에 §21 필드 전체를 **불변 스냅샷**으로 동결하고 immutable digest 봉인. Golden Rule=Extend: principal/effective actor는 `Mapping::actorId`(`Mapping.php:36-53`), session은 `user_session`(`UserAuth.php:964-970`), provider claim은 SSO(`EnterpriseAuth.php:206-244,247-298`) `acr`를 입력으로 채택(재구현 금지).
- **original principal 보존**(§5.1·§5.8): impersonation(`UserAdmin.php:472-534`)·X-Act-As-Tenant(`UserAuth.php:398`) 경로에서 admin 원 주체를 Context에 동결 — 현재 소실 결함 해소.
- immutable digest: 앞 단계 Canonical Hash Policy(SecurityAudit `SecurityAudit.php:27` SHA-256) 재사용해 Context를 봉인 → §45 Authentication Context Digest·§43 Snapshot의 원천.
- decision-command nonce 도입: 기존 nonce 패턴(OIDC `EnterpriseAuth.php:194,534`·phone `UserAuth.php:2641-2656` 1회 소비)을 승인 커맨드 nonce로 확장 → §24 Nonce Binding·§52 Replay와 연결(현재 로그인/SSO에만 존재하는 갭 해소).
- 4종 AAL은 §12 Level 산출기 결과를 Context에 봉인. §5.6 준수: 봉인 후 절대 재조회·덮어쓰기 금지(Snapshot Setter 금지 §62 Lint).

관련: [[DSAR_APPROVAL_AUTHENTICATION_SESSION]] · [[DSAR_APPROVAL_ACTOR_RESOLUTION_CONTEXT]] · [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
