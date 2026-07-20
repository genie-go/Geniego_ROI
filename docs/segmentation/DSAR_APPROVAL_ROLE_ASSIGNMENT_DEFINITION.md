# DSAR — Approval Role Assignment Definition (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Definition)

> **파일명 표기**: 스펙 §2 Canonical Entity 원명은 `APPROVAL_ROLE_ASSIGNMENT`이나, 동명 파일 `docs/segmentation/DSAR_APPROVAL_ROLE_ASSIGNMENT.md`가 이미 **EPIC 06-A-02(Approval Assignment Engine·289차 13회차)** 소유로 존재(무관한 선행 개념 — Role 을 승인 Decision 의 Active Subject 로 해석하는 축). 기존 문서 보존을 위해 본 문서는 `_DEFINITION` 접미로 파일명을 분리하되, 내용은 스펙 §5 Assignment Definition을 그대로 다룬다. 혼동 방지: EPIC 06-A-02 문서는 "Role→Decision Subject 해석"이고, 본 문서(Part 3-3)는 "Subject→Role 배정 레코드 그 자체"다 — 서로 다른 개념.

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT`(스펙 §2 Canonical Entity·§5 Assignment Definition)는 Part 3-3의 중심 엔티티로, "이 Subject가 이 Role(Version)을 이 Scope·기간 동안 보유한다"는 사실을 1급으로 표현한다. 스펙 §0은 이를 `user_role` 테이블이나 `user.roles[]` 배열 수준이 아니라 **Canonical·Immutable·Versioned·Lifecycle 기반**으로 요구한다. Part 3-3의 정직 판정 핵심은 이 엔티티가 대체하려는 실제 substrate — `app_user.team_role`(가장 핵심 substrate) — 는 즉시쓰기로 실재하지만, Definition이 요구하는 Version/Approval/Snapshot/Digest/Evidence 필드는 그 substrate에 전혀 존재하지 않는다는 것(ADR D-2)이다.

## 2. Canonical 필드

스펙 §5 원문 그대로 — 필수 필드: **Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type · Assignment Source · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence**.

## 3. 열거형 / 타입

- **Subject Type**(스펙 §3): Human User · Employee · External User · Partner User · Vendor User · Service Account · API Client · Machine Identity · System Actor · Robot Account.
- **Assignment Type**(스펙 §3): Direct · Indirect · Group · Organization · Position · Job · Dynamic Assignment Reference · Delegated · Temporary · Emergency · Scheduled.
- **Assignment Status**: 스펙은 별도 열거를 §7 Lifecycle 상태 목록(Requested~Archived)과 공유하도록 설계(상세는 `DSAR_APPROVAL_ROLE_ASSIGNMENT_STATUS.md` 참조).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **Subject ID/Subject Type = PARTIAL(부분)**: `app_user`(Human) + `api_key`(API Client)만 실재(ground-truth §4 표). Service Account/System Actor/Robot Account = **ABSENT**(grep 매치는 GCP 외부 자격증명뿐, 내부 role Subject 아님). Employee/External/Partner/Vendor는 Subject 차원이 아니라 `TeamPermissions::TEAM_TYPES`(`TeamPermissions.php:44-49`) Team 차원에만 존재 — Subject 위험차등 없음.
- **Role Definition ID/Role Version = ABSENT**: Part 3-1(Role Registry)이 순신규이므로 Role Definition·Version 자체가 없음. `app_user.team_role`은 문자열 값(`'manager'`/`'member'`)일 뿐 Role Definition을 참조하지 않음.
- **Assignment Source = PARTIAL(암묵)**: 실제로는 5개 substrate 각각이 "출처"를 암묵적으로 구분 — 팀 초대(`UserAuth::createTeamMember:1281-1366`), SSO/SCIM(`EnterpriseAuth::provisionUser:483-511`), sub-admin 발급(`UserAuth.php:1639-1648`) — 하지만 이를 정형 필드로 기록하는 substrate는 없음.
- **Assignment Owner = ABSENT**: "누가 이 Assignment를 소유·책임지는가" 필드 부재. owner 개념은 team_role 값 `'owner'` 자체(소유권 이전 substrate는 grep 0 — ground-truth §1.1 "★소유권 이전(ownership transfer)=부재").
- **Effective From/To = 부분적으로만 근접**: api_key만 `expires_at`(`Keys.php:119,170`)을 가짐. team_role/wms_permissions/pm_task_assignees는 유효기간 컬럼 자체 없음(ground-truth §2 표 "role_expires 컬럼 없음").
- **Created By/Approved By = PARTIAL(Created By만)**: 감사가 있는 경로(`UserAuth.php:1626,1656,1708` sub-admin·`:4360,4375,4398` apiKeys)는 actor를 기록하나 이는 "누가 실행했는가"이지 "누가 승인했는가"가 아님 — Approved By에 대응하는 승인 workflow는 전수 grep 0(ground-truth §3).
- **Snapshot ID/Digest/Evidence = ABSENT** 전면(ground-truth §6 부재 목록).

## 5. 설계 원칙

- Assignment Definition은 5분산 write(`app_user.team_role` 3핸들러·`api_key.role` 2경로·`wms_permissions`·`pm_task_assignees`·`admin_level`)를 **대체가 아니라 통합**한다(Golden Rule) — 각 substrate의 write 자체는 보존하고, Assignment Definition이 그 위에 Version/Approval/Snapshot을 얹는다(ADR D-1 표 "확장 결정" 열).
- Assignment ≠ 즉시 direct write(ADR D-2) — 현행 5경로는 caller 권한검증 통과 즉시 단일 트랜잭션 UPDATE. Canonical Assignment Definition은 Lifecycle 상태를 거쳐야 Active가 된다.
- Subject Type을 1급 축으로 신설하되 부재 유형(Service Account/System Actor/Robot Account)을 날조하지 않는다(ADR D-4).
- 인가 실소비 role에만 적용(ADR D-3) — `admin_roles`/`user_roles`처럼 어떤 인가 게이트에서도 소비되지 않는 role을 Assignment Definition으로 재도입하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Role Definition ID/Role Version 필드는 Part 3-1(Role Registry) 실구현이 선행되어야 실제 참조 가능. Approved By/Assignment Lifecycle은 Decision Core·Approval workflow 선행 필요.
- **Gap**: Assignment Owner·Snapshot ID·Digest·Evidence 필드에 대응하는 substrate가 전무(ABSENT) — 신규 스키마 설계 필요(코드 0, 이번 차수 범위 외).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
