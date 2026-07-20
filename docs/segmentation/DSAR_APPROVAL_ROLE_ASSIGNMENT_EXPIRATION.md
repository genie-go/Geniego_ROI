# DSAR — Approval Role Assignment Expiration (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Expiration · 스펙 §21)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §21 Assignment Expiration은 Fixed Date·Relative Duration·Scheduled Expiration·Immediate Expiration으로 Assignment를 종료시키고, 만료 시 Assignment 종료·Cache 제거·Effective Permission 재계산을 수행하는 능력이다. ★**PARTIAL 판정**: 5개 실행 substrate 중 **api_key.role만** 요청시점 만료 게이트가 실재하고(`Keys.php:119,170`·`index.php:518-520`), team_role/sub-admin/wms_permissions/pm_task_assignees는 만료 필드 자체가 없다(`role_expires` 컬럼 없음·GROUND_TRUTH §2 표). ★role/permission 만료를 처리하는 cron 워커는 bin 스크립트 전수 0(GROUND_TRUTH §2 "role/permission 만료 cron 부재").

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_EXPIRATION`(전부 신규 · 스펙 §21 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | expiration id | 식별자 |
| 2 | assignment id | 대상 Assignment |
| 3 | expiration type | 아래 §3 |
| 4 | effective to | 만료 시각 |
| 5 | triggered by | 워커/요청시점 게이트/수동 |
| 6 | assignment termination | 만료 후 Assignment 상태 전환(§7 Lifecycle Expired) |
| 7 | cache removal | Assignment Cache 무효화(§33) |
| 8 | effective permission recalculation | Effective Permission 재계산(§17) |
| 9 | version reference | 만료로 생성된 Version(§6 Expiration Change) |

## 3. 열거형 / 타입

**Expiration Type**(스펙 §21 원문): `FIXED_DATE · RELATIVE_DURATION · SCHEDULED_EXPIRATION · IMMEDIATE_EXPIRATION`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Expiration Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| FIXED_DATE(api_key만) | **★PARTIAL** | `expires_at` 컬럼(`Keys.php:119,170`)·요청시점 강제 게이트(`index.php:518-520`·firsthand 확인) — role이 아니라 api_key 자체의 만료지만 role 필드와 동일 레코드에 병존 |
| FIXED_DATE(team_role/sub-admin/wms/pm) | **ABSENT** | `role_expires` 등 만료 컬럼 자체 없음(GROUND_TRUTH §2 표 "부재(grep 0)") |
| RELATIVE_DURATION | **ABSENT** | 상대기간(예: "30일 후 만료") 계산 로직 부재 |
| SCHEDULED_EXPIRATION | **ABSENT** | 예약 만료(워커 기반) 부재 — bin 34 스크립트 전수 0 |
| IMMEDIATE_EXPIRATION | **근접이나 별개** | is_active=0 즉시 토글(`UserAuth.php:1445`·`Keys.php:135-148`/`UserAuth.php:4364-4377`)이 "즉시 종료"의 근접이나, 이는 Revocation 축(§23)의 substrate이지 Expiration Type이 코드화된 것은 아님 |
| 만료 후 처리(Cache 제거) | **N/A(캐시 자체 없음)** | `effectiveForUser`/`effectiveScope`(`TeamPermissions.php:366-394,236-265`)는 매 요청 라이브 재계산이라 무효화할 캐시가 원천적으로 없음(GROUND_TRUTH §7 표) |
| 만료 워커(Trigger) | **ABSENT** | api_key expires_at도 **워커가 자동 revoke하지 않고** 요청 시점에 매번 게이트-체크만 함(GROUND_TRUTH §2 "단 자동 revoke 워커 없음") |

## 5. 설계 원칙

- api_key `expires_at`(`Keys.php:119,170`·`index.php:518-520`) 요청시점 게이트 패턴은 Assignment Expiration의 **유일한 실재 근접 substrate**로서 확장 기준선이 된다 — 다만 role assignment(team_role 등)에는 동형 필드가 없어 그대로 이식(add column)해야 하며 존재한다고 가정하지 않는다.
- "만료 워커 부재"는 IMMEDIATE_EXPIRATION만으로는 대체되지 않는다 — SCHEDULED_EXPIRATION(예약 만료)을 실 신설하려면 cron 워커 자체를 새로 만들어야 한다(기존 34개 bin 스크립트에 이식 가능한 동형 패턴 없음).
- Cache 제거(§33)는 "제거할 캐시가 없다"는 정직한 전제 위에서 설계한다 — `effectiveForUser`가 라이브 재계산이라는 현재 특성(무캐시)을 Cache Invalidation 미신설의 근거로 오인해 "이미 실시간이라 문제없다"고 결론짓지 않는다(Assignment Cache §33 자체가 신규 요구사항).
- 만료 시 Effective Permission 재계산(§17)은 `effectiveForUser`의 라이브 재계산 특성상 **다음 요청에 자동 반영**되나, 이는 "재계산 트리거 설계"가 아니라 "재계산이 상시 발생"이라는 부작용일 뿐임을 명시한다.

## 6. Gap / BLOCKED_PREREQUISITE

- FIXED_DATE = api_key만 **PARTIAL**, 나머지 4자원 **ABSENT**.
- RELATIVE_DURATION/SCHEDULED_EXPIRATION/워커 = **전부 ABSENT**(bin 스크립트 0).
- Cache 제거 = 대상 캐시 부재로 **N/A**(Assignment Cache §33 신설이 선행).
- Effective Permission 재계산 = `effectiveForUser` 라이브 재계산 확장(§17 substrate)이나 "만료 이벤트 트리거"로서의 설계는 **ABSENT**.
- 실 엔진 = 선행 Assignment Registry(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
