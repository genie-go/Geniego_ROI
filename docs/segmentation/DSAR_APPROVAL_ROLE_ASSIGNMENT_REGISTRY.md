# DSAR — Approval Role Assignment Registry (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT_REGISTRY`(스펙 §2 Canonical Entity)는 테넌트별 Assignment 정책의 최상위 컨테이너다. 스펙 §4(Assignment Registry)에 따라 Registry는 개별 Assignment(Definition)를 생성하지 않고, 그 Assignment들이 따라야 할 **Policy 집합**(Assignment/Approval/Renewal/Expiration/Risk/Review/Evidence/Snapshot/Cache/Audit Policy)을 테넌트 단위로 고정한다. Part 3-3의 핵심 목적은 이 Registry가 현재 3개 클래스(`UserAuth`/`EnterpriseAuth`/`TeamPermissions`)가 `app_user.team_role` 컬럼에 독립적으로 수행하는 write와, api_key.role 2경로, admin_level, wms_permissions, pm_task_assignees를 **단일 진입점으로 중개**하는 통합 지점이 되는 것이다(ADR D-1). Registry 자체는 값 저장소가 아니라 "이 테넌트에서 Assignment가 어떤 규칙으로 생성·승인·만료·감사되는가"를 규정하는 정책 컨테이너다.

## 2. Canonical 필드

스펙 §4 원문 그대로:

- **Registry ID** — Registry 고유 식별자.
- **Tenant** — 테넌트 스코프(현행 `X-Tenant-Id` 격리 원칙과 정합).
- **Registry Type** — Registry 분류(예: 기본/도메인별 — Part 3-4+ Scoped/Dynamic/Service 확장에서 세분).
- **Assignment Policy** — 어떤 Assignment 유형(Direct/Group/Temporary/Emergency 등)이 허용되는지.
- **Approval Policy** — 필수 Approval 단계(Auto/Single/Dual/Multi-stage/Risk-based) 지정.
- **Renewal Policy** — 갱신 규칙(Manual/Auto/Approval Required/Review Required).
- **Expiration Policy** — 만료 규칙(Fixed Date/Relative Duration/Scheduled/Immediate).
- **Risk Policy** — Assignment Risk 평가 기준.
- **Review Policy** — 정기 재검증(Revalidation) 주기·트리거.
- **Evidence Policy** — 필수 Evidence 유형(Approval/Review/Business Reason/Incident/Snapshot/Audit).
- **Snapshot Policy** — Snapshot 생성 시점·보존 규칙.
- **Cache Policy** — Assignment Cache 무효화 트리거(§34 Cache Invalidation과 연동).
- **Audit Policy** — 감사 이벤트 종류·보존 기간.

## 3. 열거형 / 타입

- **Registry Type**(설계 제안, 스펙 비열거 — Part 3-4+에서 구체화 예정): `DEFAULT` · `SCOPED`(Part 3-4 연동) · `DYNAMIC`(Part 3-5 연동) · `SERVICE_SYSTEM`(Part 3-6 연동). 스펙 §4는 "Registry Type" 필드만 명시하고 값 목록은 열거하지 않으므로, 위 4값은 Part 3-4~3-6 확장 포인트에 맞춘 **설계 제안**이며 스펙 원문 값이 아님을 명시한다.
- **각 Policy 필드의 값 도메인**은 해당 세부 엔티티 DSAR(`DSAR_APPROVAL_ROLE_ASSIGNMENT_POLICY`)에서 정의(Assignment Policy Type·Approval Policy Type 등은 스펙 §9·§21~§25에서 파생).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **정책 컨테이너 자체 = ABSENT**. 테넌트 단위로 "Assignment가 어떤 규칙을 따르는가"를 명문화한 Registry/Policy 오브젝트는 grep 0(ground-truth §6 "부재(순신규)" 목록에 Registry/Definition 구조체 포함).
- **Registry가 중개해야 할 5분산 write는 PARTIAL 실재**(ADR D-1 표):
  - `app_user.team_role` 3핸들러 독립 write — `UserAuth::createTeamMember`(`UserAuth.php:1334`)·`updateTeamMember`(`UserAuth.php:1392`)·`EnterpriseAuth::provisionUser`(`EnterpriseAuth.php:507-509`)·`TeamPermissions::promoteManager`(중복감사 D-1)·화이트리스트 검증규칙이 클래스마다 독립.
  - `api_key.role` 2경로 — `Keys.php:81-187`(scope 상한 `allowedScopesForRole:101-114,201-210`·감사 0) vs `UserAuth.php:4340-4399`(감사 O·`:4360,4375,4398`).
  - `wms_permissions` — `Wms.php:505-517`(항상 INSERT만·역할 화이트리스트 없음·UNIQUE 없음·`:72-76,114`).
  - `pm_task_assignees` — `PM/Assignees.php:17-49`(ROLE_ENUM `:14`·UNIQUE 409 `:36-38`·감사 내장 `:41-47`).
  - sub-admin 발급 — `UserAuth.php:1639-1648`(admin_level='sub' 강제).
- **개별 Policy 필드 substrate**: Approval Policy(승인 workflow) = 부재(전수 grep 0·ADR §3 "승인·SoD·위임 정직 판정"). Expiration Policy = api_key `expires_at` 게이트(`Keys.php:119,170`·요청시점 강제 `index.php:518-520`)만 근접·워커 없음. Audit Policy = `auth_audit_log`(비일관·`UserAuth.php:4165,4174-4197`)+`pm_audit_log`(`Shared.php:129-148`) 2중 테이블(중복감사 D-3)·SecurityAudit tamper-evident 체인(`SecurityAudit.php:56-68`)은 role assignment 이벤트 미기록.

## 5. 설계 원칙

- Registry는 **값 저장소가 아니라 정책 컨테이너** — 개별 team_role/api_key.role/wms_permissions/pm_task_assignees write는 여전히 각 도메인 substrate가 수행하되, Registry가 검증규칙·감사·version을 일원화하는 중개 지점이 된다(ADR D-1 "통합 진입점").
- 신규 Registry/Service/Resolver를 **병렬 신설하지 않는다**(중복감사 §3 "금지" 조항) — 3분산 write를 방치한 채 새 Registry만 얹으면 우회 경로가 잔존(가짜 녹색, ADR 대안 C 기각 사유).
- 폐기된 `admin_roles`/`user_roles`(289차 `c1646bc`)를 Registry나 그 하위 개념으로 재부활하지 않는다(D-3 "인가 실소비 role에만").
- Registry Type·Policy 필드는 Part 3-4(Scoped)·3-5(Dynamic)·3-6(Service/System)가 재사용할 확장 포인트로 설계하되, 이번 차수는 필드 정의만(코드 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Registry의 Approval Policy/Risk Policy가 참조할 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core가 전부 설계 단계(코드 0)라 실제 정책 바인딩 불가.
- **Gap**: 5분산 write를 단일 Registry 진입점으로 중개하는 조립 계층 자체가 순신규(라우팅/미들웨어 계층 없음). Registry Type 값 목록은 스펙 비열거 — Part 3-4+ 설계 확정 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수는 필드·정책 컨테이너 설계 명세만(코드 0).
