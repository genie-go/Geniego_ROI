# ADR — Service / System Role Governance (EPIC 06-A-03-02-03-04 Part 3-6)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Permission Engine + Role Registry/Hierarchy/Assignment/Scoped/Dynamic + Decision Core 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-20)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-6 — Service/System Role Governance (사용자 제공 verbatim · [`docs/spec/EPIC_06A_PART3_6_SERVICE_SYSTEM_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_6_SERVICE_SYSTEM_ROLE_GOVERNANCE_SPEC.md))
- **선행 블록**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)(Part 3-5) · [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)(Part 3-4) · [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)(Part 3-3) · [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)(Part 3-2) · [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)(Part 3-1)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n279_full_audit]] · [[reference_session_credentials]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-6 — Service/System Role Governance**. Part 3-1~3-5(Human RBAC Role/Hierarchy/Assignment/Scoped/Dynamic) 위에서, **비인간 주체(Non-Human Identity: Service Account·System·Machine·API Client·Integration·AI Agent·Bot·Worker·Batch·Queue·ETL·K8s SA·Serverless·Pipeline)**를 사람과 동일(이상) 수준으로 통제한다 — "서비스 계정도 사람보다 더 엄격하게". Service Identity Registry·Machine Role·Credential/Secret/Certificate Governance·Runtime Trust Level·Runtime Authorization·Effective Service Permission을 정형화. Part 3-7 Effective Resolution·3-13 Zero Trust가 재사용할 Service Identity Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0).

★**능력 기반 전수조사(ⓑ·GROUND_TRUTH·2 Explore 스레드+firsthand)** 핵심 결론 — **PARTIAL substrate 일부 실재(Part 3-3/3-4 계열)**:

- **★api_key = 유일 실 비인간 내부 identity(PARTIAL)**: `api_key`(role 4단계+scopes_json+expires_at+is_active·`Db.php:942-958`)·Keys.php CRUD+rotate(수동)·`index.php:477-622` 인증 게이트(만료 `:518-520`·revoke·레이트리밋·RBAC·테넌트 바인딩). 이 외 내부 non-human identity(Service/System/Machine/Robot·AI Agent·Integration·Batch Worker) = 전무.
- **★Credential 암호화 substrate 실재(PARTIAL/PRESENT)**: `Crypto.php` AES-256-GCM 봉투(`:108-126,133-148`·fail-closed·평문폴백 거부·KEK 버전)·channel_credential/connector_token/mfa_secret/oidc_client_secret/scim_token/vapid에 일관. Vault/KMS 부재(env/DB 자가키).
- **★외부 벤더 자격증명 ≠ 내부 identity**: Google GCP 서비스계정 JWT(`Connectors.php:3781-3815`)·Snowflake 키페어(`DataExport.php:550-584`)=아웃바운드·내부 RBAC role/session 전무(오흡수 금지).
- **★거버넌스 계층 완전 부재(ABSENT)**: Service Identity Registry·Trust Level(Unknown~Critical)·Machine/Service Role·Certificate Governance(만료/갱신/trust chain/CRL/OCSP/mTLS)·Secret Rotation Policy(스케줄/자동)·Runtime Authorization·Snapshot/Evidence/Digest/Drift/Revalidation/Reconciliation/Simulation = grep 0.
- **★rotate 함수 실재·정책 부재**: api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`)·SCIM 회전 전부 수동 admin·스케줄/자동회전 워커 부재(bin 33 cron grep 0)·api_key expires_at 강제 max TTL 없음.
- **★cron/batch = 시스템 공유 자격증명 직접 DB(RBAC 미경유)**: bin 35 cron=`Db::pdo()` 단일 root 자격증명(`Db.php:122-123`). omni_outbox claim_id=동시성 락(identity 아님).
- **★AI Agent = 인간 자동화 설정**: agent_mode(`UserAuth.php:196,1741-1749`·recommend/approval/auto)=app_user 소유·actor=human·AI Agent 별도 identity/audit 전무.
- **★credential/token 산재 7~8곳 이원화**: 해시(user_session/api_key) vs 평문(agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret) vs 암호화(channel_credential 등)·통합 Secret Store 부재.

## 2. 결정 (Decision)

### D-1. Canonical Service Identity Registry를 **신설**하되 api_key/Crypto/ChannelCreds 인프라를 재사용 기반으로·통합(Golden Rule). 중복 Registry/Secret Store 신설 금지·외부 벤더 자격증명 내부 identity 오흡수 금지.

| 실존 | 분류 태그 | 결정 |
|---|---|---|
| **api_key(role+scope+만료+회전)** | **API_CLIENT_IDENTITY_SUBSTRATE(확장)** | API Client Identity substrate. 2경로 통합·감사 일원화·Service Role/Trust Level 상위 신설. |
| **Crypto AES-256-GCM** | **SECRET_AT_REST_SUBSTRATE(확장)** | Credential/Secret at-rest 정본. Vault Reference 신규. |
| **ChannelCreds/connector_token** | **INTEGRATION_CREDENTIAL(흡수)** | Integration Governance substrate(테넌트 비밀저장·identity 아님→Integration Identity 신설). |
| **credential/token 7~8곳 산재** | **CONSOLIDATION(통합 Secret Store)** | 평문 토큰→해시/암호화 정합·단일 Secret Store 수렴. |
| **Google/Snowflake 외부 JWT** | **EXTERNAL_OUTBOUND(오흡수 금지·Adapter)** | 아웃바운드 인증·내부 identity 아님. Integration Adapter. |
| **rotate 함수(api_key/KEK/scim)** | **ROTATION_POLICY 승격** | 수동 함수→정책(스케줄/만료상한/자동워커). |
| **Service Identity Registry·Trust Level·Cert Governance·Machine Role·Runtime Auth·Snapshot/Drift** | **ABSENT(순신규)** | 신설. |

### D-2. 서비스 계정도 사람보다 더 엄격 (§0·구현 시 강제)

Trust Level(Unknown~Critical)·Runtime Authentication(Valid/Expired/Revoked/Unknown·UNKNOWN Permit 금지)·강제 Secret Rotation·Certificate 만료/trust chain·mTLS/Vault 요구·Runtime Guard(만료 secret/cert/revoked client 차단). ★현행 api_key expires_at/is_active 게이트(`index.php:518-520`)가 Runtime Guard 근접 substrate이나 강제 TTL·cert guard 없음.

### D-3. 외부 벤더 자격증명 ≠ 내부 identity (정직 판정·오흡수 금지)

Google 서비스계정 JWT·Snowflake 키페어는 아웃바운드(우리→벤더). Service Identity Registry에 내부 identity로 등록 금지·Integration Adapter로 분리(외부 credential 참조만).

### D-4. credential at-rest 통합·평문 토큰 정합 (§12·구현 시)

Crypto AES-256-GCM을 통합 Secret Store substrate로·평문 토큰(agency/partner/channel_webhook/journeys 세션·webhook_endpoint.secret)을 해시/암호화로 정합(D-5 실결함). P5(user_session/api_key 해시)의 미완 확장.

### D-5. 구현 판정 = PARTIAL-substrate/ABSENT-governance/BLOCKED_PREREQUISITE

- api_key(identity)·Crypto(암호화)·api_key 게이트(runtime guard) 실재이나 Service Identity Registry·Trust Level·Cert Governance·Rotation Policy·Machine Role·Snapshot/Drift/Simulation = 순신규.
- 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core가 아직 설계(코드 0)라 Service Role↔Permission 결합·Effective Service Permission = **BLOCKED_PREREQUISITE**.
- 실 엔진="api_key/Crypto/ChannelCreds 재사용 + Service Identity Registry/Trust/Cert/Rotation Policy 신규 계층 신설 + 산재 통합". 이번 차수=설계 명세(코드 0).

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-7+ 재사용)

- **Service/System/Machine Identity Registry·Identity Type·Service Role/Assignment**: api_key를 API Client Identity substrate로·Service Role(API/Integration/Scheduler/Worker/AI/ETL/Batch/K8s Role) 신설. Immutable Version.
- **Credential/Secret/Certificate Governance**: Crypto 봉투를 Secret at-rest substrate로·Secret Rotation Policy(스케줄/만료상한/자동)·Certificate Governance(만료/갱신/trust chain/CRL/OCSP)·OAuth/JWT Governance·Vault Reference 신규.
- **Runtime Trust/Authentication/Authorization·Effective Service Permission·Projection**: Trust Level(Unknown~Critical)·Runtime Authentication(UNKNOWN Permit 금지)·api_key 게이트를 Runtime Guard substrate로.
- **Snapshot/Evidence/Digest/Drift/Revalidation/Reconciliation/Simulation·AI Agent Governance·Integration Governance**: 순신규. SecurityAudit tamper-evident 체인 승격. AI Agent Identity(agent_mode≠identity)·Integration Identity 신설.
- **Adapter(Part 3-7 Effective·3-12 PDP/PEP·3-13 Zero Trust)**: Service Identity Contract·외부 벤더 Integration Adapter(Google/Snowflake JWT=외부·오흡수 금지).
- **경계 보존**: cron/batch(시스템 공유 자격증명)·omni_outbox claim_id(락)·agent_mode(인간 설정)는 Service Identity로 오등록 금지.

## 4. 대안 (Considered)

- **A. 지금 Service Identity Engine 구현** — 기각. 선행 Permission Engine·Role Assignment/Scoped/Dynamic·Decision Core 실 구현 부재·RP-002 위반·중복 엔진 리스크.
- **B. 외부 벤더 서비스계정 JWT를 내부 Service Identity로 등록** — 기각. 아웃바운드 자격증명·내부 RBAC 무관(오흡수=가짜 녹색).
- **C. api_key 2경로·평문 토큰 산재 방치하고 governance 얹기** — 기각. 통합 Registry/Secret Store 없이 얹으면 우회 잔존. 단일 수렴이 정답.
- **D. 설계 명세만(코드 0)+substrate 통합계획+Gap+실결함 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 2/3-1~3-5 동형.

## 5. 귀결 (Consequences)

- (+) api_key(identity)·Crypto(암호화)·api_key 게이트(runtime guard)의 재사용 substrate 지위·2경로/산재 통합 계획 확정("발명 아니라 조립+통합").
- (+) 거버넌스 계층(Registry/Trust Level/Cert Governance/Rotation Policy/Machine Role/Snapshot/Drift) 순신규를 grep 0으로 실증 → 투기성 스키마 방지.
- (+) 정직 판정(외부 벤더 JWT≠내부 identity·AI Agent=인간 설정·cron=시스템 권한·rotate 정책 부재·Trust Level 부재) — 실재 과신·부재 과장 양방향 회피.
- (+) Part 3-7+ Effective/PDP/Zero Trust가 재사용할 Service Identity Contract 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-7 Effective Role Resolution Engine**(스펙 권장순서 §39).
- (★부수) 설계 전수조사 중 발견한 **credential at-rest gap**(설계 코드 0·수정 아님·후속 Secret Governance fix 세션 후보): 평문 토큰 저장(agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret·DB덤프 replay/서명위조 가능·P5 범위 밖). 상세=[`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md) §D-5. (279차 db_restore 하드코딩 비번은 이미 제거·재플래그 아님.)

## 6. 규율 준수

Golden Rule(Extend·중복 Registry/Secret Store 신설 금지·api_key 2경로·산재 통합·외부 벤더 자격증명 내부 identity 오흡수 금지) · 무후퇴 · "결론의 근거도 재실증"(api_key·Crypto·rotate·cert governance 부재·Trust Level 부재·평문 토큰 산재·외부 JWT 전부 grep/코드 정독·firsthand 재검증) · 서비스 계정 사람 이상 통제 · UNKNOWN Permit 금지 · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · 부재 날조·실재 과신 양방향 금지 · 289차 P1~P5·279차 db_restore·AdminMenu 수정분 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
