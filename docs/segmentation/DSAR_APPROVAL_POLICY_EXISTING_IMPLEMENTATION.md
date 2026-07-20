# DSAR — PDP/PEP Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> 본 문서는 Part 3-12 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/public/index.php`·`backend/src/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: PDP/PEP/PIP/PAP·effective·deny·mfa_policy·scopeSql·하드코딩 authz(admin 문자열/auth_role) 다중 grep + 인가 코어(TeamPermissions/index.php/UserAuth) 정독. 2 Explore 스레드(38 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**통합 결정론적 PDP(모든 접근요청을 Effective Role/Scope/Deny/Dynamic/Risk/Policy/SoD/JIT/Compliance 로 중앙 평가)는 부재(ABSENT)다.** 인가는 (a) `index.php` 중앙 coarse PEP + (b) 핸들러 분산 PEP + (c) **하드코딩 authz 61+12개소** 로 이원·산재한다.

- **★유일 proto-PDP = `TeamPermissions::effectiveForUser`**(`:393-421`) — RBAC(acl_permission)+ABAC(data_scope) 통합 결정에 최근접이나 **private·전역 요청 경로 미배선**(팀권한 UI/일부 ABAC SQL 필터에만 국소 적용).
- **PIP는 실존**(acl_permission/data_scope + 세션 속성). **Policy Registry/Version/Package/Bundle/PAP 게시·Decision Cache·Explain은 부재.** Snapshot/Evidence는 SecurityAudit 해시체인 근접(rule/scope trace 미기록).
- **재활용 substrate**: 실 엔진은 effectiveForUser를 중앙 PDP로 승격하고, 분산 PEP를 PDP 소비로 수렴하며, 하드코딩 61+12개소를 Static Lint로 제거한다(Extend).

## 2. 실존 substrate 카탈로그

### A. 중앙 PEP (coarse-grained — 매 요청 통과·PRESENT)

| 파일:라인 | 심볼 | 설명 | PDP/PEP 매핑 |
|---|---|---|---|
| `backend/public/index.php:69` · `:572-598` | api_key RBAC 미들웨어 | roleRank{viewer0..admin3}(`:573`)·write 차단(`:587-597`)·admin:keys scope(`:583-586`) | 중앙 PEP(coarse) |
| `backend/public/index.php:608-619` | auth_role/auth_tenant 주입·X-Tenant-Id 강제(`:619`) | 인가 컨텍스트 주입 | PIP→PEP 배선 |
| `backend/public/index.php:78-89` · `:80-81` | `guardTeamWrite` 호출(전역 mutating 가드·/auth 예외) | member read-only 중앙 403 | 중앙 PEP(쓰기) |
| `backend/public/index.php:311-475` · `:460` | AI/세션 2차 게이트(viewer 최소권한 주입) | 공용 AI/결제 경로 PEP | 2차 PEP |

### B. 분산 PEP (핸들러 집행·PRESENT)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:1134` · `:1117` · `:1125` · `:1204` | `requireTeamWrite`·`TEAM_OWNER_ONLY`·`teamCanWrite`·requireTenantSecurityWrite | owner-only 액션(billing/api_keys/security_policy 등) 강제(~11 호출) | 분산 PEP(action) |
| `backend/src/Handlers/UserAuth.php:1167` · `:1173` · `:1128` | `guardTeamWrite`(fail-open·데모 우회·member→false) | 전역 미러 | PEP |
| `backend/src/Handlers/Wms.php:557` · `:565` · `:569` · `:572` · `:579` · `:583` | `guardWarehouse`(fail-closed·owner bypass·화이트리스트) | 창고 ABAC PEP(호출 `:598`·`:603`) | 분산 ABAC PEP |
| `backend/src/Handlers/UserAuth.php:364` · `:347` · `:77` · `:49` · `:380` | requirePlan·requirePro·requireFeaturePlan·resolveTenantPlan·PlanPolicy RANK | plan 5단계 게이트(★entitlement·authz와 직교) | 상용 게이트(분산) |

### C. proto-PDP — effectiveForUser (통합결정 최근접·PARTIAL·미배선)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:393-421` | `effectiveForUser` | owner/admin→full·manager→팀권한·member→명시권한∩팀상한(clamp `:407-416`) | **proto-PDP** |
| `backend/src/Handlers/TeamPermissions.php:236-265` · `:272-280` | `effectiveScope`·`scopeValuesFor` | data_scope ABAC 해석(user→team 상속·fail-closed) | PDP scope 해석 |
| `backend/src/Handlers/TeamPermissions.php:381-387` · `:356-373` · `:423-429` | `assignableMap`·`scopeWithinCap`·`clampActions` | 위임상한 clamp | PDP constraint |
| `backend/src/Handlers/TeamPermissions.php:120-136` · `:132` | `roleOf`·`isAdmin` | subject 역할 해석 | PIP/PDP |

### D. PIP — 속성 공급원 (PRESENT)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:39` · `:152-159` · `:202-213` | `ACTIONS`(8동작)·`acl_permission` 스키마·`subjectPerms` | RBAC 속성(menu→actions) | PIP(RBAC) |
| `backend/src/Handlers/TeamPermissions.php:41` · `:160-166` · `:215-225` | `DATA_SCOPES`·`data_scope` 스키마·`subjectScope` | ABAC 속성(scope_type+values) | PIP(ABAC) |
| `backend/src/Handlers/UserAuth.php:256-268` · `:316` | `authedUser`(team_role/plan/parent_user_id/tenant_id/admin_level) | 세션→subject 속성 | PIP(세션) |
| `backend/src/Handlers/UserAuth.php:4165` · `:4172` · `:4190-4191` | auth_audit_log `risk` 컬럼(정적 문자열·감사용) | risk 속성(PARTIAL·PDP 미소비) | PIP(risk 부분) |
| `backend/src/Handlers/UserAuth.php:3446-3454` · `:4243-4250` · `:4232-4240` | `clientIp`·`recordSessionMeta`·`ensureSessionMeta`(ip/ua) | Runtime Context 수집(PDP 주입 미배선) | Context(부분) |

### E. PEP 강제 헬퍼 + Explicit Deny (SQL 주입형 ABAC·PRESENT)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:286-293` · `:299-307` · `:315-322` | `scopeSql`·`scopeSqlNamed`·`scopeChannelProduct` | ABAC where-fragment 강제(소비=UserAdmin/Catalog/OrderHub/Wms/AdPerformance) | PEP 강제 |
| `backend/src/Handlers/TeamPermissions.php:234` · `:290` · `:303` | `DENY_SCOPE`(`__deny__` 센티넬·`AND 1=0`) | fail-closed deny(전 코드베이스 유일) | Explicit Deny(국소) |

### F. Decision Types (실 집행·PRESENT / 인접)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:3745` · `:3761` · `:3779` · `:3752` | `mfaPolicy`·`mfaRequiredFor`·mfaPolicyConfig(off/admin/all) | Require MFA 정책 | Decision Type(Require MFA) |
| `backend/src/Handlers/UserAuth.php:929-964` · `:945` · `:954-964` | 로그인 MFA 강제·OTP 챌린지 | Challenge 발효 | Decision Type(Challenge) |
| `backend/src/Handlers/UserAuth.php:1128` · `index.php:78-89` | member→읽기전용 | Read-only decision | Decision Type(Read-only) |

### G. Snapshot/Evidence substrate (PARTIAL — rule/scope trace 미기록)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/SecurityAudit.php:12-53` · `:56-68` | 해시체인 append-only·verify | tamper-evident digest | Evidence/Digest(확장 대상) |
| `backend/src/Handlers/UserAuth.php:4174-4197` · `:4203` | `auth_audit_log`·`logAudit` | 감사 SSOT(문자열 detail·rule/scope trace 없음) | Evidence(부분) |
| `backend/src/Handlers/TeamPermissions.php:714-731` · `:656-674` | `teamAudit`·`$violations`(DELEGATION_EXCEEDED) | 팀 감사·위반 나열(Explain 재료) | Evidence/Explain(부분) |

### H. PAP substrate (PARTIAL — 버전/게시 없음)

| 파일:라인 | 심볼 | 설명 | 매핑 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:598-621` · `:642-692` · `:337-346` · `:755-784` | `putTeamPermissions`·`putMemberPermissions`·`replaceScope`·`seedOrg` | 권한/scope CRUD(파괴적 전체교체·버전 없음) | de-facto PAP |
| `backend/src/Handlers/AccessReview.php:1-30` | Part 3-8 슬라이스(api_key 검토·SecurityAudit 증거) | 결정 거버넌스 인접 | PAP 인접 |

## 3. 종합 판정

**PDP/PEP = ABSENT-PDP(통합) / 이원분산-PEP / PRESENT-PIP / PARTIAL-PAP·Evidence.** 통합 Policy Registry/Version/Package/Bundle·중앙 PDP·Decision Pipeline(고정순서)·Decision Cache·Explain·Combining Algorithm(deny-overrides)·authz Decision Analytics/Drift/Simulation/Reconciliation 전부 순신규. 재활용: 중앙 PEP(§A)·분산 PEP(§B)·**effectiveForUser proto-PDP(§C)**·PIP(§D)·scopeSql 강제+`__deny__`(§E)·Decision Types(§F)·SecurityAudit Evidence(§G)·TeamPermissions PAP(§H). 실 엔진은 effectiveForUser를 **중앙 PDP로 승격**하고 분산 PEP·하드코딩 61+12개소를 그 PDP 소비로 **수렴(Extend)** 하며, 마케팅 policy/decision(GT②)은 **흡수 금지**.
