# DSAR — Approval Role Registry (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Registry는 플랫폼·테넌트 전체의 **모든 Role을 단일 정본으로 등록·소유·인증·스냅샷하는 최상위 컨테이너 엔티티**다. 현재 Role은 team_role·api_key role·admin_level·AdminMenu ROLE_ENUM·plan 'admin'의 **5개 무관 어휘로 산재**하며 통합 정본이 없다. 본 엔티티는 이들을 대체·재구현하지 않고 **하나의 Registry 밑에 정형화(정규화)하는 계약**을 정의한다. 실제 Role 판정 코드는 그대로 두고(회귀 0), Registry는 "어떤 Role 어휘/actor type/lifecycle가 이 테넌트에서 유효한가"를 선언·인증·버전화하는 상위 데이터층이다. **중복 Role Registry 신설 금지** — 폐기된 admin_roles/user_roles의 재부활이 아니라 team_role/TeamPermissions 위에 신설한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_registry_id` | Registry 식별자(PK) |
| `registry_code` | Registry Canonical Code(테넌트/도메인 단위 유일) |
| `registry_type` | Registry 분류(§3 열거) |
| `tenant_id` | 테넌트 격리 키(플랫폼 Registry는 `__platform__`) |
| `supported_role_types` | 이 Registry가 수용하는 Role Type 집합(§3) |
| `supported_actor_types` | 수용 actor type(HUMAN/SERVICE_ACCOUNT/SYSTEM_ACTOR/API_CLIENT) |
| `hierarchy_supported` | Role 위계 지원 여부(실 위계=Part 3-2) |
| `composite_supported` | Composite Role 참조 지원 여부(Part 3-2) |
| `dynamic_supported` | Dynamic/조건부 Role 지원 여부(Part 3-5) |
| `scoped_supported` | Scoped Role 지원 여부(Part 3-4) |
| `temporary_supported` | Temporary Role 템플릿 지원 여부 |
| `emergency_supported` | Emergency(break-glass) Role 지원 여부 |
| `service_account_supported` | Service Account Role 지원 여부(Part 3-6) |
| `system_actor_supported` | System Actor Role 지원 여부 |
| `api_client_supported` | API Client Role 지원 여부 |
| `ownership_required` | Role 소유자(Business/Technical/Security) 필수 여부 |
| `review_required` | 주기 Review 필수 여부 |
| `certification_required` | 인증(Certification) 필수 여부 |
| `snapshot_required` | 정의 Snapshot 필수 여부 |
| `evidence_required` | 변경 Evidence 필수 여부 |
| `audit_required` | 감사 이벤트 필수 여부 |
| `business_owner` / `technical_owner` / `security_owner` | Registry 3 소유자(§6.16) |
| `active_version` | 현재 유효 Registry Version 참조 |
| `status` | Registry Lifecycle(§3) |
| `digest` | Registry 정의 불변 digest(무결성) |

## 3. 열거형 / 타입

- **`registry_type`**: `PLATFORM` · `TENANT` · `APPROVAL` · `FINANCIAL` · `PAYMENT` · `SETTLEMENT` · `REBATE` · `CLAIM` · `CONTRACT` · `SECURITY` · `COMPLIANCE` · `LEGAL` · `ADMINISTRATION` · `DATA` · `REPORTING` · `INTEGRATION` · `CUSTOM`.
- **`supported_role_types`**(요소): `PLATFORM_ROLE` · `TENANT_ROLE` · `APPROVAL_ROLE` · `SERVICE_ACCOUNT_ROLE` · `SYSTEM_ACTOR_ROLE` · `API_CLIENT_ROLE` · `COMPOSITE_ROLE` · `DYNAMIC_ROLE` · `SCOPED_ROLE` · `TEMPORARY_ROLE` · `EMERGENCY_ROLE`.
- **`supported_actor_types`**: `HUMAN` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT`.
- **`status`**(Registry Lifecycle): `DRAFT` · `ACTIVE` · `LOCKED` · `DEPRECATED` · `ARCHIVED`.
- Boolean 계약 필드(`*_supported`, `*_required`)는 §6.17 Mandatory Control로 **고객 설정 비활성 불가**(Tenant Isolation·Versioning·Ownership·Snapshot·Evidence·Audit).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Registry(단일 정본) | **ABSENT → 신설** | 통합 Registry 테이블/개념 없음 — 5 어휘 산재 |
| 가장 근접 = team_role 어휘 | **CANONICAL_ROLE_REGISTRY_CANDIDATE(정형화)** | `app_user.team_role`(`UserAuth.php:188`·도출 `:316`) · `TeamPermissions::roleOf`(`TeamPermissions.php:120-131`) |
| 유일한 과거 role-mgmt 시도 | **DEPRECATED(289차 폐기·재부활 금지)** | admin_roles/user_roles(`routes.php:1670`·`UserAdmin.php:596-599`) — 고아 테이블 유지, Registry로 부활 금지 |
| API actor 축 | 별개 actor(API_CLIENT) | `api_key.role`(`Keys.php:95`·roleRank `index.php:573`) |
| plan=admin 내부 세분 | SUB_ROLE_CANDIDATE | `app_user.admin_level`(`UserAdmin.php:43-46`) |
| `registry_code` / `registry_type` / `supported_*` / `*_required` | **ABSENT** | 없음 |
| `active_version` / `digest` / `snapshot` / owner(3) | **ABSENT** | 버전·digest·소유 개념 전무 |

★현행에는 **Registry라는 상위 컨테이너 자체가 부재**하다. team_role 어휘가 개념적 최근접이나 version/namespace/lifecycle/snapshot/owner가 없어 정식 Registry가 아니다.

## 5. 설계 원칙

1. **Extend not Replace** — team_role/TeamPermissions/api_key role/admin_level/AdminMenu enum/SSO map을 Registry 밑 substrate로 흡수. 판정 코드 의미 변경 금지(회귀 0).
2. **폐기 admin_roles 재부활 금지** — 289차 DORMANT 제거 판정 역행 금지(ADR B안 기각).
3. **Tenant Isolation 절대** — Registry는 tenant_id로 격리(플랫폼 Registry는 명시 스코프).
4. **Ownership 필수** — Business/Technical/Security Owner 없는 Registry 금지(§6.16).
5. **Versioned & Immutable** — 정의 변경은 순신규 Version(§ Definition Version 문서), digest로 무결성 봉인. In-place 덮어쓰기 금지.
6. **Mandatory Control 무력화 금지** — `*_required` 계약은 고객 설정으로 끌 수 없음(§6.17).
7. **Role ≠ Plan** — plan 'admin' god flag는 Registry에 흡수하지 않고 §6.5 위반으로 후속 정합(설계 등재만·자립 quick-fix 아님).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Registry가 수용할 Role Definition의 Permission Version 결합은 선행 Part 2 Permission Engine 실 구현(코드 0) 이후 가능. 본 차수 코드 0.
- **Gap-1(ABSENT)**: Registry 컨테이너·registry_code·registry_type·supported_* 계약 전무 — 순신설.
- **Gap-2(값충돌)**: 값 'admin'이 team_role 인접·api_key role·AdminMenu enum·plan god flag에 걸쳐 중복. 통합 Registry namespace 부재(상세=Namespace 문서).
- **Gap-3(§6.5 후속 정합)**: plan 'admin' god flag 누출(`TeamPermissions.php:132`·`AuthContext.jsx:720`) — Registry 도입 시 admin 판정을 plan에서 분리해야 하나 광범위 실코드 영향 → 후속 enforcement Part.
- **정직 부재**: isManager/isApprover/Job Title/Position 개념 레포 전무(ABSENT) — 결함으로 날조 금지. admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine 실 구현 + 별도 승인세션(RP-002).
