# ADR — Authorization Registry Foundation Governance (EPIC 06-A-03-02-03-04 Part 1)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 실 엔진은 선행 Decision Core 신설 + 후속 enforcement Part 후 별도 승인세션)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: [`SPEC_06A_03_02_03_04_P1_AUTHORIZATION_REGISTRY_VERBATIM`](../segmentation/SPEC_06A_03_02_03_04_P1_AUTHORIZATION_REGISTRY_VERBATIM.md)
- **전수조사(ⓑ·GROUND_TRUTH)**: [`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT`](../segmentation/DSAR_APPROVAL_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
- **선행 블록**: [`ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING`](ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING.md)(03-03) · [`ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION`](ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION.md)(03-02)
- **관련 메모리**: [[project_n231_team_permission_rbac]] · [[project_n183_phase3_team_rbac]] · [[project_n204_security_p0p1]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04(Authorization·SoD·COI·Dual-Control)의 **Part 1 — Authorization Registry Foundation**. 이후 모든 Authorization 기능(Permission[P2]·RBAC[P3]·ABAC[P4]·Authority[P5]·SoD[P6]·COI[P7]·Dual-Control[P8]·Revalidation/Drift[P9]·Simulation/Audit/Migration[P10])이 공통 사용할 Canonical Authorization Foundation을 세운다. 이번 Part는 확장 포인트·Canonical Interface만.

★**이 블록은 실 authorization 코드가 대량 실재**한다. 능력 기반 전수조사(ⓑ·2 에이전트·코드 정독):

- **★중앙 RBAC 게이트 실재 = `index.php:553-603`** — roleRank(`:554` viewer<connector<analyst<admin)·admin:keys scope(`:564-567`)·write 메서드 게이트(`:568-578`)·tenant 강제주입(`:600` X-Tenant-Id 무조건 덮어쓰기)·auth context attach(`:590-593`). 인증 실패=fail-closed.
- **★가장 Registry에 근접 = `TeamPermissions.php`** — RBAC 서열(`:120-136`)·acl_permission 매트릭스(subject×menu×8action·`:39,152-159,325-336`)·ABAC data_scope 행필터(`:236-322`·DENY_SCOPE `:234`)·위임상한(`:615-647`). fail-closed.
- **★Maker-Checker 실재** — Mapping approve(`:238-292`)·Alerting decideAction(`:598-658`).
- **★진짜 부재(순신규)** — Authorization Registry/Policy/Definition 선언 구조체·Policy 버전화·Policy Set·Combining Algorithm·선언적 Default/Explicit Deny·Authorization Decision/Snapshot/Evidence/Digest/Ledger 결합·SoD/COI/Dual-Control.

## 2. 결정 (Decision)

### D-1. Canonical Authorization Contract를 **신설**하되 실존 primitive를 확장(Golden Rule) — "발명이 아니라 조립"

| 실존 | §58 태그 | 확장 결정 |
|---|---|---|
| **`TeamPermissions` RBAC/ABAC** | **RBAC/ABAC_ENGINE_CANDIDATE(확장·Registry 흡수 substrate)** | acl_permission 매트릭스+data_scope 행필터(`:236-322`)가 Policy/Scope/Constraint의 가장 근접 substrate. Registry/Policy Set으로 정형화(중복 엔진 신설 금지). |
| **`index.php` 중앙 RBAC** | **CANONICAL(확장)** | roleRank/scope/write/tenant 강제(`:553-603`)를 Policy 데이터로 흡수. tenant 강제주입(`:600`)=Cross-tenant 격리 정본. |
| Maker-Checker(Mapping/Alerting) | **APPROVAL_AUTHORITY/DUAL_CONTROL_CANDIDATE** | 정족수/자기승인차단(`Mapping.php:267`·`Alerting.php:642`)=n-of-m/four-eyes(P8) substrate. |
| api_key scopes(`Keys.php:99-113`) | **VALIDATED** | scope 모델 확장점. |
| SSO group→role(`EnterpriseAuth.php:78`) | **VALIDATED_IAM** | 외부 IdP 롤 거버넌스. |

### D-2. **위험/BLOCKED — 후속 enforcement Part 대상 (Part 1은 통합방향 설계만)**

1. **FE `writeGuard.js` UI-only·fail-open**(`:13,61-90`) — 서버측 requireTeamWrite는 **11개소뿐**(`UserAuth.php:1088-1127`) → 116페이지 mutating 대다수가 member read-only를 **UI로만 방어**(§5.4 위반). 서버측 전역 배선=Part 9 enforcement.
2. **`requireFeaturePlan` 3중 fail-open**(`UserAuth.php:68,72,82-84`) — plan null/catch/admin bypass. 과금게이트이나 정책엔진 도입 시 fail-closed 전환(§5.13).
3. **`admin_roles`/`user_roles` DORMANT**(`UserAdmin.php:627-641,788-812`) — 저장·할당되나 런타임 미소비(죽은 RBAC). "RBAC 존재"로 오계상 금지.
4. **중복 유틸 SSOT 부재** — isAdmin 4·requireAdmin 3·team_role 3중 미러 → 정책 드리프트. Canonical Subject Contract로 단일화.

### D-3. **중대 긍정 = 정직한 "부재"** (오탐 방지)

§53 "Hardcoded User ID Allow"·"Email Authorization"은 **해당 없음** — admin 판정 전부 DB plan/plans/admin_level 컬럼 기반, 소스 리터럴 authz 부재. 레거시 `legacy_v338_pkg/.../gateway/main.go`는 아카이브·미사용. "Actor ID Body 신뢰"(§53)는 방금 03-03 세션에서 `Alerting::actor()` canonical actor 수정으로 **닫힘**(재플래그 금지). 부재/기수정을 결함으로 날조하지 않는다.

### D-4. **구현 판정 = 대부분 ABSENT/PARTIAL-substrate/BLOCKED_PREREQUISITE**

- 정책 데이터 선언체(Registry/Policy/Definition/Version)·판정결과 불변저장(Decision/Snapshot/Evidence/Digest)·Combining Algorithm·선언적 Default/Explicit Deny = 순신규.
- 선행 §3.2 Decision Foundation·§3.3 Resource Version/Approval Definition 부재 → 상위 결합 일부 공회전.
- ★단 실 substrate(TeamPermissions/index.php RBAC/Maker-Checker) 실재로 실 엔진은 "흩어진 roleRank/scope/plan/team_role/acl 규칙을 Canonical Registry/Policy로 데이터화 + Decision 결합" 조립. 이번 차수=설계 명세(코드 0).

### D-5. Authentication ≠ Authorization · UI ≠ Authorization · Default Deny (§5.1·5.2·5.4·구현 시 강제)

인증성공만으로 허용 금지·Actor ID 직접신뢰 금지(Canonical Principal/Effective Actor)·UI 통제를 authorization으로 간주 금지(중요 Action Server-side 재검증)·Default Deny·Explicit Deny 우선·고위험 Fail-open 금지.

### D-6. Mandatory Control 고객설정 비활성 불가(§5.15)

Default Deny·Tenant/Subject/Resource/Action Binding·Policy Version Recording·Decision Snapshot·Evidence·Commit Binding·Explicit Deny/Fail-closed Enforcement·Cross-tenant Isolation·Server-side Authorization·Audit.

## 3. ★실 위험 (후속 enforcement Part 후보)

D-2의 4건(writeGuard UI-only·requireFeaturePlan fail-open·admin_roles DORMANT·중복 유틸). ★이 중 writeGuard UI-only(member 쓰기 서버 전역 미배선)는 실 노출면이나, 116페이지 mutating 엔드포인트 전수 서버측 배선은 대규모 enforcement 작업(Part 9)이라 자립 quick-fix 아님 — 문서화·후속 승인세션.

## 4. 대안 (Considered)

- **A. 지금 Authorization Engine 구현** — 기각. 결합할 불변 Decision Record·Resource Version 부재·RP-002 위반.
- **B. TeamPermissions를 그대로 Authorization Registry로 승격** — 부분 채택(확장 substrate·D-1). 단 Policy 버전화/Combining/Decision 불변저장/Ledger 결합 미달로 직접 승격 금지·정형화 필요.
- **C. 설계 명세만(코드 0)+실존 substrate 조립계획+위험 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관.

## 5. 귀결 (Consequences)

- (+) TeamPermissions RBAC/ABAC·index.php 중앙 RBAC·Maker-Checker·api_key scopes·SSO group→role의 확장 substrate 지위·조립 경로 확정("발명 아닌 조립").
- (+) 위험 4건(writeGuard UI-only·requireFeaturePlan fail-open·admin_roles DORMANT·중복 유틸) 문서화·후속 enforcement Part 등재.
- (+) 정직 판정(하드코딩 email authz 부재·Actor ID 신뢰 기수정)·DORMANT 오계상 방지.
- (+) Registry/Policy/Definition/Context/Decision/Binding/Cache/Kill Switch/Migration 56편 설계 정본 확보.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: **Part 2 Permission Engine Foundation**(스펙 대기) → P3 RBAC~P10 Migration. 실 엔진=선행 Decision Core 신설 + enforcement Part 후 별도 승인세션.

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Authorization Engine/Resolver 금지) · 무후퇴(writeGuard 서버배선·requireFeaturePlan fail-closed=개선 예외) · "결론의 근거도 재실증"(중앙 RBAC·TeamPermissions·Maker-Checker·위험·긍정 전부 코드 정독으로 확정) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002 · DORMANT 오계상 금지 · GROUND_TRUTH 외 인용 금지.
