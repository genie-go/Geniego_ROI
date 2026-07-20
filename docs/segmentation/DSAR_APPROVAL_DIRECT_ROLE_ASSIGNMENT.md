# DSAR — Approval Direct Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Direct Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

스펙 §1-6(Direct Assignment)·§3(Assignment 대상: 지원 Assignment 유형에 Direct 포함) — 조직/그룹 경유 없이 Subject(Human User 등)에게 Role을 직접 부여하는 가장 기본적인 Assignment 유형이다. ADR §0 총평이 명시하듯 Part 3-3는 Part 3-2(전건 순신규)와 대조적으로 **Direct Assignment 실행 substrate가 5자원 중 가장 핵심적으로 실재**한다(`app_user.team_role` 직접 write). Part 3-3의 핵심 목적은 이 실재하는 3분산 write(UserAuth/EnterpriseAuth/TeamPermissions)를 Canonical Assignment Registry의 단일 진입점으로 중개하는 것이다(ADR D-1).

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문 그대로: Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Direct) · Assignment Source · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Direct(스펙 §3 지원 Assignment 유형: Direct · Indirect · Group · Organization · Position · Job · Dynamic Assignment Reference · Delegated · Temporary · Emergency · Scheduled).
- **Assignment Lifecycle**(§7): Requested · Draft · Pending Review · Pending Approval · Approved · Scheduled · Active · Suspended · Expired · Revoked · Replaced · Archived — 12상태.
- **Version Type**(§6): Initial · Renewal · Scope Change · Role Version Change · Expiration Change · Approval Change · Restoration · Suspension · Revocation · Migration · Correction.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**PARTIAL — `app_user.team_role` 직접 write가 3핸들러에 독립 실재(ADR D-1·DUPLICATE_AUDIT D-1 표)**:

- `UserAuth::createTeamMember`(`UserAuth.php:1281-1366`) — 팀원 생성+role 부여, INSERT `team_role`(`:1334`/`:1342`), `memberRole`(`:1299`), 화이트리스트 `in_array(['manager','member'])`.
- `UserAuth::updateTeamMember`(`UserAuth.php:1369-1423`) — UPDATE `team_role=?`(`:1392`), owner 대상 변경 차단(`:1384-1386`).
- `UserAuth::deleteTeamMember`(`UserAuth.php:1426-1451`) — 소프트삭제(정지 대용), UPDATE `is_active=0`(`:1445`), 세션 폐기(`:1446`), role 값 자체는 불변.
- owner 부여/영속 — 신규가입 INSERT owner(`UserAuth.php:691`), UPDATE owner(`:589-593`).
- `UserAuth::createSubAdmin`(`UserAuth.php:1561-1658`) — sub-admin 발급, 신규 INSERT `admin_level='sub',team_role='member'`(`:1639-1648`), 기존회원 승격 UPDATE(`:1613-1621`), 권한상승 차단 `admin_level='sub'` 강제(`:1352-1353`). 감사 있음(`:1626,1656,1708`).
- `TeamPermissions::promoteManager`(`TeamPermissions.php:768-776`, DUPLICATE_AUDIT D-1) — owner 보호 체크와 함께 manager 승격 독립 write.
- **소유권 이전(ownership transfer) = 부재(grep 0)**. owner는 모든 변경대상에서 명시 배제(`UserAuth.php:1384`·`:1441`·`EnterpriseAuth.php:405,418`).

→ 동일 컬럼(`app_user.team_role`)에 3클래스(UserAuth/EnterpriseAuth/TeamPermissions) 독립 UPDATE + admin_level 4번째 축, 중개하는 단일 Assignment Service 부재(DUPLICATE_AUDIT D-1).

**ABSENT — 거버넌스 계층**: Assignment Registry/Definition 구조체·Version(변경이력)·Approval workflow·Lifecycle 상태머신(12상태)·Snapshot/Digest/Evidence 전 구간 부재(EXISTING §6). 감사 비일관 — sub-admin은 감사 있음이나 팀원 초대/역할변경/비활성(`createTeamMember`/`updateTeamMember`/`deleteTeamMember`)은 감사 없음(EXISTING §5).

## 5. 설계 원칙

- ADR D-1 **CANONICAL_ASSIGNMENT_SUBSTRATE(통합)**: team_role 3분산 write는 Assignment Registry 단일 진입점으로 중개(검증·감사·version 일원화)하되, write 자체는 보존·정형화(발명 아니라 조립+통합).
- D-2: Assignment ≠ 즉시 direct write. 현행은 caller 권한검증 통과 즉시 단일 트랜잭션 UPDATE(version/approval/snapshot 없음). Canonical Direct Assignment는 Requested~Archived Lifecycle과 Version을 갖는 1급 엔티티로 구현 시 강제.
- D-3: 인가 실소비 role에만 적용(admin_roles 장식화 전례 반영) — Direct Assignment Registry도 실 RBAC 소비 team_role/admin_level에만 적용.
- 3핸들러의 검증규칙(화이트리스트 vs IdP 그룹매핑 vs owner 보호)을 Registry가 일원화하되 각 도메인 substrate의 write 자체는 방치하지 않는다(중복감사 §3 "채택" (a)).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Role Version Binding·Approval 결합·Effective Permission Projection은 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실구현 후에만 가능.
- **Gap**: 3핸들러 검증규칙 불일치 통합 미비, 소유권 이전(ownership transfer) 순신규, 팀원 CRUD 무감사 구간(고빈도 일상경로) 해소 필요, Version/Approval/Lifecycle/Snapshot/Evidence/Digest 전부 순신규.
- 실 구현 = 5분산 즉시쓰기를 Canonical Assignment Registry로 통합 + 거버넌스 신설(선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션 RP-002). 이번 차수는 설계 명세(코드 0).
