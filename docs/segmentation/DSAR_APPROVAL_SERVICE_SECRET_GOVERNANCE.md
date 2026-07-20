# DSAR — Approval Service Secret Governance (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Secret Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Secret Governance는 Service Credential(§3-6-6 자매편)의 생애주기 정책을 다룬다(스펙 §12 Secret Governance·Canonical Entity `APPROVAL_SERVICE_SECRET`, §2). "이 비밀은 언제 회전되어야 하며, 만료 시 무엇이 일어나고, 버전은 어떻게 관리되며, 회전 이벤트는 감사되는가"를 정형화한다. ADR D-4(credential at-rest 통합·평문 토큰 정합)의 정책 계층에 해당한다.

## 2. Canonical 필드

스펙 §2·§12 근거 설계 필드(코드 0·미확정):

- `secret_governance_id`(PK) · `credential_ref`(→ Service Credential) · `rotation_policy_ref`(스케줄/트리거) · `max_ttl` · `current_version` · `expires_at` · `revoked_at` · `last_rotated_at` · `rotation_audit_ref` · `tenant_id`

## 3. 열거형 / 타입

- 스펙 §12 5요소(열거형이 아닌 정책 구성요소): Secret Rotation · Expiration · Version · Revocation · Audit.
- 스펙 §33 Warning Contract 관련 상태: Secret Rotation Due · Certificate Expiring · Trust Reduced · Runtime Drift.

## 4. 실 substrate 매핑 (PARTIAL·ground-truth만 인용)

- **★rotate 함수 실재(수동)**: api_key rotate(`Keys.php:150-187` — 기존 `is_active=0`+신규 row 생성·role/scope/expires 승계)·KEK `rotateKek`(`Crypto.php:133-148` — 무파괴 재암호화·admin 수동 HTTP `routes.php:920`→`EnterpriseAuth.php:466-473`)·SCIM 토큰 회전(`EnterpriseAuth.php:917`). **전부 수동 admin HTTP 트리거이며 자동/주기 스케줄 부재**(bin 35 cron grep 0, 전수조사 §4).
- **`Expiration` = 필드는 있으나 강제상한 부재**: api_key `expires_at`(`Db.php:942-958`)은 생성 시 클라이언트가 지정하며 게이트(`index.php:518-520`)에서 검사되나, **강제 max TTL 없음**(전수조사 §4). connector_token의 `expires_at`+`oauth_refresh_cron`은 외부 벤더 토큰 갱신이며 내부 Secret Rotation Policy와는 별개(전수조사 §4).
- **`Version` = KEK만 버전 관리, 나머지는 회전=신규 row**: Crypto KEK는 버전 관리(`Crypto.php:23-24`)되나, api_key는 회전 시 이전 row를 비활성화하고 신규 row를 생성하는 방식(버전 체계가 아니라 row 교체)이다(전수조사 §4).
- **`Revocation` = 실재(수동)**: api_key `revoke`(`Keys.php:135-148`, `is_active=0`)가 실재한다.
- **`Audit` = api_key 2경로 중 1경로만**: `/auth/api-keys`(UserAuth.php) 경로의 create/revoke/rotate는 감사 REAL(`UserAuth.php:4360,4375`)이나, `/v421/keys`(Keys.php) 경로는 감사 0건(SecurityAudit/audit grep 0, 중복 감사 D-1) — 동일 `api_key` 테이블에 대해 감사 유무가 경로별로 상이(비대칭).
- **★평문 credential = Secret Governance 미적용 상태로 방치(D-5 인용·수정 아님)**: `agency_session.token`(`AgencyPortal.php:81,203-205`)·`partner_session.token`(`PartnerPortal.php:60-66,177`)·`channel_webhook_token.token`(`ChannelSync.php:5771-5795,5863-5866`)·`journeys.webhook_token`(`JourneyBuilder.php:88,131,159`)·`webhook_endpoint.secret`(`OpenPlatform.php:84,117-121`)이 평문 저장이며, 회전/만료/버전 정책이 전혀 적용되지 않는다(중복 감사 D-2·D-5 — "P5 범위 밖·Secret Governance 통합 대상·이번 차수 수정 안 함"). 279차 `db_restore.php` 하드코딩 비번은 이미 제거된 기존 항목이며 재플래그 아님(중복 감사 D-5 각주).
- **`Secret Rotation Due`/`Certificate Expiring` Warning Contract = ABSENT**: 회전 임박/만료 임박 경고 발생 로직 grep 0 — 회전 함수는 있으나 "언제 회전해야 하는지 알려주는" 사전 경고 체계가 없다.

## 5. 설계 원칙

- **rotate 함수를 Rotation Policy로 승격(발명 아님)**: `Keys.php:150-187`·`Crypto.php:133-148`·`EnterpriseAuth.php:917`를 정책 엔진의 실행 primitive로 재사용하되, 그 위에 스케줄(주기 트리거)·강제 max TTL·자동 워커를 신규로 얹는다(ADR D-1 `ROTATION_POLICY 승격`).
- **api_key 2경로 감사 비대칭을 단일 경로로 통합**: `/v421/keys`와 `/auth/api-keys` 양쪽이 동일 `api_key` 테이블을 조작하므로, Secret Governance의 `Audit` 요소는 두 경로 모두에서 동일하게 발동하도록 통합 설계(중복 감사 D-1 "단일 Registry/단일 감사경로로 통합").
- **평문 토큰 5곳의 해시/암호화 전환은 Secret Governance의 최우선 정합 항목**: 설계상 이들을 `Password`/`Secret`/`API Key` 타입(§3-6-6)으로 재분류하고 `Crypto.php` 봉투 또는 해시로 전환하는 계획을 명문화하되, **코드 변경은 이번 차수에서 하지 않는다**(별도 fix 세션·배포 승인 필요, ADR §5 "부수 발견").
- **Warning Contract(Secret Rotation Due 등)는 Runtime Guard(§3-6 Runtime Authentication/Trust Level 자매편)와 결합**: 회전 기한 경고가 Trust Level 하락으로 이어지는 결합 설계이나 이번 차수는 개념 정의만.

## 6. Gap / BLOCKED_PREREQUISITE

- ★자동/주기 회전 워커 = 순신규(bin cron grep 0) — 스케줄러 인프라 자체가 없어 "정책"을 만들어도 실행 주체가 없다.
- ★평문 토큰 5곳(agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret)은 Secret Governance 설계상 최우선 정합 대상으로 등재하되, **코드 수정은 별도 승인 세션**(이번 차수는 설계 명세·문서 등재만, 배포 승인 없이 수정 금지).
- **BLOCKED_PREREQUISITE(RP-002)**: 회전 이벤트가 Trust Level 재산출·Runtime Guard 차단으로 이어지는 결합은 Trust Level(§3-6-4)·Decision Core가 선행 확정되어야 함.
- api_key 2경로 감사 통합(D-1)은 Role Registry(Part 3-1)와 동일한 "2경로 존재" 패턴이며, 그 정합 설계 순서는 Part 3-1 통합 계획과 동기화 필요(중복 정합 회귀 방지).
