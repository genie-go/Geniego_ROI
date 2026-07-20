# DSAR — PDP/PEP Governance: 정책 집행 지점 (APPROVAL_PEP)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_PEP는 PDP 결정을 실제 자원 접근 지점에서 강제하는 집행 계층이다(SPEC §5). PEP는 API Gateway · Backend Service · Microservice · Workflow Engine · Scheduler · Batch Engine · GraphQL · REST API · gRPC · Message Queue · UI Layer 등 여러 위치에 존재할 수 있으나, **PEP는 PDP를 우회할 수 없다**(SPEC §5·§0 흐름). 즉 모든 PEP는 스스로 판정하지 않고 PDP 결정(Decision Cache 경유)을 소비해야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

현행 PEP는 **이원 분산**이며 PDP를 경유하지 않고 각자 판정 → "PEP는 PDP 우회불가" 위반 상태(GT② §2).

| PEP 위치 | 판정 | 근거(파일:라인) |
|---|---|---|
| **중앙 PEP(coarse)** | PRESENT | api_key RBAC 미들웨어 roleRank{viewer0..admin3}(`index.php:69`·`:573`)·write 차단(`:587-597`)·admin:keys scope(`:583-586`)·auth_role/tenant 주입(`:608-619`) |
| 중앙 쓰기 가드 | PRESENT | `guardTeamWrite` 전역 mutating 가드·/auth 예외(`index.php:78-89`·`:80-81`) |
| 2차 게이트 | PRESENT | AI/세션 공용 경로 viewer 최소권한(`index.php:311-475`·`:460`) |
| **분산 PEP(action)** | PRESENT | `requireTeamWrite`·`TEAM_OWNER_ONLY`·`teamCanWrite`(`UserAuth.php:1134`·`:1117`·`:1125`·~11 호출)·`guardTeamWrite` 미러(`:1167`·`:1128`) |
| 분산 ABAC PEP | PRESENT | `guardWarehouse` fail-closed·owner bypass·화이트리스트(`Wms.php:557`·`:565`·호출 `:598`·`:603`) |
| PEP 강제 헬퍼 | PRESENT | `scopeSql`/`scopeSqlNamed`/`scopeChannelProduct`(`TeamPermissions.php:286-293`·`:299-307`·`:315-322`)—ABAC where-fragment 강제 |
| 상용 게이트(직교) | PRESENT | `requirePlan`/`requirePro`(`UserAuth.php:364`·`:347`)—entitlement·authz와 직교 |
| **하드코딩 authz(Missing PDP)** | 부채(ABSENT PDP 증거) | admin 문자열 61개소/14핸들러·auth_role 12개소/9핸들러(`UserAuth.php:81`·`:1138`·`TeamPermissions.php:132`·GT② §4)—★라이브 결함 아님·Static Lint 수렴 대상 |
| PDP 경유 단일 강제 | **ABSENT** | 각 PEP 개별 판정·PDP 미배선(GT② §2·SPEC §5 위반) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **핵심 불변식**: PEP는 자체 판정 금지·PDP 결정만 강제(SPEC §5 "PEP는 PDP를 우회할 수 없다"). 중앙(`index.php:69-619`)+분산(`requireTeamWrite`·`guardWarehouse`)은 유지하되 PDP 경유로 **재배선**(ADR §D-2·무후퇴).
- **Decision Type 집행**: PEP는 PDP 산출 Decision Type(SPEC §9)을 강제 — 현행 실집행 재사용: Require MFA/Challenge(`UserAuth.php:929-964`)·Read-only(member→읽기전용 `UserAuth.php:1128`·`index.php:78-89`).
- **Static Lint**: Direct Permission Check/Hardcoded Authorization(SPEC §26) 탐지—하드코딩 61+12개소를 PDP 호출로 수렴(ADR §D-2). ★부채≠결함·재플래그 금지(ADR §D-8).
- **Runtime Guard**: PDP Bypass/PEP Disable 차단(SPEC §25)은 중앙 PEP(`index.php:78-89`)+`X-Tenant-Id` 격리(`:619`) 재활용 위 신설(ADR §D-7).
- **테넌트 격리**: 모든 집행은 tenant 경계 내(SPEC §30)·크로스테넌트 우회 금지.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

PEP 집행은 마케팅/알림 액션 집행과 무관하다(GT② §5). `action_request.policy_id`(`Db.php:576`·`routes.php:439-445`·`:457-463`) maker-checker(`Mapping.php:269`)는 알림/액션 거버넌스이지 authz PEP 아님. `Catalog.php:1159`(requiresHighValueApproval)·`Decisioning.php:36`도 커머스/마케팅 집행—authz PEP 흡수·개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PEP = **PARTIAL(이원분산)**—중앙 coarse(`index.php:69-619`)+분산 handler(`UserAuth.php:1134`·`Wms.php:557`)+하드코딩 61+12개소. PDP 경유 단일 강제 = ABSENT(SPEC §5 위반 상태).
- **재활용(Extend)**: 중앙/분산 PEP·`scopeSql` 강제·Decision Types(MFA/Challenge/Read-only)를 PDP 소비로 수렴, 하드코딩 61+12개소 Static Lint 정리(ADR §D-2·무후퇴).
- **선행의존**: 중앙 PDP(APPROVAL_PDP) 승격 후 재배선 가능(BLOCKED_PREREQUISITE)·Part 1~3-11 인증 조건. 코드 변경 0 · NOT_CERTIFIED.
