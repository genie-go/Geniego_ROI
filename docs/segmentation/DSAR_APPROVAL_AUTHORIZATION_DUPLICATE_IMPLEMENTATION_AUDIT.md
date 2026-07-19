# DSAR — Authorization: 중복 구현 감사 (§59)

> EPIC 06-A-03-02-03-04 Part 1 · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]. 규율: 중복 Authorization Engine/Middleware/Resolver 신설 금지 — 실존 확장.

## 1. §59 중복 대상별 판정

| §59 항목 | 현황 | 판정·조치 |
|---|---|---|
| 여러 Authorization Middleware | 중앙 1개(`index.php:553-603`)+핸들러별 분기(requireAdmin/requireTeamWrite/requireFeaturePlan) | 미들웨어는 단일이나 **판정 로직이 핸들러에 분산**. Canonical Definition/Policy Set으로 흡수(중복 미들웨어 신설 금지) |
| 여러 Policy Resolver | **0(선언적 resolver 부재)** | Policy Resolution(§43) 신규 1개 정본 |
| 여러 Role Check Utility | ★**isAdmin 4개**(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·FE)·**requireAdmin 3개**(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`) | **CONSOLIDATION_REQUIRED** — Canonical Subject Contract+Registry로 단일화. 각 유틸은 Adapter로 위임(Replace 아님·Extend) |
| 여러 Permission Check Utility | TeamPermissions(acl)·Keys(scope)·requireFeaturePlan(plan) 관심사 상이 | 관심사별 KEEP·상위 Definition에서 Policy Set으로 조합 |
| 여러 `isAdmin` 정의 | 4개(위) | 단일 Canonical isAdmin(plan+admin_level)로 SSOT화·드리프트 제거 |
| 여러 Tenant Filter | tenant 강제주입(`index.php:600`)+핸들러 `WHERE tenant_id=?` 편재 | 강제주입은 단일 정본(양호)·핸들러 술어는 Registry Scope Tenant Binding으로 표준화 |
| 여러 Resource Owner Check | data_scope(`TeamPermissions.php:236-322`)+핸들러별 소유검증 | Resource Contract(owner/creator·§16)로 표준화 |
| 여러 Approval Authority Check | Maker-Checker 2개(Mapping/Alerting) | Authority(Part5)/Dual-Control(Part8)로 일반화·이번 Part는 Action Contract+Decision Binding 기반만 |
| 여러 API Scope Check | api_key scopes(`Keys.php`·`index.php:564-578`) | Registry scope 모델로 표준화 |
| Frontend ↔ Backend 서로 다른 Rule | ★FE writeGuard/planMenuPolicy vs 서버 requireTeamWrite(11개소) **불일치** | §5.4 위반 — 서버측이 정본·FE는 UI hint(§21 UI_HINT)로 강등. Reconciliation(§51 UI Hint vs Server) |
| API Gateway ↔ Application | nginx vhost regex + index.php 미들웨어 | Reconciliation 대상(§51)·현재 큰 불일치 근거 없음 |
| ERP/Workflow ↔ Platform | ERP/Workflow authz 도메인 부재 | 해당없음 |
| 동일 Action 다른 이름 | approve/decide 등 도메인별 명명 상이 | Action Contract Canonical Code(§17)로 통일 |
| Allow·Deny 우선순위 불일치 | 선언적 Combining 부재(절차코드만) | Policy Set Combining Algorithm(§11·DENY_OVERRIDES 기본)로 명문화 |
| Policy Version 관리 불일치 | 버전화 전무 | Definition/Policy Version(§13) 신규 |
| Exception/Override/Audit/Result/Cache 모델 중복 | **0(부재)** | 각 신규 단일 정본 |
| Cross-Tenant Cache | 인가 결과 캐시 자체 부재 | Cache Foundation(§49) 신규·tenant-isolated |
| Mutable Snapshot / Decision 수정 API | 승인=approvals_json 가변 append(`Mapping.php:288`·`Alerting.php:653`) | Authorization Decision은 Immutable Snapshot(§34)로 신규·수정 API 금지 |
| Hardcoded Admin Bypass | plan==='admin' 다수(GROUND_TRUTH §2)·user-id/email 하드코딩은 **부재** | admin bypass를 Registry SYSTEM_ACTOR/ADMINISTRATIVE Policy로 명시·정직화 |
| Feature Flag Bypass / Service·System Actor 무제한 | requireFeaturePlan fail-open(과금)·system actor 정책 부재 | §54 Lint·§45 Fail-closed로 차단 방향 |
| team_role 정규화 중복 | 3중 미러(`TeamPermissions.php:120`·`UserAuth.php:1099`·FE) | 단일 Subject Contract role reference로 SSOT화 |
| admin_roles/user_roles DORMANT | 저장·미소비(죽은 RBAC) | DEPRECATION_CANDIDATE 또는 RBAC(Part3)에서 실배선·현재 계상 금지 |

## 2. 통합 결론

- **중복의 핵심 = 판정 유틸 난립(isAdmin 4·requireAdmin 3·team_role 3중)과 FE↔서버 규칙 불일치**. 엔진 중복이 아니라 **SSOT 부재로 인한 정책 드리프트**가 실제 위험.
- **통합 방향**: Canonical Authorization Registry/Policy/Definition **단일 정본**이 흩어진 roleRank/scope/plan/team_role/acl 규칙을 **데이터로 흡수**. 기존 유틸(isAdmin/requireAdmin/TeamPermissions)은 **Adapter로 위임**(Replace 금지·Extend). FE 통제는 UI_HINT로 강등하고 서버측이 정본(§5.4).
- **무후퇴 예외(=개선)**: writeGuard 서버 전역 배선·requireFeaturePlan fail-closed 전환·중복 유틸 SSOT화는 기능 후퇴 아닌 보안 강화. 단 실 배선/수정은 후속 enforcement Part(9)·별도 승인.
- **DORMANT 제거**: admin_roles/user_roles를 "RBAC 구현 존재"로 오계상 금지(런타임 미소비=죽은 코드).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
