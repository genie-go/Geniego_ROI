# DSAR — PDP/PEP Governance: 정책 정보 지점 (APPROVAL_PIP)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_PIP는 PDP가 결정을 내리는 데 필요한 속성을 공급하는 정보 계층이다(SPEC §6). 공급 속성: User Attribute · Organization · Role · Assignment · Session · Device · Risk · Scope · Runtime Context · Threat Intelligence. PIP는 Decision Pipeline의 Context Collection·Attribute Resolution 단계(SPEC §8 2~3단계)에 속성을 제공하며, Runtime Context(SPEC §13: Device/Browser/MFA/Geo/VPN/Risk/Session)를 PDP 입력으로 정규화한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

PIP는 substrate 중 가장 성숙—RBAC/ABAC 속성과 세션 속성은 실존(PRESENT), device/geo·계산 risk는 PDP 미배선(PARTIAL)(GT② §2).

| PIP 속성 | 판정 | 근거(파일:라인) |
|---|---|---|
| **User Attribute / Role** | PRESENT | `authedUser`(team_role/plan/parent_user_id/tenant_id/admin_level `UserAuth.php:256-268`·`:316`)·`roleOf`/`isAdmin`(`TeamPermissions.php:120-136`·`:132`) |
| RBAC 속성(acl_permission) | PRESENT | `ACTIONS`(8동작)·`acl_permission` 스키마·`subjectPerms`(`TeamPermissions.php:39`·`:152-159`·`:202-213`) |
| ABAC 속성(data_scope) | PRESENT | `DATA_SCOPES`·`data_scope` 스키마·`subjectScope`(`TeamPermissions.php:41`·`:160-166`·`:215-225`) |
| Scope | PRESENT | `effectiveScope`·`scopeValuesFor`(`TeamPermissions.php:236-265`·`:272-280`)—user→team 상속·fail-closed |
| Assignment | PARTIAL | 위임상한 `assignableMap`·`scopeWithinCap`(`TeamPermissions.php:381-387`·`:356-373`) |
| Session | PRESENT | 세션 속성(`UserAuth.php:256-268`)·`recordSessionMeta`/`ensureSessionMeta`(ip/ua `:4243-4250`·`:4232-4240`) |
| Device / Runtime Context | **PARTIAL(PDP 미소비)** | `clientIp`(`UserAuth.php:3446-3454`)·ip/ua 수집만—device/geo PDP 주입 미배선(GT① §D·GT② §2) |
| Risk | **PARTIAL(PDP 미소비)** | auth_audit_log `risk` 정적 문자열 컬럼(`UserAuth.php:4165`·`:4172`·`:4190-4191`)—감사용·계산 risk PDP 미소비 |
| Threat Intelligence | **ABSENT** | 위협 인텔리전스 속성원 부재(SPEC §6 항목·grep 0) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **속성 공급 계약**: PIP는 Subject/Resource/Environment 속성(SPEC §3)을 PDP에 정규화 공급—현행 `acl_permission`/`data_scope`(`TeamPermissions.php:39-41`·`:152-166`)+세션(`UserAuth.php:256-268`)을 **그대로 PDP 속성원으로 사용**(ADR §D-1·2.1).
- **Runtime Context 승격**: 현행 수집만 되고 PDP 미소비인 ip/ua/risk(`UserAuth.php:3446-3454`·`:4165`)를 Runtime Context(SPEC §13)로 PDP 주입 배선—신규 device/geo/VPN/계산 risk 속성 추가.
- **불변식**: PIP는 속성 공급만·결정 금지(결정은 PDP). fail-closed 상속(`effectiveScope` `:236-265`) 유지.
- **테넌트 격리**: 모든 속성 조회는 tenant 경계 내(SPEC §30)·`X-Tenant-Id`(`index.php:619`) 기준. 크로스테넌트 속성 유출 금지.
- **Cache Invalidation 트리거**: Assignment 변경·Session 종료·Context/Risk 변경 시 PIP 갱신→Decision Cache 무효화(SPEC §15).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

PIP의 risk 속성은 authz용이며, 마케팅/공급망 risk와 분리한다(GT② §5). `Risk.php`(공급망 fraud risk·마케팅)·`attribution_model_cache`(마케팅 캐시)는 authz PIP 속성원 아님·흡수 금지. `PlanPolicy` RANK(`UserAuth.php:364`)는 entitlement 속성(구매등급·authz와 직교)—PIP authz 속성으로 혼입 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PIP = **PRESENT**(User/Role/RBAC/ABAC/Scope/Session 속성 실존) / **PARTIAL**(Device/Runtime Context/Risk 수집되나 PDP 미소비) / **ABSENT**(Threat Intelligence)(GT② §2).
- **재활용(Extend)**: `acl_permission`/`data_scope`+세션 속성을 PDP 속성원 그대로 사용(ADR §D-1)—중복 속성원 신설 금지, 미소비 Runtime Context를 PDP 주입으로 배선.
- **선행의존**: PDP(APPROVAL_PDP)가 속성을 소비해야 device/geo/risk 배선 의미 발생(BLOCKED_PREREQUISITE)·Part 1~3-11 인증 조건. 코드 변경 0 · NOT_CERTIFIED.
