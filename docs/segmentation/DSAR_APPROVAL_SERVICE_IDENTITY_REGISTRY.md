# DSAR — Approval Service Identity Registry (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Identity Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Identity Registry는 비인간 주체(Non-Human Identity) 전체의 최상위 카탈로그 엔티티다(스펙 §1 구현목표 항목1 "Service Identity Registry"·§2 Canonical Entity `APPROVAL_SERVICE_IDENTITY`). 본 문서군 배치 A의 나머지 6편(System/Machine/API Client/Integration/AI Agent/Robot Identity)이 등록되는 상위 등록 지점이며, 그 자체가 인증·권한계산·Trust 평가를 수행하지는 않는다(등록/조회 전용 — Part 3-5 Dynamic Role Registry와 동형 설계). 목적은 현재 통합 없이 완전 부재한 비인간 identity 카탈로그를, 유일 실재 substrate(api_key)와 산재 credential 7~8곳(DUPLICATE_AUDIT D-2)을 흡수할 단일 등록점으로 정형화하는 것이다(ADR D-1 CONSOLIDATION).

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§35(Database Constraint)·§36(Index) 근거의 설계 명세 필드(코드 0·미확정):

- `registry_id`(PK) · `tenant_id`(Tenant Isolation) · `service_identity_key`(고유 식별키) · `identity_type_ref`(→ Identity Type, 스펙 §3 — Service Account/API Client/Integration User/Batch User/Scheduler/Worker/Queue Consumer/Queue Producer/ETL/AI Agent/Bot/K8s SA/Serverless Function/Pipeline Identity) · `substrate_ref`(어느 실 substrate에 매핑되는지 — api_key/Crypto/ChannelCreds/ABSENT) · `trust_level_ref`(→ 스펙 §6, BLOCKED) · `status`(active/deprecated/retired) · `created_at`/`created_by` · `updated_at`

## 3. 열거형 / 타입

- `identity_type`: 스펙 §3 Identity Type 14종(Service Account · API Client · Integration User · Batch User · Scheduler · Worker · Queue Consumer · Queue Producer · ETL · AI Agent · Bot · Kubernetes SA · Serverless Function · Pipeline Identity)
- `status`: `active` | `deprecated` | `retired`
- `substrate_status`(내부 판정 태그, ground-truth §10 경계표 재사용): `PARTIAL` | `ABSENT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **통합 Registry = ABSENT**: 내부 엔티티(service_account_id/machine_role/robot_account/system_actor/non_human) grep 0(EXISTING_IMPLEMENTATION §2). "비인간 주체를 등록하는 단일 카탈로그" 개념 자체가 존재하지 않는다.
- **유일 근접 substrate = api_key(PARTIAL)**: `api_key(id,tenant_id,key_prefix,key_hash(sha256),name,role,scopes_json,is_active,expires_at)`(`Db.php:942-958`). role(4단계 rank)+scope+expires_at+is_active+rotate를 갖춘 유일 실 비인간 identity(EXISTING_IMPLEMENTATION §1). 단 통합 Registry에 등록된 것이 아니라 독립 테이블로 존재.
- **산재 상태(통합대상, DUPLICATE_AUDIT D-2)**: credential/token 저장 7~8곳 이원화 — 해시(`api_key.key_hash` `Keys.php:40`, `user_session.token` `UserAuth.php:38,610`) vs 평문(`agency_session.token` `AgencyPortal.php:81,203-205`, `partner_session.token` `PartnerPortal.php:60-66,177`, `channel_webhook_token.token` `ChannelSync.php:5771-5795,5863-5866`, `journeys.webhook_token` `JourneyBuilder.php:88,131,159`, `webhook_endpoint.secret` `OpenPlatform.php:84,117-121`) vs 암호화(`channel_credential.key_value` `ChannelCreds.php:252`). 통합 Secret Store 부재로 핸들러별 개별 저장방식 결정(DUPLICATE_AUDIT §1 D-2).
- **api_key 자체도 2경로(DUPLICATE_AUDIT D-1)**: `Keys.php`(`routes.php:867-871,2344-2348`, 감사 0건) vs `UserAuth.php`(`routes.php:1557-1560,2537-2540`, create/revoke/rotate `UserAuth.php:4339-4362/4364-4377/4379`, 감사 REAL `UserAuth.php:4360,4375`) — 동일 테이블·동일 기능·감사 유무 상이.

## 5. 설계 원칙

- **Golden Rule — 제로 신설 + 조립**: Canonical Service Identity Registry를 신설하되, api_key를 API Client Identity substrate로(4번 문서), Crypto/ChannelCreds를 Secret at-rest substrate로 각각 **등록 대상(adapter)**으로 흡수한다(직접 대체 아님). 중복 Registry/Secret Store 병렬 신설 금지(ADR D-1).
- **api_key 2경로 통합**: Keys.php/UserAuth.php 이원화를 단일 감사경로로 수렴(DUPLICATE_AUDIT D-1 채택안).
- **외부 벤더 자격증명 오흡수 금지**: Google 서비스계정 JWT(`Connectors.php:3781-3815`)·Snowflake 키페어(`DataExport.php:550-584`)는 Registry에 내부 identity로 등록하지 않는다(ADR D-3).
- **cron/batch·omni_outbox claim_id 오등록 금지**: 시스템 공유 자격증명(`Db.php:122-123`)·동시성 락 토큰(`Omnichannel.php:392`)은 Service Identity가 아니다(ADR §3 경계보존).

## 6. Gap / BLOCKED_PREREQUISITE

- Service Identity Registry 테이블/엔티티 = grep 0(순신규). api_key·산재 7~8곳 credential이 등록 대상으로만 존재하고 실제 등록 지점이 없다.
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5) 실 구현 없이는 Registry가 참조할 정적 Role Registry 기반이 없다.
- 하위 6개 identity 유형 엔티티(System/Machine/API Client/Integration/AI Agent/Robot — 본 배치 2~7편)가 먼저 확정되어야 Registry의 `identity_type_ref` FK 설계가 완결된다(순서: Registry 골격 → 하위 유형 → FK 결합).
