# ADR — Role Assignment Governance (EPIC 06-A-03-02-03-04 Part 3-3)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Permission Engine + Role Registry/Hierarchy + Decision Core 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-20)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-3 — Role Assignment Governance (사용자 제공 verbatim · [`docs/spec/EPIC_06A_PART3_3_ROLE_ASSIGNMENT_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_3_ROLE_ASSIGNMENT_GOVERNANCE_SPEC.md))
- **선행 블록**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)(Part 3-2) · [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)(Part 3-1) · [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)(Part 2)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n289_12_delegation_foundation]] · [[project_n289_epic06a_segmentation]] · [[reference_menu_audit_log_not_tamper_evident]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-3 — Role Assignment Governance**. Part 3-1(Role Registry)·3-2(Role Hierarchy) 위에서, Role Definition/Hierarchy를 실제 Subject(사용자·서비스·시스템)에 **`user_role` 테이블·`user.roles[]` 배열이 아닌 Canonical·Immutable·Versioned·Lifecycle/Approval/Policy 기반·Scope/Time/Risk-aware·Evidence-backed·Snapshot·SoD/Delegation/Emergency-ready한 Assignment Engine**으로 정형화한다. Part 3-4 Scoped·3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution이 재사용할 Assignment Resolution Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0).

★**능력 기반 전수조사(ⓑ·GROUND_TRUTH·2 Explore 스레드+firsthand 재검증)** 핵심 결론 — **Part 3-2(전건 순신규)와 대조적으로 실 substrate 상당 실재**:

- **★Assignment 실행 substrate = 5자원에 실재(PARTIAL)**: ① `app_user.team_role` 직접할당(`UserAuth.php:1334,1392`·`createTeamMember`/`updateTeamMember`) ② SSO/SCIM `provisionUser`(`EnterpriseAuth.php:483-511`·groups→role) ③ api_key.role(★2중 병렬 `Keys.php:81-187`/`UserAuth.php:4340-4399`) ④ wms_permissions(`Wms.php:505-526`·무검증/무감사/무UNIQUE) ⑤ pm_task_assignees(`Assignees.php:17-72`·유일 구조적 감사). sub-admin 발급(`UserAuth.php:1639-1648`).
- **★거버넌스 계층 = 대부분 순신규(ABSENT)**: Assignment Registry/Definition 구조체·Version(변경이력)·Approval workflow·Lifecycle 상태머신(12상태)·Snapshot/Digest/Evidence·Drift/Revalidation/Reconciliation·Effective **버전기준** Resolution·Conflict/SoD·Temporary/Scheduled/Emergency/Break-glass/Delegated Assignment·Assignment Cache/Runtime Guard(전용)·Simulation.
- **★라이프사이클**: is_active 이진 토글이 3/5 자원의 "정지" 대용·정식 상태머신 아님. **role/permission 만료 cron 부재**(bin 34 스크립트 0). 유일 만료=api_key `expires_at` 요청시점 게이트(`index.php:518-520`·워커 아님).
- **★근접 substrate 3종(전부 assignment 미적용)**: `effectiveForUser`/`effectiveScope`(`TeamPermissions.php:366-394,236-265`·라이브 재계산·version 무관)·`auth_audit_log`(mutable·tamper-evident 아님)·writeGuard/`guardTeamWrite`(`UserAuth.php:1167`·정적 team_role 게이트지 생애주기 guard 아님). ★**유일 tamper-evident 체인=`SecurityAudit::verify`(`SecurityAudit.php:56-68`)이나 role assignment 미기록**.
- **★승인·SoD·위임 정직 판정**: 승인 workflow 부재(pending_approval 매치는 캠페인/가격 도메인). `assignableMap`/`DELEGATION_EXCEEDED`(`TeamPermissions.php:354-360,644-647`)=acl_permission 위임상한이지 team_role 부여 아님(289차 06-A-01 정합). break-glass(`UserAuth.php:790-801`)=인증우회지 role 부여 아님. SoD/isManager/isApprover 부재(Part 3-1 정합).
- **★역사적 반례**: admin_roles/user_roles + assignRole/revokeRole API가 "인가 게이트 미소비 DORMANT 장식"으로 289차 폐기(`c1646bc`·재부활 금지). user.roles[] 부재·permissions_override.json 빈스텁.

## 2. 결정 (Decision)

### D-1. Canonical Assignment Registry를 **신설**하되 5분산 실행 substrate를 통합·확장(Golden Rule — "발명 아니라 조립+통합"). 중복 Assignment Service/Resolver 신설 금지.

| 실존 | 분류 태그 | 확장 결정 |
|---|---|---|
| **team_role 3분산 write**(UserAuth/EnterpriseAuth/TeamPermissions) | **CANONICAL_ASSIGNMENT_SUBSTRATE(통합)** | Assignment Registry 단일 진입점으로 중개(검증·감사·version 일원화). write 자체는 보존·정형화. |
| **api_key.role 2경로** | **CONSOLIDATION_REQUIRED(통합)** | Keys.php/UserAuth 2경로 통합·감사·scope 상한 일원화. Subject Type=API_CLIENT. |
| **admin_level(master/sub)** | **SUB_AXIS(흡수)** | Subject/Role Namespace 축으로 흡수. |
| **wms_permissions·pm_task_assignees** | **DOMAIN_ASSIGNMENT(흡수/Adapter)** | 별개 네임스페이스로 Assignment 모델 흡수(pm은 감사 substrate 참조). |
| **effectiveForUser/effectiveScope** | **EFFECTIVE_RESOLUTION_SUBSTRATE(확장)** | Effective Assignment Resolution의 substrate로 version 기준 승격. |
| **auth_audit_log** | **PARTIAL(승격)** | SecurityAudit tamper-evident 체인으로 승격(assignment 이벤트 기록). |
| **admin_roles/user_roles** | **DEPRECATED(재부활 금지)** | 인가 미소비 장식으로 폐기. Canonical Assignment는 실 인가 소비 role에만. |

### D-2. Assignment ≠ 즉시 direct write · Assignment는 Version·Approval·Lifecycle·Snapshot을 갖는 1급 엔티티 (§0·구현 시 강제)

현행 5경로는 caller 권한검증 통과 즉시 단일 트랜잭션 UPDATE(version/approval/snapshot 없음·`replacePerms` DELETE→INSERT로 이전상태 소실·`TeamPermissions.php:324-336`). Canonical Assignment는 Requested~Archived 12상태 Lifecycle·Approval Reference를 Version에 고정·과거 Version 불변·Snapshot/Digest/Evidence·만료/정지/취소 상태머신.

### D-3. "인가 실소비 role에만 적용" (admin_roles 장식화 전례 반영·핵심 규율)

admin_roles/user_roles가 폐기된 이유=부여된 role이 **어떤 인가 게이트서도 미소비**(장식). Canonical Assignment Governance는 반드시 실 RBAC(TeamPermissions acl_permission/data_scope·index.php RBAC·api_key scopes)에 **실제 소비되는 role/permission에만** 적용. 소비되지 않는 role 카탈로그 재도입 금지.

### D-4. Subject 유형·Actor Eligibility (§3·정직 판정)

Human(app_user)·API Client(api_key) 실재. Service Account/System Actor/Robot **부재**(GCP 서비스계정=외부자격증명·내부 Subject 아님). Employee/External/Partner/Vendor=Team 차원(TEAM_TYPES)이지 Subject 차원 아님. Canonical Assignment는 Subject Type을 1급 축으로 신설(Part 3-2 Composite Actor Eligibility 연동)·부재 유형을 날조하지 않음.

### D-5. Delegation·Emergency·Temporary 정직 분리 (오탐 방지)

- **Delegation**: 실존 `assignableMap`은 acl_permission 위임상한이지 role 위임 아님(289차 06-A-01·`DELEGATION_EXCEEDED`=상한 클램프 거부지 승인 위임 아님). Delegated Assignment는 순신규(원 assignment보다 넓은 Scope 금지·§14).
- **Emergency/Break-glass**: 실존 break-glass는 인증우회(MFA 우회)지 임시 role 부여 아님. Emergency Assignment(Incident Reference·Max Duration·Auto Expiration·Mandatory Audit·§12)는 순신규. ★break-glass MFA 우회는 289차 BLOCKED_SECURITY 등재분(재플래그 아님·별개 트랙).
- **Temporary/Scheduled**: 만료/예약 role 부재(순신규). is_active 이진 토글≠Lifecycle 상태머신.

### D-6. 구현 판정 = PARTIAL-substrate/ABSENT-governance/BLOCKED_PREREQUISITE

- Assignment 실행 substrate 실재(5자원)이나 Registry/Version/Approval/Lifecycle/Snapshot/Effective 버전기준 Resolution/Drift/SoD/Temporary/Emergency/Delegated=순신규.
- 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core가 아직 설계(코드 0)라 Role Version Binding·Approval 결합·Effective Permission Projection은 **BLOCKED_PREREQUISITE**.
- 실 엔진="5 분산 즉시쓰기를 Canonical Assignment Registry로 통합 + 거버넌스 신설" 조립. 이번 차수=설계 명세(코드 0).

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-4+ 재사용)

- **Assignment Registry/Definition/Version**: 5분산 write를 단일 진입점으로 중개. Requested~Archived Lifecycle·Version Type(Initial/Renewal/Scope/RoleVersion/Approval/Restoration/Suspension/Revocation/Migration/Correction·과거 Version 불변).
- **Approval/Request**: Auto/Single/Dual/Multi-stage/Emergency/Risk-based Approval Reference를 Version에 고정. 기존 승인 인프라(catalog approveQueue)는 상품 도메인·재사용 아님(신규).
- **Effective Assignment/Permission Resolution**: effectiveForUser substrate를 version 기준 Effective Assignment Set·Permission Projection으로 승격. Direct/Group/Org/Position/Delegated/Temporary/Emergency/Dynamic 병합.
- **Lifecycle 연산**: Expiration(만료 워커·api_key expires_at 패턴 확장)·Renewal·Revocation·Suspension·Restoration(전부 Version 생성).
- **Snapshot/Evidence/Digest**: SecurityAudit tamper-evident 체인으로 승격. Assignment Snapshot 불변.
- **Adapter(Part 3-4 Scoped·3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution)**: Assignment Resolution Contract·Affected Subject/Assignment Reference·Conditional Assignment Rule Reference만 제공.
- **경계 보존**: assignableMap(권한상한)·impersonation(대행)·break-glass(인증우회)·writeGuard(정적 게이트)·menu snapshot은 Assignment 밖.

## 4. 대안 (Considered)

- **A. 지금 Assignment Engine(Registry·Version·Approval·Lifecycle·Effective) 구현** — 기각. 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실 구현 부재·RP-002 위반·중복 엔진 리스크.
- **B. 폐기된 admin_roles/user_roles를 Assignment Registry로 재부활** — 기각. 인가 미소비 장식으로 판정·제거된 계층. Canonical Assignment는 실 인가 소비 substrate(team_role/api_key/acl) 위에 신설.
- **C. 5분산 write를 그대로 두고 governance만 얹기** — 기각. 통합 진입점 없이 version/approval/감사를 얹으면 우회 경로 잔존(가짜 녹색). 단일 Registry 중개가 정답.
- **D. 설계 명세만(코드 0)+실존 substrate 통합계획+Gap 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 2/3-1/3-2 동형.

## 5. 귀결 (Consequences)

- (+) 5분산 실행 substrate(team_role 3핸들러·api_key 2경로·admin_level·wms·pm)·근접 3종(effectiveForUser·auth_audit_log·writeGuard)의 통합/확장 substrate 지위 확정("발명 아니라 조립+통합").
- (+) 거버넌스 계층 순신규 판정을 grep 0으로 실증(version/approval/lifecycle 상태머신/snapshot/effective 버전기준/SoD/temporary/emergency/delegated) → 투기성 스키마 방지.
- (+) 정직 판정(실행 실재 PARTIAL·거버넌스 ABSENT·근접 3종 assignment 미적용·assignableMap≠위임·break-glass≠role부여·SoD 부재) — 실재 과신·부재 과장 양방향 회피.
- (+) admin_roles 장식화 전례를 D-3 규율로 명문화(인가 실소비 role에만).
- (+) Part 3-4+ Scoped/Dynamic/Service/Effective가 재사용할 Assignment Resolution Contract 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-4 Scoped Role Governance**(스펙 권장 순서 §42). 실 Assignment 엔진=선행 실구현 + 별도 승인세션(RP-002).

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Assignment Registry/Service/Resolver 신설 금지·5분산 write 통합·폐기 admin_roles 재부활 금지·근접 패턴 Assignment 오흡수 금지) · 무후퇴 · "결론의 근거도 재실증"(team_role 3핸들러·api_key 2경로·effectiveForUser·SecurityAudit·assignableMap·break-glass·승인/SoD/만료 부재 전부 grep/코드 정독·firsthand 재검증) · Assignment≠즉시direct write · 인가 실소비 role에만 · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · 부재 날조·실재 과신 양방향 금지 · 289차 P1~P4·break-glass 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
