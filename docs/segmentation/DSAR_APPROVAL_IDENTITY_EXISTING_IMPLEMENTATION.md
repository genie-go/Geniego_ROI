# DSAR — Actor Identity Assurance & Authentication Binding: 기존 구현 전수조사 (ⓑ · GROUND_TRUTH)

> EPIC **06-A-03-02-03-03** · 289차 후속 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 2 에이전트(신원+인증) 병렬 · 읽기 전용 · 코드 변경 0.
> ★ **이 문서의 file:line 인용목록 = 하위 per-entity DSAR·ADR의 유일 허용 인용원(GROUND_TRUTH allowlist).** 여기 없는 새 file:line 인용 금지.
> ★이 블록은 순수-설계 선행 블록과 달리 **실 인증/신원 코드가 대량 실재** → per-entity 판정 다수가 PARTIAL/PRESENT-substrate/VALIDATED.

## 0. 결론 (Verdict up front)

1. **★Canonical actor 정본 실재 = `Mapping::actorId`** — 서버 인증 context에서만 도출(api_key→`apikey:{id}`·세션→`user:{email}`·미확인→null)·**클라이언트 입력 미신뢰**·승인 fail-closed(자기승인 차단·정족수 2). Actor Identity Assurance의 **확장 기준점**.
2. **★인증 스택 대량 실재(확장 substrate)** — 서버측 영속 세션(user_session·revocation·유휴폐기)·api_key+RBAC scopes(viewer<connector<analyst<admin)·MFA(TOTP/SMS/email/복구코드·정책 off/admin/all)·SSO OIDC/SAML/SCIM(프로덕션급·state/nonce/assertion-replay 방어)·SecurityAudit 불변체인.
3. **★진짜 부재(순신규)** — Device/Fingerprint/Trusted Device·mTLS/Client Cert·**session↔Decision Command 결합**·**commit-time 인증 재검증(step-up)**·**Original Principal↔Effective Actor 이중보존**·**불변 Identity/Authentication Snapshot**·Person↔Account 분리·Employment/Position·access/refresh 이중토큰·JTI·승인경로 replay 탐지.
4. **★BLOCKED_SECURITY 실결함(라이브·별도 수정세션)** — ① `Alerting::actor()` X-User-Email/?actor= 위조 ② `executeAction` 미승인·미재검증 집행 ③ `user_session.token` 평문 저장 ④ `mfa_secret`(TOTP) 평문 저장 ⑤ break-glass 마스터 로그인 MFA 우회.
5. **선행 §3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation = 실코드 부재**(설계전용). 승인 substrate는 `mapping_change_request`(정족수2 실동작)+`action_request`(위조 actor·정족수 없음) 2테이블뿐. → Identity를 **결합할 불변 Decision Record/Snapshot 대상 부재** → 신원 assurance의 승인 결합부는 BLOCKED_PREREQUISITE. 단 인증/신원 substrate 실재로 실 엔진은 "발명 아닌 조립".

## 1. 신원(Identity) GROUND_TRUTH 표

| 개념 | 판정 | file:line | 내용 | 승인결합/불변snapshot |
|---|---|---|---|---|
| **Canonical actor 정본** | **PRESENT** | `Mapping.php:36-53` `actorId()` | api_key→`apikey:{id}`·세션→`UserAuth::authedUser` email→`user:{email}`·미확인 null. 클라이언트 미신뢰 | 승인 O(fail-closed)·문자열만 |
| 감사용 actor(약) | PRESENT | `Mapping.php:56-58` `actor()` | `actorId() ?? 'unknown'`·승인판정 금지 명시 | 로그전용 |
| maker-checker 승인 | PRESENT | `Mapping.php:186-190,210,246-250,268,279,287` | propose→requested_by·approve 자기승인차단(`:268`)·재승인 dedup(`:279`)·정족수 2(`:287`) | O·`mapping_change_request`(`Db.php:623-634`) |
| User 저장소 | PRESENT | `UserAuth.php:229-264` `userByToken`·`Db.php:942` | user_session JOIN app_user WHERE token AND expires_at>now AND is_active=1 | — |
| 계정 상태 | **PARTIAL** | `UserAuth.php:248,260` `is_active=1` | active/비활성만·locked/disabled 세분 없음 | — |
| Person↔Account 분리 | **ABSENT** | app_user 단일 테이블 | 사람/계정 미분리 | — |
| Tenant/role/key 주입 | PRESENT | `index.php:417,437`(auth_tenant)·`:100,418,441`(auth_role/key) | api_key 행에서 위조불가 주입 | — |
| RBAC rank | PRESENT | `index.php:554` | `viewer0/connector1/analyst2/admin3` | — |
| team_role | PRESENT | `TeamPermissions.php:120-136` | owner>manager>member·fail-closed member | — |
| Employment/Position | **ABSENT** | team_role만 | 고용/직위 개념 없음 | — |
| SecurityAudit 불변체인 | PRESENT | `SecurityAudit.php:14-33` `:27` | append-only sha256·preimage에 actor 포함 | 불변 O·**승인경로 미사용** |
| **Decisioning(장식)** | **ABSENT(오인주의)** | `Decisioning.php:12,36` | 클래스명만 decision·실제 ad-insights ingest/집계 | — |
| Assignment/Authority/Delegation | **ABSENT** | onsite_assignment=A/B테스트(`Onsite.php:86`)·메뉴키·주석뿐 | 전용 클래스/테이블 0 | — |
| X-Act-As-Tenant | PRESENT(제한) | `UserAuth.php:398` | admin+`'platform_growth'` **단일값만**·effective tenant만 치환·actor는 admin 유지 | Original/Effective tenant 반환값 미보존 |
| Member impersonation | PRESENT(위험) | `UserAdmin.php:472-534` `:493-497,499,525` | admin→대상 user 실 세션(`imp_` 2h) 발급·발급시 audit·`_impersonated`=프론트 배너 payload | **Original Principal 미보존**·대행승인 사후추적 불가 |
| 승인 감사 저장 | PRESENT(비체인) | `Mapping.php:60`·`Alerting.php:28` | 승인 감사가 **비체인 `audit_log`** 기록 | SecurityAudit 해시체인과 분리 |

## 2. 인증(Authentication) GROUND_TRUTH 표

| 개념 | 판정 | file:line | 방식 | 승인 결합 | raw credential |
|---|---|---|---|---|---|
| 로그인 | PRESENT | `UserAuth.php:730` | bcrypt `password_verify` | 없음 | No |
| 세션 발급 | PRESENT | `UserAuth.php:964-970` | `bin2hex(random_bytes(32))` 64-hex opaque·user_session·30일 | 없음 | ⚠ 토큰 원문 저장(`:969`) |
| 세션 검증 | PRESENT | `UserAuth.php:229-318` | user_session JOIN app_user·expires_at>now·is_active=1 | 없음 | — |
| genie_token | PRESENT | 동일 opaque 세션토큰(프론트 저장키·`index.php:210,288`) | Bearer/`?token=` | — | — |
| 세션 만료/유휴 | PRESENT | `UserAuth.php:965`(30일)·`:282-286`(유휴 자동로그아웃) | 서버측 expires_at+last_seen | — | — |
| 세션 revocation | PRESENT | logout `:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631` | DB DELETE | — | — |
| api_key 인증 | PRESENT | `index.php:483-493` | `hash('sha256')` 조회·is_active=1 | 없음 | No(해시) |
| api_key 발급/스키마 | PRESENT | `UserAuth.php:4240-4246`·`Db.php:942-955` | `genie_key_`+random_bytes(16)·sha256 저장·raw 1회·scopes_json·role·expires_at·idx_api_key_tenant | — | No |
| RBAC scopes | PRESENT | `index.php:553-587` `:554,564-567,568-578,590-600,585` | roleRank·admin:keys·write:*/write:ingest·tenant 강제(X-Tenant-Id 덮어쓰기)·strict | — | — |
| TOTP | PRESENT | `UserAuth.php:3459-3484` | `hash_hmac('sha1')` RFC6238 ±1 | **미결합**(로그인만) | ⚠ mfa_secret **평문 base32**(`:3421,3771`) |
| SMS OTP | PRESENT | `UserAuth.php:3970-3976` | 6자리 5분·bcrypt 저장 | 미결합 | No |
| 이메일 OTP | PRESENT | `UserAuth.php:3924-3934` | 6자리 5분·bcrypt | 미결합 | No |
| 카카오 OTP | ABSENT(stub) | `UserAuth.php:3978-3979` | `provider_not_implemented` | — | — |
| MFA 정책 | PRESENT | `UserAuth.php:3638-3660` | off/admin/all·전역+테넌트 max | 미결합 | — |
| 복구 코드 | PRESENT | `UserAuth.php:3491-3527` | 8개·sha256·1회 소비 | — | No |
| SSO OIDC | PRESENT | `EnterpriseAuth.php:206-244` `:194,534` | Auth Code+id_token RS256/JWKS+state+nonce | 미결합 | client_secret Crypto AES-256-GCM |
| SSO SAML | PRESENT | `EnterpriseAuth.php:247-298,568-619` `:271-283` | ds:Signature C14N+RSA-SHA256·XSW/replay 방어·assertion 1회+NotOnOrAfter | 미결합 | idp_cert 평문(공개키) |
| SCIM 2.0 | PRESENT | `EnterpriseAuth.php:315-434` | Bearer scim_token sha256 | — | Crypto+sha256 |
| 커넥터 OAuth | PRESENT(비-사용자auth) | `OAuth.php:41-61,190-244` `:219` | 광고/커머스 아웃바운드·state CSRF 1회성 | 미결합 | Crypto |
| Device/Fingerprint/Trusted | **ABSENT** | grep 무(마케팅 cross-device·Snowflake JWT만) | — | — | — |
| mTLS/Client Cert | **ABSENT** | grep 무 | — | — | — |
| Nonce/state/replay | PRESENT(SSO/OAuth 국한) | OIDC `:194,534`·state `:214`,`OAuth.php:219`·SAML `:271-283`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147` | 1회 소비·재사용 차단 | **로그인 세션·승인 커맨드에는 부재** |
| 세션 모델 | PRESENT | opaque stateful·JWT 아님·JTI/refresh 부재 | 매 요청 DB 조회 | — | — |
| **commit-time 재검증·session↔command 결합** | **ABSENT** | `Alerting.php:572-599,601-665` `:562` | decideAction 단일 approved(정족수 상수만)·executeAction 재인증/MFA/approver≠executor/status 확인 없음 | **부재** |

## 3. ★BLOCKED_SECURITY — 라이브 실결함 (별도 수정세션 후보)

1. **`Alerting::actor()`(`Alerting.php:33-36`) X-User-Email 헤더/`?actor=` 쿼리 승인자 위조** — `decideAction`(`:574,591,593,597`)이 위조 actor를 `action_request.approvals_json`+audit에 기록·정족수 없이 단일 approved. policy ops(`:82,127,171,189,603`)도 동일. §5.11·§61 정면 위반. Mapping은 289차 하드닝됐으나 Alerting 미수정.
2. **`Alerting::executeAction`(`:601-665`) 미승인·미재검증 집행** — status='approved' 확인 없이·재인증/MFA/approver≠executor 없이 action_json을 AdAdapters로 dispatch. §30 Commit Binding·§55 Revalidation 부재.
3. **`user_session.token` 평문 저장**(`UserAuth.php:969`) — 해시 없이 원문(`WHERE token=?`). DB 유출 시 세션 즉시 탈취. §5.7 경계.
4. **`mfa_secret`(TOTP) 평문 base32 저장**(`UserAuth.php:3421,3771`) — Crypto 미적용. DB 유출 시 전 사용자 TOTP 재현. §5.7 위반.
5. **break-glass 마스터 로그인 MFA 우회**(env `GENIE_BREAKGLASS_PW`·`UserAuth.php:777-798`·`:925 !isMasterAuth`) — 예외경로 감사·decision 결합 시 별도 처리 필요.
6. **Member impersonation Original Principal 미보존**(`UserAdmin.php:472-534`) — 대행 승인이 회원 본인 승인과 구별 불가.

## 4. 06-A-03-02-03-03 착수 판정

- **실·재사용(확장·재생성 금지)**: **`Mapping::actorId` canonical actor 정본** · 서버측 영속 세션(user_session)+revocation · api_key+RBAC scopes(`index.php:554-600`·`Db.php:942`) · MFA 스택(TOTP/SMS/email/복구코드·정책) · SSO OIDC/SAML/SCIM(state/nonce/replay 방어) · SecurityAudit 불변체인(actor preimage) · 커넥터 OAuth/phone/DSAR one-time nonce 패턴.
- **진짜 부재(순신규 설계)**: Actor Identity Assurance Registry/Policy/Definition/Version·Actor Type Registry·Principal Registry(현재 app_user 단일)·Canonical Subject Binding·Identity Profile·Assurance Level Model(IPL/AAL/CAL/SAL/DAL)·Actor Resolution Context/Result/Pipeline·Authentication Binding(session↔command)·Token/Nonce/Device/Client/Slot/Action/Resource/Commit Binding·Step-up·MFA-decision 결합·Device Identity/Trusted Device/Cert/mTLS·Service Account/System Actor governance·Delegated Actor·Impersonation Session governance(Original Principal 보존)·On-behalf-of Chain·Identity/Authentication Snapshot·Digest·Evidence·Conflict·Drift·Replay/Hijack/Privilege Escalation Detection·Commit-time Revalidation·Reconciliation·Simulation.
- **구현 BLOCKED_PREREQUISITE(승인 결합부)** — 선행 §3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation 부재로 Identity를 결합할 불변 Decision Record/Snapshot 대상 없음. 인증/신원 substrate 실재로 실 엔진은 "Decision Core 신설 → 기존 세션/actor/MFA/SecurityAudit 위 Identity Assurance 조립". 이번 차수=설계 명세(코드 0).
- **★단, BLOCKED_SECURITY 5건은 선행과 무관하게 자립 수정 가능**(Alerting actor·executeAction·평문 저장 2종·break-glass) — 별도 배포승인 세션 후보.

정본 결정=[[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]. 중복감사=[[DSAR_APPROVAL_IDENTITY_DUPLICATE_IMPLEMENTATION_AUDIT]]. per-entity=§74 DSAR 세트(ⓒ). 관련 [[reference_platform_growth_actas_tenant_hijack]]·[[project_n237_session_auth_gaps]].
