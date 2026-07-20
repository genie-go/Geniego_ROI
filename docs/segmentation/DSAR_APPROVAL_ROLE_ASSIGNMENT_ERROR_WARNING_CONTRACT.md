# DSAR — Assignment Error / Warning Contract (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Error/Warning Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§37(Error)·§38(Warning)의 **Assignment 에러·경고 코드 정본**을 정의한다. Error=요청을 **차단(fail-closed)**하는 확정 위반, Warning=처리는 진행하되 **감사·후속 조치를 유발**하는 신호다. 두 목록은 §35 Runtime Guard(차단 발동)·§39 API(응답 표현)가 공유하는 단일 소스다. **현행 저장소에는 Assignment 전용 구조화 에러 코드 체계가 전무**하며, 현재의 실패는 team_role 화이트리스트 위반 시 flat HTTP 4xx(`in_array` 검증 실패·`Keys.php` validRoles 실패)로만 표현된다.

## 2. Canonical 필드

- **Code** — `ASSIGNMENT_*` 네임스페이스(§37 Error 10종·§38 Warning 6종)
- **Class** — `ERROR`(fail-closed) / `WARNING`(진행+감사)
- **Trigger** — 발동 조건(§37/§38 원문)
- **Related Runtime Guard** — §35 8종 매핑
- **Related API** — §39 응답 표면
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

### 3.1 §37 Error 코드 (10개 · fail-closed 차단 · 정본)

| 코드 | 트리거 |
|---|---|
| `ASSIGNMENT_NOT_FOUND` | Assignment 미존재 |
| `ASSIGNMENT_EXPIRED` | 만료 Assignment 사용 시도 |
| `ASSIGNMENT_REVOKED` | 취소된 Assignment 사용 시도 |
| `ASSIGNMENT_SUSPENDED` | 정지된 Assignment 사용 시도 |
| `ASSIGNMENT_SCOPE_INVALID` | Scope 정의 위반/불일치 |
| `ASSIGNMENT_APPROVAL_REQUIRED` | 승인 미완료 상태에서 처리 시도 |
| `ASSIGNMENT_CONFLICT` | SoD/중복/충돌 탐지 |
| `ASSIGNMENT_VERSION_INVALID` | Assignment Version 또는 결합 Role Version 불일치 |
| `ASSIGNMENT_POLICY_BLOCKED` | Assignment Policy(Registry 정책) 위반 |
| `ASSIGNMENT_RUNTIME_BLOCKED` | §35 Runtime Guard 발동(범용 코드) |

### 3.2 §38 Warning 코드 (6개 · 진행 + 감사 · 정본)

| 코드 | 트리거 |
|---|---|
| `ASSIGNMENT_EXPIRING` | 만료 임박 |
| `ASSIGNMENT_RENEWAL_REQUIRED` | 갱신 필요 |
| `ASSIGNMENT_SCOPE_EXPANDED` | Scope 확대 발생 |
| `ASSIGNMENT_ROLE_UPDATED` | 결합 Role 정의/버전 변경 |
| `ASSIGNMENT_POLICY_UPDATED` | Registry 정책 변경 |
| `ASSIGNMENT_REVIEW_REQUIRED` | 검토 라우팅 필요 |

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical 코드축 | 판정 | 실 substrate (file:line) |
|---|---|---|
| Assignment 구조화 에러/경고 코드 체계 | **ABSENT → 신설** | 없음 — 현행은 flat 검증 실패(`in_array(['manager','member'])` 실패 시 표준 4xx) |
| `ASSIGNMENT_NOT_FOUND`류 최근접 | **PARTIAL(flat)** | team_role 컬럼 값 부재 시 사용자 조회 실패 경로(`UserAuth.php:1369-1423`·`updateTeamMember` 대상 미존재 케이스) |
| `ASSIGNMENT_EXPIRED` | **PARTIAL(1/5 자원만)** | 유일 시간기반 실효=api_key `expires_at`(`Keys.php:119,170`) 요청시점 게이트(`index.php:518-520`). team_role/wms_permissions/pm_task_assignees는 만료 개념 자체 부재 |
| `ASSIGNMENT_REVOKED`/`ASSIGNMENT_SUSPENDED` | **PARTIAL** | is_active=0 토글(`UserAuth.php:1445`)·하드 DELETE(`Wms.php:519-526`·`Assignees.php:52-72`)가 근접이나 Revoked/Suspended를 구분하는 코드 없음(단일 이진 상태) |
| `ASSIGNMENT_SCOPE_INVALID` | **PARTIAL** | `effectiveScope` fail-closed DENY_SCOPE(`TeamPermissions.php:236-265`)가 근접이나 Assignment Scope 엔티티 미참조 |
| `ASSIGNMENT_APPROVAL_REQUIRED` | **ABSENT** | 승인 workflow 전수 grep 0(EXISTING_IMPLEMENTATION §3) |
| `ASSIGNMENT_CONFLICT`(SoD) | **ABSENT** | SoD 개념 부재. `DELEGATION_EXCEEDED`(`TeamPermissions.php:644-647`)는 acl 위임상한 초과지 SoD 충돌 아님 |
| `ASSIGNMENT_VERSION_INVALID` | **BLOCKED_PREREQUISITE** | Assignment Version·Role Version 모두 순신규(Part 3-1 이후) |
| `ASSIGNMENT_POLICY_BLOCKED` | **ABSENT** | Assignment Registry Policy 개념 부재 |
| Warning 6종 전체 | **ABSENT → 신설** | 진행+감사 신호 체계 부재. 근접 감사 저장소는 `auth_audit_log`(mutable)·`SecurityAudit::verify`(`SecurityAudit.php:56-68`·assignment 미기록) |

## 5. 설계 원칙

1. **Error=차단·Warning=진행+감사 이분법 고정** — Expired/Revoked/Suspended/Scope/Approval/Conflict/Version/Policy는 Error(fail-closed), Expiring/Renewal/Scope 확대/Role·Policy 변경/Review는 Warning. 혼용 금지.
2. **코드 목록 단일 정본** — §35 가드·§39 API·§40 테스트가 본 문서 코드 이름을 공유. 코드 문자열 중복 정의 금지.
3. **`ASSIGNMENT_RUNTIME_BLOCKED`는 범용 코드** — §35의 8개 세부 트리거 중 전용 코드가 없는 항목(Invalid Subject·Risk Policy 위반 등)의 상위 포괄 코드로 사용하고, 세부 트리거는 로그/근거 필드로 구분한다(코드 폭증 방지).
4. **fail-closed 계승** — 현행 team_role 화이트리스트 검증 실패 시 기본거부 방향을 Error 코드로 승격하되 기본거부 유지(권한상승 금지).
5. **Warning 저장소는 SecurityAudit 승격과 결합** — 새 경고 스토어 신설 금지, `auth_audit_log`/`SecurityAudit` 확장으로 흡수(ADR D-1).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `ASSIGNMENT_VERSION_INVALID`는 Part 3-1 Role Registry Version 실구현 이후 실효.
- **Gap(순신규)**: Error 10 + Warning 6 코드 전부 신설 — 현행은 flat 검증 실패만 존재.
- **PARTIAL(최근접)**: api_key expires_at·is_active 토글·effectiveScope가 부분 근접이나 구조화 코드·Assignment 엔티티 미참조.
- **정직 부재**: ASSIGNMENT_APPROVAL_REQUIRED·ASSIGNMENT_CONFLICT(SoD)는 대상 워크플로우/개념 자체 부재(날조 금지).
- **판정**: NOT_CERTIFIED · 실 코드 방출 = Canonical Assignment Registry 신설 + Part 2/3-1/3-2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_RUNTIME_GUARD]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
