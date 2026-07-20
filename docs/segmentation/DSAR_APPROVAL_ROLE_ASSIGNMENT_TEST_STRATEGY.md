# DSAR — Assignment Test Strategy (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Test Strategy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§40의 **Assignment 테스트 전략**을 정의한다: **Unit**(Assignment·Scope·Approval·Renewal·Revocation·Suspension·Restoration·Drift·Cache) · **Security**(Unauthorized Assignment·Scope Escalation·Emergency Abuse·Break Glass Abuse·Direct SQL Injection·Version Downgrade) · **Regression**(기존 Approval·기존 Permission·기존 RBAC·기존 Workflow). 본 저장소는 **구성된 lint·PHPUnit 스위트가 없다**(CLAUDE.md: 수동/배포 검증) — 실 구현 세션에서 최소 테스트 하네스를 함께 세우는 것을 완료조건으로 명문화한다. **Regression 세부는 별도 문서**([[DSAR_APPROVAL_ROLE_ASSIGNMENT_FUNCTION_REGRESSION_GATE]])로 상세화하며 본 문서에서는 위치만 참조. **본 차수 코드 0**.

## 2. Canonical 필드

- **Test Layer** — Unit / Security / Regression(별도 문서)
- **Target Domain** — Assignment 생애주기·Scope·Approval·Renewal·Revocation·Suspension·Restoration·Drift·Cache
- **Threat Model** — Security 6종(Unauthorized·Scope Escalation·Emergency Abuse·Break Glass Abuse·SQL Injection·Version Downgrade)
- **Harness Requirement** — 신규 실 구현 PR과 동시 신설(수동 검증만으로 gap 닫힘 주장 금지)

## 3. 열거형 / 타입

### 3.1 Unit Test (§40 원문)

Assignment(생성/필드 검증) · Scope(Assignment Scope 파싱/검증) · Approval(승인 상태 전이) · Renewal(갱신 판정) · Revocation(취소 처리) · Suspension(정지 처리) · Restoration(복원 처리) · Drift(정의-실사용 편차 탐지) · Cache(Assignment Cache 무효화 트리거).

### 3.2 Security Test (§40 원문 · 6종)

| 위협 | 시나리오 | 현행 근접 방어 substrate |
|---|---|---|
| **Unauthorized Assignment** | 권한 없는 caller의 Assignment 생성/변경 시도 | writeGuard/`guardTeamWrite`(`UserAuth.php:1167`·`index.php:72-85`) — team_role 값 게이트로 근접 방어 |
| **Scope Escalation** | Assignment Scope가 원 권한을 초과 확대 | `assignableMap`/`clampActions`/`DELEGATION_EXCEEDED`(`TeamPermissions.php:354-360,644-647`) — acl 위임상한이나 team_role assignment 자체엔 미적용(D-5 정직 판정) |
| **Emergency Abuse** | Emergency Assignment 남용(권한 상시화 우회) | Emergency Assignment 개념 자체 ABSENT(순신규) — 방어 대상 부재 |
| **Break Glass Abuse** | Break Glass로 임시 role 발급 남용 | break-glass(`UserAuth.php:790-801`)는 **인증우회(MFA 우회)지 role 부여 메커니즘 아님**(ADR D-5) — Break Glass Assignment는 본 저장소에 없으므로 이 위협의 실 공격면은 "인증우회 남용"으로 별개 트랙(289차 BLOCKED_SECURITY 계열·재플래그 아님) |
| **Direct SQL Injection** | Role 값 직접 SQL 결합 삽입 | 본 DSAR 범위(GROUND_TRUTH 2문서)에서 SQL 결합 여부 문장 확정 없음 — 재검증 유보(과신 금지) |
| **Version Downgrade** | 구 버전 Role/Assignment로 강제 회귀 | Version 개념 자체 ABSENT(순신규) — 방어 대상 부재 |

### 3.3 Regression Test (§40 원문)

별도 문서 참조: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_FUNCTION_REGRESSION_GATE]] — 기존 Approval·기존 Permission·기존 RBAC·기존 Workflow 무후퇴 목록·통과 기준.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 테스트 대상 | 판정 | 실 substrate (file:line) |
|---|---|---|
| 테스트 하네스(lint/PHPUnit) | **ABSENT → 신설** | 저장소에 구성된 테스트 스크립트 없음(CLAUDE.md: 수동/배포 검증) |
| Unauthorized Assignment 방어 | **PARTIAL** | `UserAuth.php:1167`·`index.php:72-85` — 정적 게이트로 근접 |
| Scope Escalation 방어 | **PARTIAL(다른 자원)** | `TeamPermissions.php:354-360,644-647` — acl_permission 위임상한이지 team_role assignment엔 미적용 |
| Emergency/Break Glass Assignment 대상 | **ABSENT** | Emergency Assignment 개념 부재. break-glass(`UserAuth.php:790-801`)는 role 부여 아닌 인증우회 |
| SQL Injection 대상 | **재검증 유보** | GROUND_TRUTH 인용 범위 밖 |
| Version Downgrade 대상 | **BLOCKED_PREREQUISITE** | Version 개념이 Part 3-1 이후 |
| Regression 대상(5분산 write) | **CANONICAL(무후퇴 대상)** | 파일 8(FUNCTION_REGRESSION_GATE)에서 상세 |

## 5. 설계 원칙

1. **엔진 신설 = 테스트 하네스 동시 신설이 완료조건** — 수동 검증만으로 Gap 닫힘을 주장 금지.
2. **Break Glass Abuse 테스트는 정의역을 정확히 좁힌다** — 이 저장소의 break-glass는 인증우회이지 role 발급이 아니므로(D-5), "Break Glass Assignment 남용" 테스트를 설계할 때 대상이 없는 채로 시나리오만 나열하지 않고 "Emergency/Break Glass Assignment 순신규" 상태를 명시한다.
3. **Scope Escalation 테스트는 assignableMap을 오인용하지 않는다** — acl 위임상한(권한 클램프)과 team_role 부여 상한(값 화이트리스트)은 별개 축이며, 테스트 설계 시 이 둘을 혼동해 "이미 방어됨"으로 과신 금지.
4. **SQL Injection 테스트는 실 구현 세션 선행 재검증 필수** — 본 DSAR가 인용 가능한 GROUND_TRUTH 범위에서 prepared statement 여부가 문장으로 확정되지 않았으므로, "안전하다"고도 "취약하다"고도 단정하지 않는다(양방향 반날조).
5. **Version Downgrade 테스트는 Version 신설과 동시 설계** — 대상이 없는 상태에서 테스트만 먼저 설계하지 않고 Part 3-1 Role Version + 본 Part Assignment Version 신설과 함께 확정.
6. **정직 부재는 테스트 대상 아님** — Emergency/Break Glass Assignment·Version Downgrade가 현재 발생 이력이 없으므로(대상 개념 부재) "회귀 테스트"가 아니라 "신규 기능 테스트"로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Version Downgrade Security Test는 Part 3-1 Role Version + 본 Part Assignment Version 실구현 이후.
- **Gap(순신규)**: 테스트 하네스 자체 부재 — Unit/Security 스위트 전무. Emergency/Break Glass Assignment 대상 자체 부재.
- **재검증 유보**: Direct SQL Injection — GROUND_TRUTH 범위 밖(과신 금지).
- **별도 문서**: Regression Test는 [[DSAR_APPROVAL_ROLE_ASSIGNMENT_FUNCTION_REGRESSION_GATE]]에서 전담.
- **판정**: NOT_CERTIFIED · 실 테스트 = 엔진 신설 + 하네스 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
