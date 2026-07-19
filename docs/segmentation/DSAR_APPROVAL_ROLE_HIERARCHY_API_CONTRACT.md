# DSAR — Role Hierarchy API Contract (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§72의 **Role Hierarchy/Composite Role/Role Graph API 계약**을 정의한다. Registry·Edge·Composite·Graph·Validation·Simulation·Migration을 다루는 관리·조회·검증·시뮬레이션 API의 그룹·공통 규약·불변(수정 금지 표면)을 명세한다. 실 엔드포인트는 본 저장소 라우팅 컨벤션(`/api/...`·`/v{NNN}/...` 이중 shape·`routes.php` 문자열 매핑)에 정합해야 하며, **본 차수 코드 0**(설계 계약만).

## 2. Canonical 필드

API 계약 레코드가 갖춰야 할 필드:

- **API Group** — §72.1~§72.6(아래 6항)
- **Operation Type** — `READ`(목록/상세/이력) / `WRITE`(신규 Version 발행) / `VALIDATE`(부작용 없음) / `SIMULATE`(부작용 없음)
- **Auth Requirement** — Bearer/api_key + RBAC role(현행 미들웨어 계승)
- **Write Guard Set** — Expected Version·Idempotency-Key·Correlation ID·Causation ID·Approval Reference·Security Review Reference·Simulation Result Reference·Audit·Evidence·Rate Limit·Server-side Enforcement(전 Write API 공통 필수)
- **Historical Mutation** — 항상 `FORBIDDEN`(Snapshot/Evidence/Audit/Path Evidence 수정 API 미제공)

## 3. 열거형 / 타입

### 3.1 API 그룹 (§72.1~§72.6)

| 그룹 | 책임 |
|---|---|
| **§72.1 Hierarchy Registry API** | Hierarchy Registry 컨테이너 등록/조회/Lifecycle 전이 |
| **§72.2 Role Hierarchy API** | 목록/상세/Active Version/History/Root/Parent/Child/Ancestor/Descendant/Sibling/Direct Edge/Transitive Edge/Role Path/Maximum Depth |
| **§72.3 Composite Role API** | 목록/상세/Active Version/History/Mandatory·Optional·Excluded Component/Nested/Effective Component Set/Compatibility 검증/Permission·Deny·Scope Projection/Risk |
| **§72.4 Role Graph API** | Graph/Active Version/Node/Edge/Path/Closure/Effective Inherited Set/Effective Composite Set/Snapshot/Evidence/Digest 검증 |
| **§72.5 Validation API** | Circular/Maximum Depth/Cross-Tenant/Compatibility/Actor Eligibility/Permission Conflict/Explicit Deny/Dependency/Exclusion/Scope Expansion/Permission Expansion/Diamond/Ambiguity |
| **§72.6 Simulation·Migration API** | Role 해석/조합 사전 시뮬레이션(부작용 없음)·Legacy Hierarchy Migration(Mapping Confidence·Manual Review) |

### 3.2 모든 Write API 공통 필수 요구 (§72 원문)

Authentication · Authorization · Expected Version(낙관적 동시성) · Idempotency-Key · Correlation ID · Causation ID · Approval Reference · Security Review Reference · Simulation Result Reference · Audit · Evidence · Rate Limit · Server-side Enforcement.

### 3.3 불변(수정 금지 표면)

**Historical Version / Snapshot / Evidence / Audit / Path Evidence 수정 API 금지** — 조회/발행만 허용. In-place Update·과거 재작성 API 미제공(Append-only).

## 4. 실 substrate 매핑 (§5.2)

| Canonical API 축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 라우팅 컨벤션(`/api`·`/v{NNN}`·routes.php) | **재사용(컨벤션)** | 상위 CLAUDE.md 라우팅 규약(신규 라우트 등록 필요) |
| Auth/Authorization 미들웨어 | **CANONICAL(계승)** | RBAC roleRank `index.php:573,592-595` |
| Hierarchy Registry/Role Hierarchy/Composite/Graph API | **ABSENT → 신설** | 없음(§69~§72 도메인 전체 순신규) |
| 현행 최근접 관리 API(비-Role Graph) | **CONSOLIDATION_REQUIRED(반쯤 死)** | AdminMenu `required_role` 게이트(`AdminMenu.php:247,401`)·rank 불일치(`:338,343-346`) — 메뉴 도메인 |
| Cross-Registry Adapter(읽기만) | **VALIDATED_IAM(부분 배선)** | SSO group→role(`EnterpriseAuth.php:78-88`); OIDC/SAML 로그인 경로는 groups 미전달(SCIM만 실효 — 실 결함, 수정 아님) |
| Permission Projection API | **BLOCKED_PREREQUISITE** | Part 2 이후 |
| Simulation/Migration API | **ABSENT → 신설** | 없음 |

## 5. 설계 원칙

1. **라우팅 정합 필수** — 신규 실 배선은 `/api` 접두(SPA HTML 폴백 착시 회피) 또는 최신 `/v{NNN}` 프리픽스로 등록하고 `routes.php`에 명시 매핑([[reference_api_prefix_routing]]).
2. **폐기 admin_roles API 재부활 금지** — Role Hierarchy API는 신설 Registry/Graph로만 제공. 289차 DORMANT 제거 역행 금지.
3. **불변 표면 봉인** — Snapshot/Evidence/Audit/Path Evidence 수정 API를 애초에 제공하지 않는다(수정 불가가 계약).
4. **Simulation·Migration API는 부작용 없음이 계약 조건** — §72.6은 실 Graph/Composite 상태를 변경하지 않음(읽기전용 시뮬레이션).
5. **Server-side Enforcement** — FE 미러(있다면)는 UX 힌트일 뿐 판정은 서버(무후퇴·기존 서버가드 삭제 금지).
6. **AdminMenu required_role 게이트는 API 계약 참조에서 제외** — 메뉴 도메인 게이트이며 Role Hierarchy API로 흡수 금지(§6.1).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Projection API는 Part 2 Permission Engine 이후. Role Hierarchy API의 Node/Version 결합은 Part 3-1 Role Definition Version 이후.
- **Gap(순신규)**: Hierarchy Registry/Role Hierarchy/Composite Role/Role Graph/Validation/Simulation/Migration API 전 그룹 전무.
- **PARTIAL/부분배선**: SSO Cross-Registry Adapter는 SCIM 경로만 실효(OIDC/SAML groups 미전달·`EnterpriseAuth.php:240,294,374-375` — D-8 부수 발견, 본 차수 수정 대상 아님).
- **판정**: NOT_CERTIFIED · 실 API = Registry/Graph 신설 + Part 2/3-1 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_HIERARCHY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]
