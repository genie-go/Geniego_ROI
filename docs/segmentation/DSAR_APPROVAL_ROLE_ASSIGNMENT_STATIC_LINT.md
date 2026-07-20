# DSAR — Assignment Static Lint (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Static Lint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§36(Static Lint)는 Assignment 관련 코드/설정을 **저장·커밋 시점**에 검사하는 목록이다: **Hardcoded Assignment · User.roles[] · Direct SQL Role Injection · Missing Approval · Missing Snapshot · Missing Version · Missing Evidence**(7종). ★이 저장소는 **전 항목 ABSENT**로 정직 판정한다 — Canonical Assignment 저장 스키마(Registry/Definition/Version/Snapshot/Evidence) 자체가 존재하지 않으므로(순신규), 검사할 대상이 없다. 단, §36이 겨냥하는 **안티패턴 3종(Hardcoded Assignment·User.roles[]·Direct SQL Injection)은 이 저장소의 5분산 실행 substrate 중 실제 위반 후보를 갖는 항목**이 있어, "저장 스키마 부재로 NOT_APPLICABLE"과 "안티패턴 후보 실재"를 구분해 표기한다.

## 2. Canonical 필드

- **Lint Rule** — §36 7종 중 1
- **판정** — `REAL`(정형화 대상 실 위반 후보) / `ABSENT`(정직 부재) / `NOT_APPLICABLE`(검사 대상 스키마 부재)
- **실 substrate** — file:line(없으면 ABSENT)
- **정형화 방향** — 신설 시 lint가 겨눌 구체 대상

## 3. 열거형 / 타입

§36 Static Lint 7종(원문 그대로): `HARDCODED_ASSIGNMENT` · `USER_ROLES_ARRAY` · `DIRECT_SQL_ROLE_INJECTION` · `MISSING_APPROVAL` · `MISSING_SNAPSHOT` · `MISSING_VERSION` · `MISSING_EVIDENCE`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §36 lint 규칙 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Hardcoded Assignment | **REAL(정형화 대상)** | team_role 값 화이트리스트가 3핸들러에 각자 하드코딩: `UserAuth.php:1334,1392`(`in_array(['manager','member'])`)·`EnterpriseAuth.php:507-509`(`roleForGroups`)·api_key `validRoles`(`Keys.php:95-98`). 통합 Registry 없이 각 진입점이 독자 값 목록을 하드코딩(DUPLICATE_AUDIT D-1) |
| 2 | User.roles[] | **ABSENT(정직)** | 스펙이 명시적으로 금지하는 `user.roles[]` 배열 패턴은 이 저장소에 grep 0 — team_role은 app_user 테이블의 단일 컬럼값(배열 아님). 날조 금지 |
| 3 | Direct SQL Role Injection | **PARTIAL(근접·prepared statement 확인 필요 범위 밖)** | 5경로 전부 prepared statement 사용이 EXISTING_IMPLEMENTATION 인용 범위 내 문자열 결합 SQL 증거 없음 — 단, 본 DSAR는 GROUND_TRUTH 2문서 인용만 허용되므로 "SQL Injection 벡터 0건"을 확정 판정하지 않고 이 항목은 실 구현 세션 재검증 대상으로 유보 |
| 4 | Missing Approval | **REAL(구조적 부재)** | 승인 workflow 전수 grep 0(EXISTING_IMPLEMENTATION §3) — 5경로 전부 caller 권한검증 통과 즉시 단일 트랜잭션 직접 반영. lint가 겨눌 대상 자체가 "Approval 스키마 없음"이 아니라 "Approval을 거치지 않는 직접 write 경로 5개" |
| 5 | Missing Snapshot | **ABSENT → 신설** | Assignment Snapshot 스키마 부재. 근접 substrate 없음 |
| 6 | Missing Version | **REAL(구조적 부재)** | Version 개념 부재를 가장 명확히 실증하는 사례가 `replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`) — DELETE→INSERT로 이전 상태 소실. Version이 없다는 것이 "컬럼 없음"이 아니라 "교체 시 이전 값이 물리적으로 사라진다"는 실 결과로 확인됨 |
| 7 | Missing Evidence | **PARTIAL** | Evidence 최근접은 `auth_audit_log`(변경 로그·mutable)·`SecurityAudit::verify`(`SecurityAudit.php:56-68`·유일 tamper-evident 체인이나 role assignment 이벤트 미기록) — Evidence 저장소는 있으나 assignment 도메인에 미적용 |

## 5. 설계 원칙

1. **"저장 스키마 없음=검사 불필요"가 아니다** — Missing Approval(#4)·Missing Version(#6)은 스키마 부재가 아니라 **현재 존재하는 직접-write 경로 자체가 위반 사례**임을 명시(REAL). 스키마가 없어서 lint를 못 다는 것과, 스키마가 없어서 위반이 상시 발생 중인 것은 다르다.
2. **Hardcoded Assignment(#1) lint는 다중 화이트리스트 통합이 목표** — `UserAuth.php`/`EnterpriseAuth.php`/`Keys.php`의 3개 독자 값 목록을 삭제·재구현이 아니라 Canonical Registry 참조로 정형화(중복 Resolver 신설 금지, ADR D-1).
3. **User.roles[](#2)는 정직 부재로 유지** — 스펙이 "이렇게 구현하지 말라"고 명시한 패턴이며 실제로 이 저장소에 없다. 신설 시 금지 규칙으로만 등재하고, 없는 것을 "제거 대상"으로 날조하지 않는다.
4. **Direct SQL Injection(#3)은 본 DSAR 범위에서 확정 판정 금지** — GROUND_TRUTH 2문서가 prepared statement 여부를 문장으로 확정하지 않았으므로, 실 구현 세션에서 5경로 전체 재검증을 lint 전제조건으로 등재한다(과신 금지).
5. **Missing Evidence(#7) lint는 SecurityAudit 승격과 결합** — 신규 Evidence lint는 4번째 감사 스토어를 신설하지 않고 `SecurityAudit::verify` 확장을 전제로 설계한다(ADR D-1 "auth_audit_log → PARTIAL(승격)").

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 7종 전부 Canonical Assignment 저장 스키마(Registry/Version/Snapshot/Evidence) 신설 이후에 실 lint 발동 가능.
- **REAL(정형화 대상)**: Hardcoded Assignment(#1)·Missing Approval(#4)·Missing Version(#6) — 스키마 부재가 아니라 현행 실 코드의 구조적 위반 후보.
- **ABSENT(정직)**: User.roles[](#2)·Missing Snapshot(#5).
- **재검증 유보**: Direct SQL Role Injection(#3) — GROUND_TRUTH 인용 범위 밖(과신 금지).
- **판정**: NOT_CERTIFIED · 실 lint 활성 = 스키마 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_RUNTIME_GUARD]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
