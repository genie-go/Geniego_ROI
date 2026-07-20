# DSAR — PDP/PEP Governance: 정책 요청 모델 (APPROVAL_POLICY_REQUEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_REQUEST`는 PDP 평가의 입력 계약(SPEC §2·§3 Policy Request Model)이다. 최소 4축을 포함한다.

- **Subject(§3)**: User · Service · Machine Identity · API Client · Session · Device.
- **Resource(§3)**: Application · Module · Screen · API · Dataset · Database · Table · Document · File.
- **Action(§3)**: Read · Create · Update · Delete · Approve · Execute · Export · Import · Configure.
- **Environment(§3)**: Time · Region · Device · Network · Risk · Authentication · Business Calendar.
- Decision Pipeline 1단계 Request Validation의 대상(SPEC §8).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §3 축 | 판정 | 근거(GT file:line) |
|---|---|---|
| Subject — Session/User 속성 | **PRESENT** | `authedUser`(team_role/plan/parent_user_id/tenant_id/admin_level) `UserAuth.php:256-268`·`:316`; `roleOf`·`isAdmin` `TeamPermissions.php:120-136`·`:132` (GT①§C·§D) |
| Subject — 요청 컨텍스트 주입 | **PRESENT** | auth_role/auth_tenant 주입·X-Tenant-Id 강제 `index.php:608-619`·`:619` (GT①§A) |
| Action — 동작 어휘 | **PARTIAL** | `ACTIONS`(8동작·menu→actions) `TeamPermissions.php:39`·`:152-159`; write method 차단 `index.php:587-597` (GT①§A·§D) |
| Resource — menu/scope 리소스 | **PARTIAL** | acl_permission menu 스키마 `TeamPermissions.php:152-159`; `scopeSql`·`scopeChannelProduct` where-fragment `:286-293`·`:315-322` (GT①§D·§E) |
| Environment — Network/Auth 신호 | **PARTIAL** | `clientIp` `UserAuth.php:3446-3454`; MFA 정책 `:3745` (GT①§D·§F) |
| Subject — Machine Identity/API Client (통합 Subject 모델) | **ABSENT** | 통합 Request Subject 모델 부재(현행 auth_role/auth_tenant 주입은 부분) `index.php:608-619` (GT②§2·ADR §1) |
| 통합 Request Model(4축 정규화 객체) | **ABSENT** | Request Validation 12단계 파이프라인 부재 (GT②§2 Pipeline 행) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **4축 정규화**: Subject/Resource/Action/Environment(SPEC §3)를 단일 Request 객체로 정규화. 현행 산재 신호를 매핑 — Subject=`authedUser`(`:256-268`)+`roleOf`(`:120-136`), Action=`ACTIONS`(`:39`), Resource=acl_permission menu+`scopeSql`(`:286-322`), Environment=`clientIp`(`:3446-3454`)+MFA(`:3745`).
- **Action 어휘 확장**: 현행 8동작 `ACTIONS`(`:152-159`)를 SPEC §3 9동작(Approve/Execute/Export/Import/Configure 포함)으로 확장.
- **Subject 통합**: auth_role/auth_tenant 주입(`index.php:608-619`)은 부분 Subject — Machine Identity/API Client/Device를 통합 Subject 모델로 신설(ADR §1).
- **Request Validation**: Decision Pipeline 1단계(SPEC §8) 신설 — 현행 각 PEP 개별 순서 판정을 고정순서로 수렴(ADR D-1).
- **테넌트 격리**: 모든 Request는 X-Tenant-Id(`index.php:619`) 필수(ADR D-7).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- `PlanPolicy` RANK·requirePlan(`UserAuth.php:364`) = 상용 구매등급 게이트(entitlement·authz와 직교) — Request Subject의 plan 속성과 혼동 금지 (GT②§C-4).
- `Catalog.php:1104`(evaluatePolicy)·`RuleEngine.php:24` = 마케팅/커머스 요청 평가 — authz Request 아님 (GT②§C-1).
- 하드코딩 authz 61+12개소(admin 문자열/auth_role 직접비교)는 Request→PDP 미경유 증거(Missing PDP)이나 **라이브 결함 아님·아키텍처 부채·설계만** (GT②§4·ADR D-8).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(Extend)**: Subject=`authedUser`(`:256-268`)·`roleOf`(`:120-136`)·index.php 주입(`:608-619`); Action=`ACTIONS`(`:39`); Resource=`scopeSql`(`:286-322`) 재사용(GT①§A·C·D·E·ADR 2.1).
- **순신규(ABSENT)**: 4축 정규화 통합 Request Model·Machine Identity/API Client Subject·Request Validation 파이프라인(GT②§2·ADR §1).
- **정직 분리(ADR D-8)**: 중앙 PEP는 coarse(method+scope)이지 리소스/액션 Request 모델 아님(실재 과장 회피).
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-11 인증 후 실 구현. 마케팅 evaluatePolicy·PlanPolicy 흡수 금지.
- **판정**: NOT_CERTIFIED · 코드 변경 0 · 설계 명세.
