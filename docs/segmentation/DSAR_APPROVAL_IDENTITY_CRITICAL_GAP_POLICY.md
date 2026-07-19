# DSAR — Actor Identity Assurance: Critical Gap Policy (§61)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: "인증 성공 ≠ 승인 권한" · "Email만으로 Person 식별 금지" · "canonical actor 정본은 양호 substrate — 정직 대조(오탐 금지)".

## 1. 원문 전사 (Canonical Contract)

§61 Critical Gap 후보(원문 전사): Decision Actor를 Email로만 저장 · Canonical Subject 없음 · Principal/Actor 미분리 · Original Principal/Effective Actor 미저장 · Delegate 미저장 · Impersonation 숨김 · Service/System Actor를 Human으로 저장 · Authentication Context/Session ID/Method/Assurance 없음 · Session↔Command Binding 없음 · Token 전체/Password/OTP/API Key 원문 저장 · Commit-time Revalidation 없음 · Disabled/Terminated/Revoked/Expired Session Decision 허용 · Cross-Tenant/Legal-Entity Identity · Session Replay 미차단 · Nonce 재사용 · Step-up 재사용 · Impersonation/Support 승인 허용 · Device/Client Binding 없는 고위험 · Authentication/Identity Snapshot·Evidence 누락 · 과거 Decision을 현재 Identity로 재해석 · 고객설정 Revalidation 제거 · 중복 Identity SoT.

의미: Critical Gap Policy는 위 후보 각각이 "실제 현행 위반인가 / 부재(개념 자체 없음)인가 / 해당없음(양호·정직 기술)인가"를 GROUND_TRUTH에 대조해 판정하고, Actor Identity Assurance Governance 부재 전제 위에서 각 Gap을 닫을 설계 방향을 선언한다. **오탐 금지 규율**: canonical actor 정본(`Mapping::actorId`)·tenant 강제 주입 등 실재하는 양호 substrate를 Gap으로 계상하지 않는다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §61 후보 | 현행 판정 | 근거(GROUND_TRUTH) |
|---|---|---|
| Decision Actor를 Email로만 저장 | **부분** | canonical actor는 `apikey:{id}`/`user:{email}` 문자열(`Mapping.php:36-53`) — email이 세션경로 문자열 일부(Canonical Subject id 아님) |
| Canonical Subject 없음 | **실 부재** | Subject Registry/Canonical Subject Binding 전무·app_user 단일(`UserAuth.php:229-264`) |
| Principal/Actor 미분리 | **실 부재** | app_user가 principal 겸 subject·분리 개념 없음 |
| Original Principal/Effective Actor 미저장 | **★실 위반** | member impersonation `_impersonated` payload만(`UserAdmin.php:472-534` `:493-497`)·이중보존 부재 → 대행승인=본인승인 구별 불가 |
| Delegate 미저장 | **실 부재** | Delegation 도메인·전용 테이블 0(`Onsite.php:86`은 A/B테스트) |
| Impersonation 숨김 | **부분(위험)** | 발급시 audit는 있으나(`UserAdmin.php:499`) Original Principal 미보존(§5.8 미달) |
| Service/System Actor를 Human으로 저장 | **부분** | `apikey:{id}`·`'system'`·`'admin'` 표기 혼재·Actor Type Registry 부재 |
| Authentication Context/Session ID/Method/Assurance 없음 | **실 부재** | 세션은 실재(`UserAuth.php:964-970`)하나 승인에 결합된 Auth Context/Method/AAL snapshot 전무 |
| Session↔Command Binding 없음 | **★실 위반** | `Alerting.php:572-599,601-665` decideAction/executeAction에 세션·커맨드 결합 전무 |
| Token 전체 원문 저장 | **★실 위반** | `user_session.token` 평문(`UserAuth.php:969` `WHERE token=?`) — 해시 없음 |
| Password 원문 | **해당없음(양호)** | bcrypt `password_verify`(`UserAuth.php:730`) |
| OTP 원문 | **해당없음(양호)** | SMS/email OTP bcrypt(`UserAuth.php:3970-3976,3924-3934`)·복구코드 sha256(`:3491-3527`) |
| TOTP Secret 원문 | **★실 위반** | `mfa_secret` 평문 base32(`UserAuth.php:3421,3771`) — Crypto 미적용 |
| API Key 원문 | **해당없음(양호)** | sha256 저장(`index.php:483-493`)·raw 1회 발급만(`UserAuth.php:4240-4246`) |
| Commit-time Revalidation 없음 | **★실 위반** | `Alerting::executeAction`(`:601-665`) status='approved'·재인증·approver≠executor 확인 없이 dispatch |
| Disabled/Terminated Session Decision 허용 | **실 위반(부분)** | is_active 게이트는 login/조회 시점만(`UserAuth.php:248,260`)·commit 시점 재검증 부재 |
| Cross-Tenant Identity | **해당없음(양호)** | tenant 강제 주입·X-Tenant-Id 덮어쓰기(`index.php:590-600`)·X-Act-As-Tenant 단일값 제한(`UserAuth.php:398`) |
| Session Replay/Nonce 재사용/Step-up 재사용 미차단 | **부분** | nonce 1회소비는 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194`·`OAuth.php:219`·`index.php:147`)·**승인 커맨드 경로엔 부재** |
| Impersonation/Support 승인 허용 | **실 위반** | member impersonation이 승인 구별 없이 실 세션 발급(`UserAdmin.php:472-534`) |
| Device/Client Binding 없는 고위험 | **실 부재** | Device/Fingerprint/Trusted Device·mTLS 전무 |
| Authentication/Identity Snapshot·Evidence 누락 | **실 부재** | 승인=문자열 actor(`Mapping.php:56-58`)·불변 snapshot/evidence 부재 |
| 과거 Decision을 현재 Identity로 재해석 | **실 부재(리스크)** | Immutable Auth Context Snapshot 부재 → 재조회 재해석 창 |
| 고객설정 Revalidation 제거 | **해당없음** | 해당 feature flag 부재(§5.12 명문화 대상) |
| 중복 Identity SoT | **해당없음(양호)** | User·Session·api_key 각 단일 SoT(중복 엔진 난립 없음) |

## 3. 판정

- **Verdict: Actor Identity Assurance Governance 부재 전제 위 설계.** Critical Gap은 세 부류로 분류된다.
  1. **★실 위반(라이브 코드·BLOCKED_SECURITY 자립 수정 후보)**: ① `Alerting::actor()`(`Alerting.php:33-36`) X-User-Email 헤더/`?actor=` 쿼리로 승인자 위조 → decideAction(`:574,591,593,597`)이 위조 actor 기록(§5.11·§61 정면 위반) ② `Alerting::executeAction`(`:601-665`) 미승인·미재검증 집행(§30·§55 부재) ③ `user_session.token` 평문 저장(`:969`) ④ `mfa_secret` 평문 base32(`:3421,3771`) ⑤ member impersonation Original Principal 미보존(`UserAdmin.php:472-534`).
  2. **실 부재(개념 자체 없음 → 순신규)**: Canonical Subject·Principal/Actor 분리·Delegation·Auth Context/Method/AAL snapshot·Session↔Command Binding·Device/Client Binding·Identity/Authentication Snapshot·Evidence·Commit-time Revalidation·Replay 탐지.
  3. **★해당없음(양호·정직 대조)**: **canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)는 서버 인증 context에서만 도출·클라이언트 미신뢰·승인 fail-closed**(자기승인 차단 `:268`·정족수2 `:287`). **tenant 강제 주입(`index.php:590-600`)·X-Act-As-Tenant 단일값 제한(`UserAuth.php:398`)은 Cross-Tenant 위조 차단 실재**. Password/OTP/복구코드/API Key 원문 비저장도 준수. 이들을 Gap으로 계상하면 오탐 — Alerting 헤더 actor가 위반이지 canonical actor 정본이 위반 아니다.
- cover: **부분** — canonical actor·tenant 강제·비저장 원칙(password/otp/apikey)은 확장 substrate로 실재. Registry/Subject/Snapshot/Evidence/Revalidation Governance는 0.
- 선행: 선행 §3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation 부재 → Identity를 결합할 불변 Decision Record/Snapshot 대상 없음. Gap 실수정의 **승인 결합부는 BLOCKED_PREREQUISITE**. ★단 BLOCKED_SECURITY 5건은 선행과 무관하게 자립 수정 가능(별도 배포승인 세션). 이번 차수=설계.

## 4. 확장·구현 방향 (설계)

- **실 위반 Gap 폐쇄(무후퇴 예외=개선)**: ① `Alerting::actor()`를 canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)로 교체 — 헤더/쿼리 actor 신뢰 제거(§5.11). ② `executeAction`(`:601-665`)에 status='approved' 검증·approver≠executor·commit-time 재인증(§30/§55) 삽입. ③ `user_session.token` 해시화(sha256 조회로 전환·`WHERE token_hash=?`). ④ `mfa_secret` Crypto AES-256-GCM 암호화(SSO client_secret 패턴 준용). ⑤ member impersonation(`UserAdmin.php:472-534`)에 Original Principal + Effective Actor 이중보존 필드 추가(§5.1/§5.8).
- **순신규 Gap 충족**: Principal Registry/Canonical Subject Binding을 app_user·user_session·api_key **위에 상위 표준화**(source KEEP·Adapter). Actor Type Registry로 Service/System Actor를 Human-승인자와 분리(§5.9). Authentication Context/Session Snapshot·Identity/Authentication Digest·Evidence를 승인 커맨드에 결합(§42~§47). Commit-time Revalidation 27항(§55)·Session Replay/Nonce Binding 커맨드 경로 확장(§52/§24).
- **양호 substrate 유지·강제**: canonical actor 정본 `Mapping::actorId`를 **전 승인경로 강제**(Alerting만 미준수 → 교체). tenant 강제 주입(`index.php:590-600`)을 승인 binding에 결합(Cross-Tenant Auth Context 재사용 차단·§28). 이는 현행 위반 교정 아닌 일관성 확대.
- **무후퇴 보장**: 로그인·SSO·MFA·api_key·세션 revocation 기능 불변(→[[DSAR_APPROVAL_IDENTITY_FUNCTION_REGRESSION_GATE]]).
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션**(BLOCKED_SECURITY 5건은 자립 선행 가능).

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_IDENTITY_STATIC_LINT]] · [[DSAR_APPROVAL_IDENTITY_RUNTIME_GUARDS]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
