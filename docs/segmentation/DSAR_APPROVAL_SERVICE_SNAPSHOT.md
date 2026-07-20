# DSAR — Service Snapshot (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Snapshot=Append-only(수정 금지) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서(EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT)에서만 인용. 그 밖은 `ABSENT`. 외부 벤더 자격증명(Google/Snowflake)≠내부 identity. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Snapshot = 특정 시점에 Service/System/Machine Identity의 **Runtime Identity·Permission·Scope·Credential Version**(스펙 §23) 전체 상태를 불변으로 동결하는 캡처. Part 3-1 Role Snapshot의 비인간 주체 대응물이다. "지금 이 서비스 identity가 무엇을 가졌는가"가 아니라 **"그 시점에 무엇을 가졌는가"**를 사후 재구성하기 위한 substrate.

- **순신규**: Service Snapshot 개념 자체가 grep 0(전수조사 §10 Substrate↔Governance 경계 요약 — Snapshot/Evidence/Digest/Drift/Revalidation/Reconciliation/Simulation 모두 ABSENT).
- 가장 근접한 substrate인 `api_key`(role+scope+expires_at+is_active)조차 CRUD 최신값만 유지하며 **시점 동결·이력 재구성 수단이 없다**(`Db.php:942-958`·`Keys.php:81-133`).

## 2. Canonical 필드

`SERVICE_SNAPSHOT` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | service_snapshot_id | 스냅샷 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수 · 전역 스냅샷 금지) |
| 3 | service_identity_ref | 대상 Service/System/Machine/API Client Identity 참조 |
| 4 | identity_type | Identity Type(③) |
| 5 | runtime_identity | Environment/Namespace/Cluster/Node/Container/Pod/Pipeline/Application 캡처(스펙 §9) |
| 6 | service_role_ref / service_role_assignment_ref | 동결 시점 Service Role·Assignment 참조 |
| 7 | permission_snapshot | Effective Service Permission 동결(스펙 §23 "Permission") |
| 8 | scope_snapshot | Runtime Scope 동결(스펙 §23 "Scope") |
| 9 | credential_version | Secret/Certificate/OAuth/JWT Version(스펙 §23 "Credential Version") |
| 10 | trust_level | 동결 시점 Trust Level |
| 11 | authentication_state | 동결 시점 Runtime Authentication 상태 |
| 12 | captured_at | 캡처 시각 |
| 13 | snapshot_digest | 무결성 다이제스트(별편 Service Digest 참조) |

## 3. 열거형 / 타입

- **identity_type**: Service Account · API Client · Integration User · Batch User · Scheduler · Worker · Queue Consumer · Queue Producer · ETL · AI Agent · Bot · Kubernetes SA · Serverless Function · Pipeline Identity(스펙 §3)
- **runtime_identity 축**: Environment · Namespace · Cluster · Node · Container · Pod · Pipeline · Application(스펙 §9)
- **credential_version 축**: Secret Version · Certificate Version(스펙 §35)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Snapshot 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| service identity(비인간 · 유일 실 identity) | `api_key`(role+scope+expires_at+is_active) | **PARTIAL**(현재상태만·시점동결 없음) | `Db.php:942-958`·`Keys.php:81-133` |
| credential_version(Secret) | api_key rotate(신규 row 생성)·Crypto KEK 버전 | **PARTIAL**(버전 필드는 KEK뿐) | `Keys.php:150-187`·`Crypto.php:23-24` |
| credential_version(Certificate) | — | **ABSENT** | grep 0(cert_expires grep 0) |
| runtime_identity(Env/Namespace/Cluster/Pod) | — | **ABSENT** | grep 0 |
| permission_snapshot / scope_snapshot | — | **BLOCKED_PREREQUISITE**(Part 2·3-4 부재) | — |
| tenant 격리 | `api_key.tenant_id` | **PARTIAL**(identity 자체는 격리·snapshot 개념 없음) | `Db.php:942-958` |
| **snapshot 시점 동결 자체** | — | **ABSENT** | grep 0 |

> ★외부 벤더 서비스계정 JWT(`Connectors.php:3781-3815`·`DataExport.php:550-584`)는 아웃바운드 자격증명 — Service Snapshot의 내부 identity 대상으로 오흡수 금지.

## 5. 설계 원칙

- **불변(Append-only)**: 스냅샷 생성 후 직접 수정 금지. 변경은 새 스냅샷.
- **Tenant 격리 절대**: `tenant` 필드 필수.
- **외부 벤더 오흡수 금지**: Google/Snowflake 서비스계정 JWT는 Integration Adapter 참조로만 포함, 내부 Service Identity로 등록 금지(ADR D-3).
- **Golden Rule(Extend)**: 중복 스냅샷 스토어 신설 금지. Part 3-1 Role Snapshot과 동형 패턴이나 비인간 축(Service)으로 분리 — Role Snapshot≠Service Snapshot 혼합 금지.
- **forward-only**: 시행일 이후 전방 축적만(소급 스냅샷 불가).

## 6. Gap / BLOCKED_PREREQUISITE

- Service Snapshot 엔티티·runtime identity 캡처·credential_version(Certificate) 캡처 = **전량 ABSENT**.
- Permission/Scope Snapshot 결합 = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine·Part 3-4 Scoped Role 실구현 부재).
- 실 Service Snapshot 엔진 = 선행 Service Identity Registry/Trust Level/Certificate Governance 실구현 후 **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
