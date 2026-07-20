# DSAR — Approval Service Role (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Role은 비인간 주체에게 부여되는 역할 정의체다(스펙 §7·Canonical Entity `APPROVAL_SERVICE_ROLE`, §2). Part 3-1 Role Registry(인간 role)와 대비되는 개념으로, "이 서비스 identity는 어떤 종류의 작업 권한 범주를 갖는가"(API 호출/연동/스케줄 실행/워커 처리/AI 추론/ETL/배치/K8s 오케스트레이션)를 선언한다.

## 2. Canonical 필드

스펙 §2·§7 근거 설계 필드(코드 0·미확정):

- `service_role_id`(PK) · `role_category`(§3 8유형 중 1) · `identity_type_ref`(→ Service Identity Type) · `static_permission_base`(정적 Permission Engine 결합점) · `runtime_scope_projection_ref` · `tenant_id` · `version_ref`(Immutable, §35)

## 3. 열거형 / 타입

- `role_category`(스펙 §7, 8유형): API Role · Integration Role · Scheduler Role · Worker Role · AI Role · ETL Role · Batch Role · Kubernetes Role.

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Service Role 자체 = ABSENT**: `service_account_id`/`machine_role`/`robot_account`/`system_actor`/`non_human` grep 0(전수조사 §2). 내부 RBAC role 값 자체가 `owner/manager/member/admin`(`TeamPermissions.php:123-136,245-246,368-390`)뿐이며 이는 **인간 계정 전용** — Service/Machine/API/Integration/Scheduler/Worker/AI/ETL/Batch/K8s Role 값 부재.
- **api_key.role = 가장 근접한 substrate(PARTIAL)**: `api_key`(`Db.php:942-958`)의 `role` 컬럼(기본값 `viewer`)이 4단계 rank로 인증 게이트(`index.php:572-598`)에서 소비되며, `role='connector'`(`Keys.php:95,193,208`)가 `Integration Role`에 근접하다. 그러나 이 role은 Human RBAC와 **동일 4단계 체계를 공유**(viewer/connector/analyst/admin)할 뿐, 스펙 §7의 8종 Service Role 카테고리(API/Integration/Scheduler/Worker/AI/ETL/Batch/Kubernetes)로 세분화되어 있지 않다.
- **`API Role`/`Integration Role` 외 6종 = 완전 ABSENT**: Scheduler/Worker/AI/ETL/Batch/Kubernetes Role은 grep 0. cron/batch는 시스템 공유 자격증명(`Db.php:122-123`)으로 role 구분 없이 실행되며(전수조사 §8), `agent_mode`(`UserAuth.php:196,1741-1749`)는 AI Role이 아니라 인간 사용자의 자동화 자율성 설정이다(전수조사 §6).
- **외부 벤더 JWT는 Service Role로 오등록 금지**: Google 서비스계정 JWT(`Connectors.php:3781-3815`)·Snowflake 키페어(`DataExport.php:550-584`)는 내부 role 개념과 무관한 아웃바운드 인증(ADR D-3).

## 5. 설계 원칙

- **api_key.role을 Service Role의 substrate로 확장(발명 아님)**: 신규 Service Role 카테고리 체계를 신설하되, `API Role`은 기존 `api_key.role`(rank 체계) 확장으로 흡수한다(ADR D-1 `API_CLIENT_IDENTITY_SUBSTRATE`). 병렬 role 테이블 신설 금지.
- **Human role과 Service Role의 값공간 분리**: `owner/manager/member/admin`(인간 전용, `TeamPermissions.php`)과 Service Role 8유형은 별도 값공간이어야 한다 — 동일 컬럼에 혼재 금지(개념 오염 방지).
- **`static_permission_base` 결합은 Permission Engine 확정 후**: Service Role이 실제 권한을 갖으려면 Part 2 Permission Engine과의 결합이 필요하나, Part 2가 아직 설계 단계(코드 0)이므로 이 결합은 BLOCKED.

## 6. Gap / BLOCKED_PREREQUISITE

- 8유형 중 `API Role`/`Integration Role`만 근접 substrate(api_key.role) 보유, 나머지 6유형(Scheduler/Worker/AI/ETL/Batch/Kubernetes)은 substrate 자체가 없어 순수 신규 스키마 필요.
- **BLOCKED_PREREQUISITE(RP-002)**: `static_permission_base` 결합 대상인 Permission Engine(Part 2)·Role Registry(Part 3-1)가 설계 명세(코드 0) 단계 — Service Role↔Permission 결합 설계는 그 확정 후 순차 진행.
- Service Identity Type(§3-6-1 자매편)이 선행 확정되어야 `identity_type_ref` FK가 의미를 가진다 — Type·Role 두 엔티티는 상호 참조 관계로 동시 설계되었으나 실 스키마는 둘 다 미확정.
