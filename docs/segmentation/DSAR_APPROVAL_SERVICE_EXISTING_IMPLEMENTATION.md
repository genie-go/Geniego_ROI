# DSAR — Service/System/Machine Identity 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-6 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독(백엔드 PHP 전역+bin cron) · 2 Explore 스레드 + 핵심 인용 firsthand 재검증. 모든 발견 `파일:라인`. **반날조: 없는 것을 있다고, 있는 것을 없다고 하지 않음. ★외부 벤더 자격증명(Google 서비스계정)≠내부 RBAC identity 구분. 실재 과신·부재 과장 양방향 회피.**
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **선행(재사용)**: Part 3-1 Role Registry(api_key role)·Part 3-3 Assignment(cron=시스템권한 직접·RBAC 미경유)

---

## 0. 총평

**비인간 identity substrate 일부 실재(PARTIAL) — api_key가 유일한 실 내부 비인간 identity.** api_key(role+scope+expires_at+is_active+rotate 수동)·Crypto AES-256-GCM 봉투(credential 암호화)는 실재. Service/System/Machine/Robot 내부 identity·AI Agent identity·Integration identity·Runtime Trust Level·Certificate Governance·Secret Rotation Policy·Machine Role = **순신규(ABSENT)**. cron/batch=시스템 공유 자격증명 직접 DB(RBAC 미경유). Google 서비스계정 JWT=외부 아웃바운드(내부 identity 아님).

---

## 1. api_key — 유일 실 비인간 identity (PARTIAL 성숙)

- **스키마**: `api_key(id,tenant_id,key_prefix,key_hash(sha256),name,role DEFAULT 'viewer',scopes_json,is_active,last_used_at,use_count,expires_at,created_at)`(`Db.php:942-958`).
- **CRUD**: create(`Keys.php:81-133`·role 화이트리스트 `:95`·scope 화이트리스트 `:99-114,201-210`·원문 1회 응답·DB엔 sha256만 `:40,116,128`)·rotate(`:150-187`·기존 is_active=0+신규 생성·role/scope/expires 승계·**수동 HTTP만**)·revoke(`:135-148` is_active=0).
- **인증 게이트**(`index.php:477-622`): 추출(`:478-486`)·sha256 조회+is_active(`:502-508`)·만료(`:518-520`)·사용량(`:522-525`)·레이트리밋(`:527-570`)·RBAC rank+scope(`:572-598`)·테넌트 바인딩(`:609-619`·헤더 위조 차단).
- ★role(4단계 rank)+scope(화이트리스트)+expires_at+is_active+rotate를 갖춘 **유일 실 비인간 identity**. 단 자동/정책 회전·강제 max TTL 부재(§4).

## 2. Service/System/Machine/Robot 내부 identity — ABSENT · 외부 벤더 JWT 구분

- 내부 엔티티(service_account_id/machine_role/robot_account/system_actor/non_human) **grep 0**(코드). 내부 RBAC role=`owner/manager/member/admin`(`TeamPermissions.php:123-136,245-246,368-390`)·인간 계정 전용·service/machine/robot role 값 부재.
- ★**Google GCP 서비스계정 JWT=외부 아웃바운드**: `googleSaToken`(`Connectors.php:3781-3815`·GA4 RS256 JWT→OAuth2)·`DataExport.php:130-132,550-584`(Sheets/BigQuery service_account_json·Snowflake 키페어 JWT)·`SECRET_KEYS`(`DataExport.php:28`). 테넌트 등록 "우리→구글/스노우플레이크" 발신 자격증명·**GeniegoROI 내부 identity/role/session 전무**(내부 RBAC와 완전 분리).

## 3. Credential 종류·저장 (Crypto AES-256-GCM substrate 실재)

| Credential | 위치 | 저장 |
|---|---|---|
| 채널 API 키/토큰 | `channel_credential.key_value`(`Db.php:976-990`) | AES-256-GCM `enc:vN:`(`ChannelCreds.php:252`·복호 `:191,518,721`) |
| 커넥터 OAuth 토큰 | `connector_token`(`Db.php:961-973`) | AES-256-GCM(`Connectors.php:154-177`) |
| api_key | `api_key.key_hash` | **평문 미저장·sha256 단방향**(`Keys.php:40,116`) |
| 세션 토큰(P5) | `user_session.token` | sha256 해시(`UserAuth.php:30-38,609-610`) |
| MFA 시크릿 | `app_user.mfa_secret` | AES-256-GCM(`UserAuth.php:3880,3903`) |
| SSO OIDC client_secret | `sso_config.oidc_client_secret` | AES-256-GCM(`EnterpriseAuth.php:218`) |
| SCIM 토큰 | `sso_config.scim_token`+`scim_token_hash` | 암호문+sha256 이중(`EnterpriseAuth.php:132-134,169-170,329`) |
| SAML IdP 인증서 | `sso_config.saml_idp_cert` | 평문 TEXT(공개키 성격·`EnterpriseAuth.php:49,143,268`) |
| VAPID 개인키 | `app_setting.webpush_vapid_private` | AES-256-GCM(`WebPush.php:71,349`) |
| **아웃바운드 Webhook 서명 시크릿** | `webhook_endpoint.secret VARCHAR(80)` | **★평문 저장(Crypto 미경유·읽기 시만 마스킹)**(`OpenPlatform.php:81-91,117-121,172-177`·firsthand 확인) |
| Crypto KEK | `app_setting.cred_enc_key`/`cred_kek_vN` | env `CRED_ENC_KEY` 우선·자동생성·fail-closed(`Crypto.php:45-74`) |

★핵심=`Crypto.php` AES-256-GCM 봉투(`:19-21,108-126,161-182`·평문폴백 거부). **예외: webhook_endpoint.secret 평문**(암호화 비대칭·Secret Governance 대상).

## 4. Secret Rotation/Expiration/Version — 함수 실재·정책/스케줄 부재

- api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`·무파괴·admin 수동 `routes.php:920`→`EnterpriseAuth.php:466-473`)·SCIM 토큰 회전(`EnterpriseAuth.php:917`). **전부 수동 HTTP·자동/주기 스케줄 부재**(bin 35 cron grep 0).
- api_key 만료=`expires_at`(생성 시 클라 지정·**강제 max TTL 없음**·게이트 검사 `index.php:518-520`). connector_token expires_at+oauth_refresh_cron=**외부 벤더 토큰 갱신**(내부 회전 아님). 버전=KEK만(`Crypto.php:23-24`)·api_key는 회전=신규 row.

## 5. Certificate/mTLS/OAuth/JWT — 발급/검증만·governance ABSENT

- SAML sig 검증(`EnterpriseAuth.php:268`·C14N+RSA-SHA256)·OIDC JWKS 소비(`:522-531` kid 매칭)·Google/Snowflake JWT bearer(`Connectors.php:3781-3815`·`DataExport.php:550-584`·1시간 TTL 캐시)·VAPID ES256(`WebPush.php:609-610`). ★**만료 추적/갱신 알림/trust chain/회전 스케줄·client_secret 만료 관리 전 항목 부재**(cert_expires grep 0). **mTLS grep 0·JWKS 자체호스팅 grep 0**(소비만).

## 6. AI Agent identity/governance — ABSENT (설계 오인 방지)

- `agent_mode`(`UserAuth.php:196,1025,1741-1749`·recommend/approval/auto)=**app_user(인간) 소유 자동화 자율성 설정**·AI Agent identity 아님(변경 감사 actor=human `:1748`). `AiGenerate.php:29-51`=인간 session/api_key 재사용·ai_settings.api_key 사용·별도 agent 식별자/세션/role 없음. X-Agent/ai_agent grep 0. AgencyPortal=인간 파트너(AI Agent 무관·명칭 혼동).

## 7. Integration identity — ABSENT

- ChannelCreds(`:25-1284`·channel_credential CRUD·AES-256-GCM·ping 검증 `:576-834`)·Connectors(connector_token). ★"Integration User"=api_key role='connector'(`Keys.php:95,193,208`)가 최근접이나 api_key 메타 role 값일 뿐·별도 Integration Identity 엔티티(고유 PK/lifecycle/audit actor) 부재(grep 0). channel_credential=비밀 저장소(주체=테넌트·객체=자격증명·identity 아님).

## 8. Batch/Worker/Scheduler/Queue/ETL identity — 시스템 권한 직접 DB (RBAC 미경유)

- bin 35 cron 전수=`Db::pdo()` 직접(예 `writeback_cron.php:37`)·api_key/세션 미경유. `Db::pdo()`=단일 공유 시스템 자격증명(`Db.php:122-123` root)·워커/cron/HTTP 동일. omni_outbox claim/lease(`Omnichannel.php:95-97,390-446`·claim_id=`bin2hex(random_bytes(8))` `:392`)=**동시성 락 토큰·identity 아님**(SKIP LOCKED). Part 3-3 정합 재확인.

## 9. Runtime Trust Level/Authentication 상태 — ABSENT

- trust_level/TrustLevel/runtime trust grep 0. SystemMetrics unknown/critical=cron 잡 상태 모니터링(`:376,393,397-417`)·identity 신뢰등급 무관(오탐 배제). Valid/Expired/Revoked/Unknown 통합 열거형 grep 0·api_key `is_active`(bool)+`expires_at`(string) 두 필드뿐. Unknown~Critical 5단계·4단계 인증상태 열거형 전무.

## 10. Substrate ↔ Governance 경계 요약 (판정)

| 개념 | 상태 | 근거 |
|---|---|---|
| api_key(비인간 identity·role+scope+만료+회전) | **PARTIAL** | `Db.php:942-958`·`Keys.php:81-187`·`index.php:477-622` |
| Credential 암호화(AES-256-GCM) | **PARTIAL/PRESENT** | `Crypto.php:108-126,133-148` |
| Service/System/Machine/Robot 내부 identity | **ABSENT** | grep 0(외부 서비스계정=아웃바운드) |
| AI Agent identity | **ABSENT** | agent_mode=인간 설정·`UserAuth.php:1748` |
| Integration identity | **ABSENT** | api_key role=connector 근접만 |
| Secret Rotation Policy/스케줄 | **ABSENT**(rotate 함수만) | bin cron grep 0 |
| Certificate/OAuth/JWT governance(만료/갱신/trust chain/회전) | **ABSENT**(발급·검증만) | cert_expires grep 0·mTLS 0 |
| Runtime Trust Level(Unknown~Critical) | **ABSENT** | grep 0 |
| cron/batch identity | **ABSENT**(시스템 공유 자격증명) | `Db.php:122-123` |
| ★webhook_endpoint.secret 평문(암호화 비대칭) | **GAP** | `OpenPlatform.php:84` |

★실 엔진="api_key/Crypto/ChannelCreds 인프라를 재사용 기반으로 삼되 Service Identity Registry/Trust Level/Certificate Governance/Rotation Policy/Machine Role은 신규 계층 신설". 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 RP-002. 이번 차수 코드 0.
