# DSAR — Approval Role Assignment Policy Governance (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Policy)

> **파일명 표기**: 스펙 §2 Canonical Entity 원명은 `APPROVAL_ROLE_ASSIGNMENT_POLICY`이나, 동명 파일 `docs/segmentation/DSAR_APPROVAL_ROLE_ASSIGNMENT_POLICY.md`가 이미 **Part 3-1(Role Registry Foundation·289차 후속 2026-07-19)** 소유로 존재 — "Role Definition이 어떤 조건으로 배정될 수 있는가"(assignment eligibility policy)를 다루며 "실 Role Assignment Table 생성·부여 실행은 Part 3-3"으로 명시적으로 범위를 넘겨둔 문서다. 본 문서(Part 3-3)는 그 범위 이양을 이어받아 **Assignment Registry(§4)가 소유하는 운영 정책 집합**(Assignment/Approval/Renewal/Expiration/Risk/Review/Evidence/Snapshot/Cache/Audit Policy — Assignment의 승인·갱신·만료·위험·검토·증거·스냅샷·캐시·감사 운영 규칙)을 다룬다. 두 문서는 **상호 보완 관계**(Part 3-1=누가 배정될 수 있는가의 자격 정책, Part 3-3=배정된 이후 생애주기를 어떻게 운영하는가의 운영 정책)이며 중복이 아니다 — 신규 Assignment Policy 엔진을 병렬 신설하지 않고 Part 3-1 문서를 Eligibility Policy로, 본 문서를 Registry Operational Policy(Policy Governance)로 역할 분리한다. 기존 `DSAR_APPROVAL_ROLE_ASSIGNMENT_POLICY.md`(06-A-02/Part 3-1 소유)는 본 세션에서 손대지 않는다.

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT_POLICY`는 스펙 §4(Assignment Registry) 필드에 나열된 10종 Policy(Assignment/Approval/Renewal/Expiration/Risk/Review/Evidence/Snapshot/Cache/Audit Policy)를 담는 엔티티다. Registry(1편)가 이 Policy들을 "보유"하는 컨테이너였다면, 본 문서는 그 10종 Policy 각각의 **값 도메인과 substrate 매핑**을 다룬다.

## 2. Canonical 필드

스펙 §4에서 파생 — Registry가 참조하는 10종 Policy 각각을 아래와 같이 구체화한다.

| Policy | 정의 |
|---|---|
| Assignment Policy | 허용 Assignment Type(Direct/Group/Temporary/Emergency 등, 스펙 §3) |
| Approval Policy | 필수 Approval 단계(스펙 §9: Auto/Single/Dual/Multi-stage/Emergency/Risk-based/Manual) |
| Renewal Policy | 갱신 방식(스펙 §22: Manual/Auto/Approval Required/Review Required) |
| Expiration Policy | 만료 방식(스펙 §21: Fixed Date/Relative Duration/Scheduled/Immediate) |
| Risk Policy | Assignment Risk 평가 기준(스펙 §20 요소 반영) |
| Review Policy | 재검증 주기·트리거(스펙 §30 Revalidation Trigger 연동) |
| Evidence Policy | 필수 Evidence 유형(스펙 §27) |
| Snapshot Policy | Snapshot 생성 시점·보존(스펙 §26) |
| Cache Policy | Cache 무효화 트리거(스펙 §34) |
| Audit Policy | 감사 이벤트 종류·보존 기간(스펙 §49 Assignment Audit) |

## 3. 열거형 / 타입

- **Risk Policy 값 도메인**(스펙 §20 Assignment Risk 원문): Role Risk · Scope · Permission · Critical Permission · Temporary 여부 · Emergency 여부 · Delegation 여부 · Actor Type.
- **Approval Policy 값 도메인**(스펙 §9 원문): Auto Approval · Single Approval · Dual Approval · Multi-stage Approval · Emergency Approval · Risk-based Approval · Manual Approval.
- **Expiration Policy 값 도메인**(스펙 §21 원문): Fixed Date · Relative Duration · Scheduled Expiration · Immediate Expiration.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **Approval Policy = ABSENT**: 승인 workflow 부재(전수 grep 0·ADR §3). `pending_approval`/`approveQueue` 매치는 캠페인/가격 도메인(`AdminGrowth.php:1063`)뿐 — role 부여와 무관(ground-truth §3).
- **Expiration Policy = PARTIAL(api_key만)**: `Keys.php:119,170`의 `expires_at`(Fixed Date에 근접)+`index.php:518-520` 요청시점 게이트. 자동 revoke 워커 없음(ground-truth §2). team_role/wms_permissions/pm_task_assignees는 Expiration Policy 대응물 자체 없음.
- **Renewal Policy = ABSENT**: 갱신 개념 자체가 5경로 어디에도 없음(요청시 재발급만 가능·"갱신"으로서의 정형 흐름 부재).
- **Risk Policy = ABSENT**: Assignment 자체의 위험도 평가 substrate 없음. `assignableMap`(`TeamPermissions.php:354-360`)·`DELEGATION_EXCEEDED`(`:644-647`)는 acl_permission 위임 상한이지 Assignment Risk Policy가 아님(ADR D-5·ground-truth §3 정직 판정).
- **Review Policy = ABSENT**: 정기 재검증(Revalidation) 트리거 부재.
- **Evidence Policy = ABSENT**: 필수 증거 유형을 강제하는 정책 부재(Definition DSAR §4 "Snapshot ID/Digest/Evidence = ABSENT 전면"과 동일 근거).
- **Snapshot Policy = ABSENT**: Assignment Snapshot 개념 전무.
- **Cache Policy = ABSENT**: `effectiveForUser`/`effectiveScope`가 "매 요청 라이브 재계산·캐시 없음"(ground-truth §7)이므로 Cache 자체가 없어 무효화 정책도 성립하지 않음.
- **Audit Policy = PARTIAL(비일관)**: 감사가 있는 경로(sub-admin·apiKeys·TeamPermissions CRUD·PM assignee)와 없는 경로(팀원 초대/역할변경/비활성·SSO provisionUser·`/v421/keys`·wms_permissions)가 혼재(ground-truth §5). 2중 감사 테이블(`auth_audit_log` + `pm_audit_log`) 병존(중복감사 D-3)으로 단일 Audit Policy가 적용되지 않음. 유일 tamper-evident 체인 `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 role assignment 이벤트를 기록하지 않음.
- **Assignment Policy(허용 유형) = PARTIAL**: 현재 5경로는 사실상 Direct Assignment만 실행(SSO provisionUser는 Group→Role 매핑이므로 부분적으로 Group Assignment에 근접·`roleForGroups`, `EnterpriseAuth.php:78-91`). Temporary/Emergency/Delegated/Scheduled Assignment 허용 여부를 규정하는 정책 자체가 없음(그 실행 substrate도 ABSENT — ADR D-5).

## 5. 설계 원칙

- 본 문서(Registry Operational Policy)와 Part 3-1의 기존 `DSAR_APPROVAL_ROLE_ASSIGNMENT_POLICY.md`(Eligibility Policy)는 **역할을 분리**하되 중복 엔진으로 신설하지 않는다 — Eligibility Policy가 "누가 배정 가능한가"를 판정하면, Registry Operational Policy는 그 판정을 통과한 Assignment의 승인/갱신/만료/위험/검토/증거/스냅샷/캐시/감사 운영을 규정한다(순차 관계, 병렬 아님).
- Audit Policy는 현재 비일관 상태(경로별 감사 유무 상이)를 Registry 단일 Policy로 강제 일원화하는 것이 조립 목표(ADR §3 Canonical Interface "Snapshot/Evidence/Digest: SecurityAudit tamper-evident 체인으로 승격").
- Cache Policy는 `effectiveForUser`류 라이브 재계산 패턴을 Version 기준 캐시로 승격하는 설계이되, 현재는 캐시 자체가 없으므로 무효화 규칙(스펙 §34)부터 설계해야 함.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Risk Policy는 Permission Engine(Part 2)의 permission criticality 판정이 선행되어야 함. Approval Policy는 Decision Core 선행 필요.
- **Gap**: 10종 Policy 중 실 substrate 근접이 있는 것은 Expiration(api_key만)·Audit(비일관)뿐이며 나머지 8종은 전면 ABSENT — 스키마·워크플로우 전면 신설 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
