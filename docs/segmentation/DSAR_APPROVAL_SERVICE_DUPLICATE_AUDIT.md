# DSAR — Service/System Identity 중복/산재 감사 (EPIC 06-A-03-02-03-04 Part 3-6 · ⓑ GROUND_TRUTH)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **원칙**: 동일 목적 구현이 있으면 중복 Service Identity Registry/Secret Store 신설 금지 — Canonical Service Identity Registry+Adapter로 통합(Golden Rule). ★외부 벤더 자격증명은 내부 identity로 오흡수 금지.
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **선행**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md)

---

## 0. 총평

비인간 identity/credential이 **통합 Service Identity Registry·Secret Store 없이 산재**. ① api_key **2경로**(감사 비대칭) ② credential/token 저장 **7~8곳 이원화**(해시 vs 평문 vs 암호화) ③ Vault/KMS 부재(env/DB 자가키) ④ rotate 함수 있으나 정책 부재. 신규 Canonical Service Identity Registry는 이 산재를 통합·정합하되, 부수 발견(평문 토큰·webhook 평문)을 Secret Governance 대상으로 등재.

## 1. 확인된 산재/중복/근접

### D-1. ★api_key 2경로 (감사 비대칭)
| 항목 | `/v421/keys`(Keys.php) | `/auth/api-keys`(UserAuth.php) |
|---|---|---|
| 라우트 | `routes.php:867-871,2344-2348` | `routes.php:1557-1560,2537-2540` |
| create/revoke/rotate | `Keys.php:81-133/135-148/150-187` | `UserAuth.php:4339-4362/4364-4377/4379` |
| **감사** | **0건**(SecurityAudit/audit grep 0) | **REAL**(`UserAuth.php:4360,4375`) |
→ 동일 api_key 테이블·동일 기능·감사 유무 상이. 단일 Registry/단일 감사경로로 통합.

### D-2. ★credential/token 저장 7~8곳 이원화 (통합 Secret Store 부재)
| 저장소 | file:line | 방식 |
|---|---|---|
| api_key.key_hash | `Keys.php:40`·`UserAuth.php:4353` | SHA-256 해시 |
| user_session.token | `UserAuth.php:38,610`·`EnterpriseAuth.php:517` | SHA-256 해시(P5) |
| **agency_session.token** | `AgencyPortal.php:81,203-205`(firsthand) | **평문**(`agt_`+hex·hashToken 미경유) |
| **partner_session.token** | `PartnerPortal.php:60-66,177` | **평문** |
| **channel_webhook_token.token** | `ChannelSync.php:5771-5795,5863-5866` | **평문**(hex64) |
| **journeys.webhook_token** | `JourneyBuilder.php:88,131,159` | **평문**(hex32) |
| **webhook_endpoint.secret** | `OpenPlatform.php:84,117-121`(firsthand) | **평문 VARCHAR(80)**·읽기 시만 마스킹 |
| channel_credential.key_value·mfa_secret·oidc_client_secret·scim_token | `ChannelCreds.php:252`·`UserAuth.php:3880`·`EnterpriseAuth.php:129,133` | AES-256-GCM 암호화 |
| review_widget.public_token | `Reviews.php:610-637` | 평문(공개 식별자·비밀 아님·정당) |
| saml_idp_cert | `EnterpriseAuth.php:143` | 평문(공개키·정당) |

→ ★**토큰형 자격증명 이원화**: 해시(user_session/api_key·replay 불가) vs **평문(agency/partner/channel_webhook/journeys 세션·DB덤프 시 즉시 재사용)**. 통합 Secret Store 부재로 핸들러별 개별 저장방식 결정. **★P5(세션토큰 해시)가 별도 테이블(agency/partner/channel_webhook)은 명시적 범위 밖**([[project_n289_post_writeguard_server_enforcement]] P5)이었으므로 이 평문 잔존은 알려진 범위·Secret Governance 통합 대상(수정 아님·이번 차수).

### D-3. Vault/KMS 부재 (env/DB 자가키)
- Crypto KEK=env `CRED_ENC_KEY` 또는 `app_setting.cred_enc_key`(`Crypto.php:45-74`·fail-closed). ★HashiCorp Vault/AWS Secrets Manager/KMS 연동 grep 0(AdminGrowth 1건=무관). Vault Reference credential type(§4)은 순신규.

### D-4. rotate 함수 산재·정책 부재
- api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`)·SCIM(`EnterpriseAuth.php:917`) 전부 수동 admin. 강제 스케줄/자동회전 워커/만료상한 부재(bin 33 cron grep 0). Secret Rotation Policy 순신규.

### D-5. ★부수 발견 (설계 코드0·수정 아님·후속 Secret Governance 대상)
- **평문 토큰/secret at-rest 노출 gap**: agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret가 평문 저장(D-2)·DB덤프 시 replay/서명위조 가능. P5가 user_session/api_key만 해시했고 이들은 범위 밖. Secret Governance(§12)가 해시/암호화로 통합할 대상. **이번 차수 수정 안 함**(설계).
- **(기존·재플래그 아님)** 279차 `db_restore.php` 하드코딩 root 비번(`wms@Genie!61`)+고정 토큰 = 이미 제거(commit a04252b4e2d·git 히스토리 잔존). 현재 워킹트리 하드코딩 secret 0(CI security-scan.yml:57-87 차단 게이트·tools/scan_secrets.sh). [[project_n279_full_audit]] 기존 등재분.

## 2. 중복이 **아닌** 것 (정직 판정)

- Google 서비스계정 JWT·Snowflake 키페어(`Connectors.php:3781-3815`·`DataExport.php:550-584`)=외부 아웃바운드·내부 identity로 오흡수 금지.
- api_key role vs channel_credential=별개(identity vs 비밀저장소).
- SecurityAudit(이벤트 로그)≠Service Snapshot/Drift(상태).
- session hash·saml_idp_cert 평문·review_widget public_token=정당(각 설계 목적).
- cron/omni_outbox claim_id=시스템 권한·동시성 락(identity 아님).

## 3. 통합 결정 (조립 계획)

- **금지**: 신규 Service Identity Registry/Secret Store 병렬 신설하면서 api_key 2경로·평문 토큰 산재 방치·외부 벤더 자격증명 내부 identity 오흡수.
- **채택**: Canonical Service Identity Registry가 (a) api_key를 API Client Identity substrate로 확장(2경로 통합·감사 일원화), (b) credential/token 7~8곳을 통합 Secret Store로 수렴(평문→해시/암호화 정합·D-5), (c) Crypto AES-256-GCM을 Secret at-rest substrate로·Vault Reference 신규, (d) rotate 함수를 Rotation Policy(스케줄/만료상한)로 승격, (e) Trust Level/Certificate Governance/Machine Role/Runtime Authorization 신규, (f) 외부 벤더 JWT는 Integration Adapter(내부 identity 아님). Snapshot/Drift/Simulation 순신규.
- **실 구현**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0). ★D-5 평문 토큰은 별도 fix 세션(배포 승인).
