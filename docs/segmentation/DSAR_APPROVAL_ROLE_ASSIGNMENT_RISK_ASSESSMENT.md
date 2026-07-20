# DSAR — Approval Role Assignment Risk Assessment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Risk · 스펙 §20)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §20 Assignment Risk는 Role Risk·Scope·Permission·Critical Permission·Temporary 여부·Emergency 여부·Delegation 여부·Actor Type을 종합해 Assignment 요청/부여의 위험도를 산출하는 능력이다. 저장소에는 Role/Permission에 대한 **위험도 스코어링 개념 자체가 존재하지 않는다** — team_role은 `manager`/`member`(+ owner/admin_level 축) 화이트리스트로만 제한되고(GROUND_TRUTH §1.1), acl_permission 위임상한(`assignableMap`)은 위험도가 아니라 **상한 클램프**다(`TeamPermissions.php:354-360,644-647`).

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_RISK`(전부 신규 · 스펙 §20 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | risk assessment id | 식별자 |
| 2 | assignment id | 대상 Assignment |
| 3 | role risk | 아래 §3 |
| 4 | scope risk | 아래 §3 |
| 5 | permission risk | 아래 §3 |
| 6 | critical permission flag | 아래 §3 |
| 7 | temporary flag | 아래 §3 |
| 8 | emergency flag | 아래 §3 |
| 9 | delegation flag | 아래 §3 |
| 10 | actor type risk | 아래 §3 |
| 11 | composite risk score | 종합 산출값 |
| 12 | risk-based approval trigger | §9 Assignment Approval과 결합 |

## 3. 열거형 / 타입

**Risk Dimension**(스펙 §20 원문): `ROLE_RISK · SCOPE · PERMISSION · CRITICAL_PERMISSION · TEMPORARY · EMERGENCY · DELEGATION · ACTOR_TYPE`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Risk Dimension | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| ROLE_RISK | **ABSENT** | team_role 값(manager/member)·admin_level(master/sub)에 위험도 스코어·등급 필드 자체 없음(`UserAuth.php:1334,1392` 값 화이트리스트만) |
| SCOPE | **근접이나 위험도 아님** | `effectiveScope`(fail-closed DENY_SCOPE·`TeamPermissions.php:236-265`)는 Scope 적용 계산이지 Scope 확대에 따른 위험도 산출이 아님 |
| PERMISSION | **ABSENT** | acl_permission 위임상한(`assignableMap` `TeamPermissions.php:354-360`)은 상한 클램프(넘으면 즉시 403 `:644-647`)이지 Permission 위험 스코어링이 아님 |
| CRITICAL_PERMISSION | **ABSENT** | "Critical"로 태깅된 Permission 카탈로그 부재 |
| TEMPORARY | **ABSENT** | Temporary Assignment 자체 부재(§11 참조·순신규) |
| EMERGENCY | **ABSENT** | Emergency Assignment 자체 부재. break-glass(`UserAuth.php:790-801`)는 인증우회지 Assignment 위험 플래그 아님 |
| DELEGATION | **ABSENT(근접은 위임상한뿐)** | `DELEGATION_EXCEEDED`(`TeamPermissions.php:644-647`)는 acl 위임 상한 초과 거부이지 Delegation Risk 스코어 산출이 아님(289차 06-A-01 정합) |
| ACTOR_TYPE | **PARTIAL(값 공간만)** | Human/API Client 값 공간만 실재(GROUND_TRUTH §4)·유형별 위험 가중치 개념 없음 |

## 5. 설계 원칙

- Risk Assessment는 승인 정책(§9 Assignment Approval의 Risk-based Approval)의 **입력**으로만 설계하며, 이번 차수에 자동 집행 로직(위험도 기반 자동 거부/자동 승인)을 신설하지 않는다.
- `assignableMap`/`DELEGATION_EXCEEDED`(`TeamPermissions.php:354-360,644-647`)는 **위임 상한 클램프**로서 DELEGATION Risk Dimension의 참조 입력이 될 수 있으나, 그 자체를 Risk Score로 오독하지 않는다(상한 초과=즉시 거부이지 위험도 점수화가 아님).
- CRITICAL_PERMISSION 카탈로그는 Part 2 Permission Engine이 Permission Version/Group을 신설한 이후에만 의미 있게 태깅 가능 — 지금 시도하면 임의 값이 된다.

## 6. Gap / BLOCKED_PREREQUISITE

- 8개 Risk Dimension 전부 **ABSENT(순신규)**, ACTOR_TYPE·SCOPE만 근접 substrate 존재(값 공간/계산 로직)이나 위험도 스코어링 자체는 없음.
- CRITICAL_PERMISSION/PERMISSION Risk는 **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0가 선행).
- ROLE_RISK는 **BLOCKED_PREREQUISITE**(Part 3-1 Role Registry Risk 필드 선행 필요).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry(본 Part 본체) 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
