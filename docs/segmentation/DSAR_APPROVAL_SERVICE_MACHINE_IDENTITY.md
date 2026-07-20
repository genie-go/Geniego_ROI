# DSAR — Approval Machine Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Machine Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Machine Identity는 인프라 실행체(Kubernetes Service Account·Container Runtime·Serverless Function·CI/CD Pipeline·GitHub Action) 수준의 비인간 주체를 식별하는 엔티티다(스펙 §1 구현목표 항목3 "Machine Identity Registry"·§2 Canonical Entity `APPROVAL_MACHINE_IDENTITY`). 목적은 이 계층의 identity·certificate·mTLS 통제를 향후 설계할 수 있도록 Canonical Interface를 마련하는 것이며, 현재 배포 아키텍처에 이 계층 자체가 코드 수준으로 대응되지 않으므로 실 구현 매핑은 없다(순신규 등재).

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§13(Certificate Governance)·§35(Database Constraint) 근거의 설계 명세 필드(코드 0·미확정):

- `machine_identity_id`(PK) · `tenant_id` · `machine_role_ref`(→ 스펙 §7 Kubernetes Role 등) · `runtime_context_ref`(→ 스펙 §9 Environment/Namespace/Cluster/Node/Container/Pod) · `certificate_ref`(→ 스펙 §13 Certificate Governance, BLOCKED) · `status`(active/deprecated/retired) · `created_at`/`created_by`

## 3. 열거형 / 타입

- `identity_type`(스펙 §3 Identity Type 서브셋): `kubernetes_sa` | `serverless_function` | `pipeline_identity`
- `status`: `active` | `deprecated` | `retired`

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

- **Machine Identity 자체 = ABSENT**: 내부 엔티티(`machine_role`/`k8s_sa`/`container_runtime`/`robot_account`/`non_human`) grep 0(EXISTING_IMPLEMENTATION §2).
- **mTLS/자체호스팅 JWKS = ABSENT**: `mTLS grep 0`·`JWKS 자체호스팅 grep 0`(소비만, OIDC JWKS는 발급이 아니라 kid 매칭 소비 — EXISTING_IMPLEMENTATION §5). Google/Snowflake JWT bearer(`Connectors.php:3781-3815`, `DataExport.php:550-584`)는 아웃바운드 소비 substrate이며 Machine Identity와 무관(외부 벤더 자격증명, 오흡수 금지).
- **Certificate governance 전 항목 = ABSENT**: 만료 추적/갱신 알림/trust chain/회전 스케줄/client_secret 만료 관리 전부 부재(`cert_expires` grep 0, EXISTING_IMPLEMENTATION §5).

## 5. 설계 원칙

- **오흡수 금지**: SystemMetrics의 cron 잡 상태 모니터링(`SystemMetrics.php:376,393,397-417`)이나 Google/Snowflake 외부 JWT(`Connectors.php:3781-3815`)를 Machine Identity로 재해석하지 않는다 — 전자는 잡 상태, 후자는 아웃바운드 자격증명이다.
- **순신규 명시**: 이 계층은 Golden Rule의 "확장" 대상이 존재하지 않는 드문 경우 — 재사용할 근접 substrate가 코드에 없으므로 신규 설계로만 등재하고, 실 인프라(K8s/서버리스) 도입 여부와 결합된 후속 결정이 필요함을 명시.
- **Certificate Governance 선결합**: `certificate_ref`는 Certificate Governance(§13) 엔티티 확정 전에는 채울 수 없다 — BLOCKED_PREREQUISITE.

## 6. Gap / BLOCKED_PREREQUISITE

- Machine Identity 관련 코드 substrate = grep 0 전면(cert_expires·mTLS·JWKS 자체호스팅 포함).
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic 실 구현 부재.
- Certificate Governance(스펙 §13) 자체도 이번 배치 범위 밖 별도 엔티티 — Machine Identity의 `certificate_ref`가 참조할 대상이 아직 설계되지 않았다(순서: Machine Identity 골격 → Certificate Governance → 결합).
