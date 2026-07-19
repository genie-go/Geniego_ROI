# DSAR — Identity Expiration Policy (06-A-03-02-03-03 · §56)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§56 **Identity Expiration Policy** (SPEC 원문):

만료를 정책으로 선언·강제할 대상 — `External Identity` · `Contractor` · `Partner` · `Temporary Account` · `Service Account` · `System Actor` · `Principal Binding` · `Device Trust` · `Session` · `Step-up` · `MFA Challenge` · `Impersonation` · `Support Access` · `Temporary Role/Position` · `Delegation Identity`.

연계: §12 Assurance Level(만료 시 AAL 하락) · §50/§51 Drift(만료→Commit 차단) · §55 Commit-time Revalidation(Auth Age·Step-up 만료 재검증) · §65 `SESSION_EXPIRING WARNING`.

의미: 각 신원·인증 요소별로 서로 다른 유효기간과 만료 후 동작(재인증/차단/Manual Review)을 **하나의 통합 만료 정책으로 선언·집행**하여, 만료된 자격으로 Decision이 Commit되는 것을 막는다.

## 2. 기존 구현 대조

- **개별 만료 타이머는 다수 실재하나, 통합 Expiration Policy·정책적 선언/집행 계층은 부재.**
  - 세션 만료: `UserAuth.php:965` 30일 absolute·`:282-286` 유휴 자동로그아웃(서버측 expires_at+last_seen). 검증 시 `expires_at>now`(`UserAuth.php:229-318`).
  - MFA Challenge 만료: SMS OTP 6자리 **5분**(`UserAuth.php:3970-3976`)·이메일 OTP 6자리 **5분**(`UserAuth.php:3924-3934`). TOTP는 RFC6238 ±1 스텝(`UserAuth.php:3459-3484`).
  - Impersonation 만료: Member impersonation `imp_` 세션 **2h**(`UserAdmin.php:472-534` `:493-497`).
  - api_key 만료: `expires_at` 필드 존재(`UserAuth.php:4240-4246`·`Db.php:942-955`).
  - Step-up/Nonce 만료: 승인경로 Step-up 부재(§2 GROUND_TRUTH `commit-time 재검증·session↔command 결합 ABSENT`), Nonce는 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194,534`·`OAuth.php:219`·`UserAuth.php:2641-2656`·`index.php:147`)이며 승인 커맨드에는 부재.
- **부재 축**: External Identity/Contractor/Partner/Temporary Account 구분 부재(app_user 단일 테이블·`is_active=1`만 `UserAuth.php:248,260`), Principal Binding·Device Trust(`ABSENT`), Temporary Role/Position(`ABSENT`·team_role만 `TeamPermissions.php:120-136`), Delegation Identity(`ABSENT`·전용 클래스/테이블 0), Support Access governance(`ABSENT`) 만료 개념 없음.
- **통합 관점 부재**: 각 타이머(세션 30일·OTP 5분·imp 2h)는 각자의 핸들러에 하드코딩되어 있을 뿐, "요소별 만료+만료후 동작"을 데이터로 선언하고 Commit-time에 일괄 평가하는 정책 구조가 없다.

## 3. 판정

- Verdict: **PARTIAL** (개별 만료 실재 · 통합 정책 ABSENT).
- cover: **개별 만료 타이머 有(세션 30일·MFA OTP 5분·imp 2h·api_key expires_at) · 통합 Identity Expiration Policy = 0.** 세션 30일·MFA OTP 5분·imp 2h는 실재하나 통합 정책 부재이며, External/Contractor/Partner/Service Account/System Actor/Principal Binding/Device Trust/Step-up/Support Access/Temporary Role·Position/Delegation 만료는 원천 축 자체가 없다.
- 선행 의존: 다수 만료 대상(Device Trust·Delegation·Support·Temporary Role/Position)이 §3.1/§3.4 Foundation ABSENT에 종속 → 완결형은 **BLOCKED_PREREQUISITE**. 통합 정책 스켈레톤은 기존 실재 타이머를 참조하는 형태로 선(先)설계 가능.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_identity_expiration_policy` — 요소별(External/Contractor/Partner/Temporary Account/Service Account/System Actor/Principal Binding/Device Trust/Session/Step-up/MFA Challenge/Impersonation/Support Access/Temporary Role·Position/Delegation)로 `max_age`·`expiry action`(REAUTH/BLOCK/MANUAL_REVIEW)·`assurance downgrade on expiry`를 데이터로 선언.
- Golden Rule=Extend: 기존 실재 타이머를 **정본 값**으로 정책에 등재 — 세션 30일(`UserAuth.php:965`)·OTP 5분(`:3924-3934,:3970-3976`)·imp 2h(`UserAdmin.php:493-497`)·api_key `expires_at`(`Db.php:942-955`). 새 타이머를 발명하지 말고 기존 값을 SSOT로 흡수(값 이중화 금지).
- Commit-time 결합: §55 Commit-time Revalidation의 `Auth Age`·`Step-up` 항이 본 정책을 조회하여 만료 시 차단/재인증(§50/§51 Drift 연동). Step-up/Nonce(승인경로)·Device Trust 만료는 해당 Foundation 신설 후 활성.
- 무후퇴: 정책은 기존 만료값을 선언·중앙화할 뿐 기간을 단축·연장하지 않는다(기존 로그인/세션/OTP 흐름 불변).

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_COMMIT_TIME_IDENTITY_REVALIDATION]] · [[DSAR_APPROVAL_AUTHENTICATION_RECONCILIATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
