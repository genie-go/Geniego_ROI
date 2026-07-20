# DSAR — Role Assignment Validity (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §1.19)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12·§14) · 과거 Version 수정 금지(ADR §D-2)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. api_key `expires_at`는 **API 키의 만료이지 role의 유효기간이 아니다** — 근접 인용은 허용하되 role 유효성 필드로 오인 금지.

---

## 1. 목적

Assignment Validity(스펙 §1 항목 19 "Assignment Validity")는 Assignment가 언제부터 언제까지 유효한지를 정의하는 시간 축이다. 스펙 원문에는 전용 섹션이 없어(§11 Temporary, §12 Emergency, §13 Break Glass, §14 Delegated만 전용 섹션 보유) 필드는 §5 Assignment Definition의 "Effective From · Effective To"·§8 Assignment Scope의 "Time" 축·§21 Assignment Expiration에서 파생한다. Temporary(§11)·Scheduled(§1.13)·Emergency(§12)가 각각 특정 상황의 시간 규칙이라면, Validity는 **모든 Assignment 유형에 공통 적용되는 기저 시간 필드**다.

- **순신규**: Effective From/To를 구조적으로 갖는 Assignment 레코드 자체가 부재(EXISTING §2 표 — team_role/wms_permissions/pm_task_assignees 전부 "부재(grep 0)").

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Validity 하위 · 스펙 §5·§8·§21에서 파생)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | effective from | 유효 시작 시점(스펙 §5) |
| 3 | effective to | 유효 종료 시점(스펙 §5) |
| 4 | time scope | Assignment Scope의 Time 축(스펙 §8) |
| 5 | expiration type | Fixed Date/Relative Duration/Scheduled/Immediate(스펙 §21) |
| 6 | validity status | 유효/만료/미래예약 등 파생 상태 |

## 3. 열거형 / 타입

Expiration Type(스펙 §21 원문 그대로): `Fixed Date` · `Relative Duration` · `Scheduled Expiration` · `Immediate Expiration`. Assignment Scope(스펙 §8) 축 중 `Time`이 Validity와 직결.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Validity 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Effective From/To(가장 근접) | api_key `expires_at`(생성 시점 + 만료 시점) | `Keys.php:119,170` | ★근접이나 **API Client(api_key) 전용**·role assignment(team_role/wms/pm) 레코드에는 Effective From/To 컬럼 자체가 없음 |
| Validity 강제 게이트(근접) | 요청 시점 expires_at 체크 | `index.php:518-520` | 근접 — 게이트-체크 방식으로 "지금 유효한가"만 판정. 별도 워커의 상태 전이(Active→Expired)는 없음 |
| team_role Effective To(부정 증거) | — | ABSENT(EXISTING §2 표 "부재(grep 0)·role_expires 컬럼 없음") | team_role은 **무기한**이 기본값 — soft-delete(`UserAuth.php:1445`)만 존재하고 시간 기반 만료 없음 |
| wms_permissions/pm_task_assignees Validity | — | ABSENT | EXISTING §2 표 전 항목 "부재" — 두 자원 모두 만료 컬럼 없음 |
| Time Scope(Assignment Scope 축) | effectiveScope(fail-closed DENY_SCOPE) | `TeamPermissions.php:236-265` | 근접 — scope 검증 시 라이브 판정이나, Time을 Scope 차원으로 명시 인코딩하지 않음(현행은 acl scope 검증) |

## 5. 설계 원칙

- **Validity는 모든 Assignment 유형의 공통 기저 필드**: Temporary(자동제거)·Scheduled(예약발효)·Emergency(최대기간)가 각자 특수 규칙을 갖더라도, 궁극적으로 Effective From/To라는 공통 Validity 필드 위에서 파생되도록 설계(중복 시간 필드 신설 금지 — 단일 소스).
- **api_key expires_at 패턴은 확장 substrate**(ADR §3 "Lifecycle 연산… api_key expires_at 패턴 확장") — 그러나 role assignment에 그대로 이식하지 않고 Canonical Assignment Version의 Effective To로 통합해 team_role/wms/pm 3자원에 균일 적용.
- **워커 부재를 게이트-체크로 착시하지 않는다**: 현재의 "요청 시점 체크"는 클라이언트가 실제로 접근을 시도할 때만 유효성이 확인되는 방식이며, 만료된 Assignment가 백그라운드에서 자동 정리(Cache Invalidation·§34)되지 않는다는 한계를 설계에 명시.

## 6. Gap / BLOCKED_PREREQUISITE

- Effective From/To 구조적 필드(team_role/wms_permissions/pm_task_assignees) = **전 구간 ABSENT**.
- Validity 상태 전이 워커(Active→Expired 자동화) = **ABSENT**(role/permission 만료 cron 부재 — EXISTING §2).
- Time을 Assignment Scope 차원으로 인코딩하는 구조(스펙 §8) = **ABSENT**.
- Assignment Version/Lifecycle(스펙 §6·§7) 자체가 코드 0이라 Validity 변경 이력 추적 = **BLOCKED_PREREQUISITE**(ADR §D-2).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
