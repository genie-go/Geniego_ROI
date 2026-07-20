# DSAR — Service Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Function Regression Gate)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§37(Regression: 기존 Assignment·기존 Dynamic Role·기존 Workflow)의 **기존 기능 회귀 게이트**를 정의한다. Canonical Service Identity Registry는 근접 substrate(api_key/Crypto/ChannelCreds·connector_token)와 시스템 권한 경계(cron/batch·omni_outbox·agent_mode)를 **대체·재구현이 아니라 재사용 기반+거버넌스 계층 신설로 조립**하므로(ADR D-1), **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Canonical Service Identity Registry 실구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. Canonical 필드

- **기능 표면 ID** — 아래 §3 표 번호
- **검증 기준(회귀 0)** — 도입 전/후 판정 동일성 조건
- **현행 substrate** — 근접 인용(file:line)
- **회귀 위험도** — `HIGH`(직접 결정 입력으로 편입) / `MEDIUM`(단일 Registry 수렴 대상) / `LOW`(경계 보존·KEEP_SEPARATE)

## 3. 열거형 / 타입 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) | 위험도 |
|---|---|---|---|---|
| 1 | **api_key 인증 게이트 전체** | sha256 조회+`is_active`(:502-508)·만료(:518-520)·사용량(:522-525)·레이트리밋(:527-570)·RBAC rank+scope(:572-598)·테넌트 바인딩(:609-619) 전 분기 판정 동일 | `index.php:477-622` | **HIGH**(API Client Identity substrate로 확장 대상, ADR D-1) |
| 2 | **api_key CRUD(`/v421/keys`)** | create(role/scope 화이트리스트 `:95,99-114,201-210`)·revoke(`is_active=0` `:135-148`)·rotate(기존row `is_active=0`+신규생성, role/scope/expires 승계 `:150-187`) 판정 전부 동일 | `Keys.php:81-187` | **HIGH**(Service Identity Registry 통합 대상, DUPLICATE_AUDIT D-1) |
| 3 | **api_key CRUD(`/auth/api-keys`, 감사 REAL)** | create/revoke/rotate(`UserAuth.php:4339-4362/4364-4377/4379`) 및 감사 로그 기록(`:4360,4375`) 판정 동일 | `UserAuth.php:4339-4379` | **HIGH**(2경로 통합 시 이 경로의 REAL 감사가 소실되지 않아야 함, DUPLICATE_AUDIT D-1) |
| 4 | **Crypto AES-256-GCM 봉투** | 암호화/복호(`:108-126,161-182`)·평문폴백 거부(fail-closed)·KEK rotateKek 무파괴(`:133-148`) 판정 전부 동일 | `Crypto.php:19-21,108-126,133-148,161-182` | **HIGH**(Secret at-rest substrate로 확장 대상, ADR D-1 SECRET_AT_REST_SUBSTRATE) |
| 5 | **ChannelCreds/connector_token 암호화 저장** | `channel_credential.key_value`(AES-256-GCM `enc:vN:` `ChannelCreds.php:252`, 복호 `:191,518,721`)·`connector_token`(`Connectors.php:154-177`) 저장/조회 판정 동일 | `Db.php:961-990`·`ChannelCreds.php:252`·`Connectors.php:154-177` | **HIGH**(Integration Governance substrate로 흡수 대상, ADR D-1 INTEGRATION_CREDENTIAL) |
| 6 | **cron/batch 시스템 공유 자격증명 직접 DB** | `Db::pdo()`(`Db.php:122-123` root) 경유 워커/cron 동작 판정 동일 — RBAC 미경유 원칙 유지 | `Db.php:122-123` | **MEDIUM**(경계 보존 대상, Service Identity로 오등록 금지) |
| 7 | **omni_outbox claim/lease 동시성 락** | `claim_id=bin2hex(random_bytes(8))`(`Omnichannel.php:392`)·SKIP LOCKED 클레임 판정 동일 — identity 오흡수 금지 | `Omnichannel.php:95-97,390-446` | **LOW**(KEEP_SEPARATE, 락 토큰≠identity) |
| 8 | **agent_mode 인간 자동화 설정** | `recommend/approval/auto` 3단계 설정값·변경 감사 actor=human(`:1748`) 판정 동일 — AI Agent Identity로 오등록 금지 | `UserAuth.php:196,1025,1741-1749` | **LOW**(KEEP_SEPARATE, ADR §AI Agent=인간 자동화 설정) |
| 9 | **외부 벤더 아웃바운드 JWT(Google/Snowflake)** | `googleSaToken`(GA4 RS256 JWT→OAuth2 `Connectors.php:3781-3815`)·Sheets/BigQuery/Snowflake 키페어(`DataExport.php:130-132,550-584`) 발급/캐시 판정 동일 — 내부 identity로 오흡수 금지 | `Connectors.php:3781-3815`·`DataExport.php:130-132,550-584` | **LOW**(KEEP_SEPARATE, ADR D-3) |
| 10 | **rotate 함수군(수동)** | api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`)·SCIM 토큰 회전(`EnterpriseAuth.php:917`) 수동 admin 실행 결과 동일 — Rotation Policy 신설이 자동화를 추가하되 기존 수동 경로 대체 아님 | `Keys.php:150-187`·`Crypto.php:133-148`·`EnterpriseAuth.php:917` | **MEDIUM**(Rotation Policy 수렴 대상) |
| 11 | **평문 토큰 저장(5개소, D-5 gap)** | `agency_session`/`partner_session`/`channel_webhook_token`/`journeys.webhook_token`/`webhook_endpoint.secret` 현재 평문 저장·읽기 로직 동작 판정 동일 — Secret Governance 정합은 **별도 fix 세션**(이번 차수 수정 금지) | `AgencyPortal.php:81,203-205`·`PartnerPortal.php:60-66,177`·`ChannelSync.php:5771-5795,5863-5866`·`JourneyBuilder.php:88,131,159`·`OpenPlatform.php:84,117-121` | **MEDIUM**(Secret Governance 통합 대상, 수정은 별도 승인) |
| 12 | **Part 3-3 Role Assignment / Part 3-5 Dynamic Role 설계 결론** | 두 Part 모두 코드 0(설계만) 상태 — 이 저장소에서 새로 도입하는 Service Identity 설계가 그 결론(BLOCKED_PREREQUISITE·근접 substrate 표)을 뒤집지 않아야 함 | 별도 DSAR 문서군(코드 0) | **LOW**(설계 정합성 보존, 코드 회귀 아님) |

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 회귀 표면 | 판정 | 실 substrate (file:line) |
|---|---|---|
| api_key 인증 게이트 | **API_CLIENT_IDENTITY_SUBSTRATE(확장·무후퇴)** | `index.php:477-622` |
| api_key CRUD 2경로 | **CONSOLIDATION(단일 경로 수렴·무후퇴)** | `Keys.php:81-187`·`UserAuth.php:4339-4379` |
| Crypto AES-256-GCM | **SECRET_AT_REST_SUBSTRATE(확장·무후퇴)** | `Crypto.php:19-21,108-126,133-148,161-182` |
| ChannelCreds/connector_token | **INTEGRATION_CREDENTIAL(흡수·무후퇴)** | `ChannelCreds.php:252`·`Connectors.php:154-177` |
| cron/batch·omni_outbox·agent_mode | **KEEP_SEPARATE(경계 보존)** | `Db.php:122-123`·`Omnichannel.php:95-97,390-446`·`UserAuth.php:196,1741-1749` |
| Google/Snowflake 외부 JWT | **EXTERNAL_OUTBOUND(오흡수 금지)** | `Connectors.php:3781-3815`·`DataExport.php:550-584` |
| rotate 함수군 | **ROTATION_POLICY 승격 대상(무후퇴)** | `Keys.php:150-187`·`Crypto.php:133-148`·`EnterpriseAuth.php:917` |
| 평문 토큰 5개소 | **SECRET_GOVERNANCE_TARGET(별도 fix·이번 차수 수정 금지)** | DUPLICATE_AUDIT D-2·D-5 전체 목록 |

## 5. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — Canonical Service Identity Registry는 api_key/Crypto/ChannelCreds를 삭제하지 않고 **재사용 기반+거버넌스 계층 신설로 조립**하므로(ADR D-1), 정형화 후에도 위 12개 표면은 **동일 판정**이어야 한다.
2. **api_key 2경로 통합(#2·#3)은 감사가 REAL인 경로(UserAuth.php)의 감사 로직을 소실 없이 승계하는 것이 회귀 기준** — 통합 과정에서 Keys.php 경로의 감사 0건 상태를 신경로 표준으로 삼지 않는다(DUPLICATE_AUDIT D-1 역행 금지).
3. **cron/batch·omni_outbox·agent_mode(#6·#7·#8)는 Service Identity로 등록되지 않는 것이 회귀 기준** — 이들을 Service Identity Registry에 강제 편입하면 그 자체가 ADR 경계 위반(오등록)이며 회귀로 간주.
4. **외부 벤더 JWT(#9)는 내부 identity 판정 로직에 흡수되지 않는 것이 회귀 기준** — 아웃바운드 인증 흐름(발급·1시간 캐시)이 내부 RBAC 게이트를 통과하도록 변경되면 그 자체가 설계 위반.
5. **평문 토큰 5개소(#11)는 이번 차수 수정 대상이 아니며, 수정 시도 자체가 범위 이탈** — Secret Governance 통합은 배포 승인이 필요한 별도 세션(DUPLICATE_AUDIT D-5 원문 유지).
6. **정직 부재는 게이트 대상 아님** — Service Identity Registry·Trust Level·Certificate Governance·Rotation Policy·Machine Role 등은 현재 존재하지 않으므로 "회귀"가 아니라 "신규 기능 검증"으로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Canonical Service Identity Registry + Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5) 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **최고위험 감시 지점(부수 발견 아님·설계 우선순위)**: api_key 게이트 전체 무후퇴(#1)·2경로 통합 시 REAL 감사 승계(#2·#3)·Crypto 봉투 fail-closed 불변(#4)·cron/batch·omni_outbox·agent_mode 오등록 금지(#6·#7·#8)·외부 벤더 JWT 오흡수 금지(#9) — 전부 ADR D-1·GROUND_TRUTH 인용, 본 차수 수정 아님.
- **무후퇴 원칙**: 위 12개 표면은 실존 기능(또는 명시적 유지·경계보존 대상) → Service Identity Registry 도입 과정에서 삭제·재구현·오등록 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = Canonical Service Identity Registry 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_SERVICE_TEST_STRATEGY]] · [[DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT]] · [[DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
