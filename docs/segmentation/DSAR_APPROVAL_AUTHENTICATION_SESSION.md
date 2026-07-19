# DSAR — Authentication Session (06-A-03-02-03-03 · §20)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§20 AUTHENTICATION_SESSION (원문 전사):

필드: `principal` · `canonical subject` · `provider` · `method + version` · `auth event` · `auth time` · `last reauthentication` · `issued/expires/absolute/idle expires` · `revoked_at + reason` · `assurance` · `device` · `client` · `channel` · `network` · `token family` · `session generation` · `impersonation session id`.

Status enum(10종): `ACTIVE` / `STEP_UP_REQUIRED` / `EXPIRED` / `IDLE_EXPIRED` / `REVOKED` / `SUSPENDED` / `COMPROMISED` / `REPLAY_SUSPECTED` / `TERMINATED` / `ARCHIVED`.

의미: Authentication Session은 인증 성공으로 확립된 세션의 **완전한 신원·강도·수명·디바이스 상태**를 담는 정본이다. §22 Binding이 결합할 대상이며, §30 Commit Binding·§51 Authentication Drift가 "세션 Active·미폐기·generation 불변·Step-up 충족"을 판정할 때 참조한다. 단순 토큰↔유저 매핑을 넘어 token family·generation·assurance·impersonation 링크를 포함한다.

## 2. 기존 구현 대조

- **서버측 영속 세션은 실재(확장 substrate)** — `user_session` 테이블 + `app_user` JOIN(`UserAuth.php:229-264`·`Db.php:942`):
  - opaque stateful 세션: `bin2hex(random_bytes(32))` 64-hex·30일(`UserAuth.php:964-970`) — JWT 아님, 매 요청 DB 조회.
  - 검증: `expires_at>now AND is_active=1`(`UserAuth.php:229-318`).
  - 유휴 자동로그아웃: last_seen 기반(`UserAuth.php:282-286`) → `IDLE_EXPIRED` 상태의 substrate.
  - revocation: logout(`UserAuth.php:1765`)·revoke-others(`UserAuth.php:4173`)·deprovision(`EnterpriseAuth.php:400,413`)·DELETE(`UserAuth.php:1381,1617,1631`) → `REVOKED`/`TERMINATED` substrate.
  - genie_token = 동일 opaque 세션토큰(프론트 저장키, `index.php:210,288`).
- **부재 필드/상태**:
  - **`token` 평문 저장**(`UserAuth.php:969` `WHERE token=?`) — 해시 없이 원문. DB 유출 시 세션 즉시 탈취(§5.7 경계·GROUND_TRUTH §3-3 BLOCKED_SECURITY).
  - `token family`·`session generation`: 부재 — 세션 회전·재생 탐지 근거 없음(`REPLAY_SUSPECTED` 판정 불가).
  - `JTI`·access/refresh 이중토큰: 부재(GROUND_TRUTH §2 "JTI/refresh 부재").
  - `last reauthentication`·`STEP_UP_REQUIRED` status: 부재 — 재인증·Step-up 개념 없음.
  - `method + version`·`assurance`: 세션에 인증수단·AAL이 봉인되지 않음(§12·§19 미산출).
  - `device`·`client`·`channel`·`network`: 세션에 디바이스/클라이언트 바인딩 없음(GROUND_TRUTH §2 Device ABSENT).
  - `impersonation session id`: impersonation은 `imp_` 접두 별도 세션(`UserAdmin.php:472-534`)이나 원 세션과 링크·Original Principal 미보존.
  - `COMPROMISED`/`SUSPENDED`/`ARCHIVED`: 상태 세분 부재(`is_active=1` 이진, `UserAuth.php:248,260`).

## 3. 판정

- Verdict: **PARTIAL(확장)** — 서버측 영속 세션·만료·유휴폐기·revocation substrate 대량 실재 · token family/generation/JTI/refresh/step-up status/assurance/device 바인딩 부재 · **token 평문 저장(BLOCKED_SECURITY)**.
- cover: **상당** (세션 발급·검증·revocation = `UserAuth.php:229-318,964-970,1765,4173` 재사용 · 10종 status 중 ACTIVE/EXPIRED/IDLE_EXPIRED/REVOKED substrate 존재 · 나머지 6종·강도/디바이스/generation 축 순신규).
- 선행 의존: 세션 자체는 실재하나 `method+version`(§19)·`assurance`(§12)·`impersonation session id`(§39) 봉인은 선행 부재로 부분 BLOCKED. §22 Binding 결합은 별도.

## 4. 확장/구현 방향 (설계)

- 기존 `user_session`을 CANONICAL Authentication Session으로 확장(재구현·2차 세션스토어 신설 금지, §67 중복 금지). 결측 필드(token family·generation·assurance·method+version·device·client·channel·impersonation link)를 부가 컬럼/부속 테이블로 추가.
- **★즉시 개선(BLOCKED_SECURITY 자립 수정 후보)**: `user_session.token` 평문(`UserAuth.php:969`)을 sha256 저장·조회로 전환(§5.7) — api_key(`index.php:483-493` sha256 조회) 패턴 재사용. 별도 배포승인 세션 후보.
- session generation + token family 도입으로 §52 Replay Detection·§53 Hijack Signal 근거 확보 → `REPLAY_SUSPECTED`/`COMPROMISED` 상태 판정 가능.
- last reauthentication + STEP_UP_REQUIRED status 신설 → §31 Step-up·§55 Commit Revalidation의 "Auth Age·Step-up 충족" 판정 연결.
- impersonation session id로 `imp_` 세션(`UserAdmin.php:472-534`)을 원 세션·Original Principal에 링크(§5.8 은닉 금지). status 세분(SUSPENDED/COMPROMISED/ARCHIVED)은 기존 `is_active` 이진을 대체가 아닌 확장.
- 무후퇴: 기존 로그인·SSO·모바일·API 세션 흐름(§72 Regression) 유지 — 신규 필드는 nullable 시작, 점진 강제.

관련: [[DSAR_APPROVAL_AUTHENTICATION_METHOD_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_CONTEXT]] · [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
