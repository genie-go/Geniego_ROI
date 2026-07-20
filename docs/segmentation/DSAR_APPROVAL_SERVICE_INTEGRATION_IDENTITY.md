# DSAR — Approval Integration Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Integration Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Integration Identity는 외부 시스템(ERP·CRM·Payment·Settlement·Logistics·External API) 연동 주체를 식별하는 엔티티다(스펙 §1 구현목표 항목5 "Integration Identity"·§2 Canonical Entity `APPROVAL_INTEGRATION_IDENTITY`·§21 Integration Governance). 목적은 현재 "credential(비밀) 저장소"와 "identity(주체)"가 분리되지 않은 상태를 바로잡아, Integration 주체 자체를 독립 엔티티로 설계하는 것이다 — channel_credential/connector_token은 그대로 credential substrate로 재사용하되(D-1 INTEGRATION_CREDENTIAL 흡수), Integration Identity(주체)는 순신규다.

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§21(Integration Governance)·§35(Database Constraint) 근거의 설계 명세 필드(코드 0·미확정):

- `integration_identity_id`(PK) · `tenant_id` · `integration_type_ref`(→ 스펙 §21: ERP/CRM/Payment/Settlement/Logistics/External API) · `credential_ref`(→ `channel_credential`/`connector_token`, 기존 substrate 참조) · `adapter_ref`(외부 벤더 아웃바운드 구분용, 내부 identity와 격리) · `status`(active/deprecated/retired) · `created_at`/`created_by`

## 3. 열거형 / 타입

- `integration_type`(스펙 §21 Integration Governance): `erp` | `crm` | `payment` | `settlement` | `logistics` | `external_api`
- `status`: `active` | `deprecated` | `retired`

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

- **Integration Identity(주체) 자체 = ABSENT**: 고유 PK/lifecycle/audit actor를 갖춘 별도 엔티티는 grep 0(EXISTING_IMPLEMENTATION §7).
- **최근접 substrate = api_key role='connector'**: `Keys.php:95,193,208`에서 `role` 화이트리스트 값 중 하나로 `connector`가 존재하나, 이는 **api_key 메타데이터의 role 값일 뿐**이며 별도 Integration Identity 엔티티가 아니다(EXISTING_IMPLEMENTATION §7 "근접이나...부재").
- **channel_credential/connector_token = credential(비밀) 저장소·identity 아님**: `ChannelCreds.php:25-1284`(channel_credential CRUD·AES-256-GCM `:252`·ping 검증 `:576-834`)·`connector_token`(`Db.php:961-973`, 암호화 `Connectors.php:154-177`) — 주체는 테넌트, 객체는 자격증명이며 Integration을 대표하는 identity 레코드가 아니다(EXISTING_IMPLEMENTATION §7, DUPLICATE_AUDIT §2 "identity vs 비밀저장소" 정직 판정).
- **★외부 벤더 = 아웃바운드(오흡수 금지)**: Google 서비스계정 JWT(`Connectors.php:3781-3815`, GA4 RS256 JWT→OAuth2)·Snowflake 키페어 JWT(`DataExport.php:550-584`)·`SECRET_KEYS`(`DataExport.php:28`, `:130-132` Sheets/BigQuery service_account_json) — 테넌트가 등록한 "우리→구글/스노우플레이크" 발신 자격증명이며 GeniegoROI 내부 identity/role/session이 전무하다(EXISTING_IMPLEMENTATION §2, ADR D-3).

## 5. 설계 원칙

- **Golden Rule — 흡수 아닌 분리**: `channel_credential`/`connector_token`은 Integration Credential substrate로 그대로 재사용(ADR D-1 INTEGRATION_CREDENTIAL). 그 위에 Integration Identity(주체)를 신설해 credential과 identity를 명확히 분리한다(현재는 이 구분 자체가 없음).
- **api_key role='connector' 대체 금지**: 이 값을 Integration Identity로 오해·대체하지 않는다 — role은 API Client Identity(4번 문서)의 필드이지 별도 주체가 아니다.
- **외부 벤더 Adapter 격리**: Google/Snowflake JWT는 Integration Adapter로 격리하고 내부 role/session과 결합하지 않는다(ADR D-3, §3 경계보존).

## 6. Gap / BLOCKED_PREREQUISITE

- Integration Identity(주체) grep 0. api_key role='connector'는 대체물이 아니다(스코프·목적이 다름).
- Integration Credential(channel_credential/connector_token)은 실재하나 이를 참조할 상위 Integration Identity 골격이 없어 `credential_ref` FK가 결합될 대상이 없다.
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic 실 구현 부재.
