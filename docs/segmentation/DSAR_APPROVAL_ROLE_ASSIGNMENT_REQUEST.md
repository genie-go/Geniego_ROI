# DSAR — Approval Role Assignment Request (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Request)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

Assignment Request는 스펙 §10이 정의하는 엔티티로, "누가·어떤 role을·어떤 scope/기간으로·왜 요청하는가"를 실행(direct write)과 분리된 1급 레코드로 정형화한다. 현행 5개 실행 substrate는 요청 제출과 실행 반영이 분리되어 있지 않다 — caller가 write 권한을 가지면 그 즉시 대상 자원(`app_user.team_role` 등)이 갱신된다(전수조사 §3 "5경로 전부 caller 권한검증 통과 즉시 단일 트랜잭션 직접 반영"). Assignment Request는 이 direct write 앞에 "요청→검토(§1항목21 Reviewer)→승인(§9 Approval)→실행" 단계를 삽입하는 계약이다.

## 2. Canonical 필드

스펙 §10 원문 그대로:

| 필드 | 의미 |
|---|---|
| `request_id` | 식별자(PK) |
| `requester` | 요청자(요청 제출 actor — 현행 실행 actor와 분리되는지는 §4 참조) |
| `requested_role` | 요청 대상 Role Definition/Version |
| `requested_scope` | 요청 Scope(§8 Assignment Scope 축) |
| `requested_duration` | 요청 유효기간(영구/한시 — §11 Temporary Assignment와 결합) |
| `business_reason` | 비즈니스 사유 |
| `risk_score` | 리스크 점수(§31 Assignment Risk Assessment와 결합) |
| `reviewer` | 검토자(§1 항목21 Assignment Reviewer) |
| `approver` | 승인자(§9 Assignment Approval) |
| `decision` | 최종 결정 |
| `evidence` | 증거(§26 Assignment Evidence와 결합) |

## 3. 열거형 / 타입

- 스펙 §10 본문은 필드 나열만 제공하며 별도 상태 열거형은 명시하지 않는다. Request의 상태 전이(Requested→Draft→Pending Review→Pending Approval→Approved 등)는 §7 Assignment Lifecycle의 초기 4단계와 대응한다(범위 경계 — 본 엔티티는 Lifecycle 상태머신을 재정의하지 않고 참조한다).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| Request 자체(제출→검토→결정 분리 프로세스) | **ABSENT** | 전수조사 §3 "5경로 전부 caller 권한검증 통과 즉시 단일 트랜잭션 직접 반영"(`UserAuth.php:1334,1392`·`EnterpriseAuth.php:483-511`·`TeamPermissions.php:768-776`·`UserAuth.php:1639-1648`) |
| `requester`(요청자≠실행자 분리) | **ABSENT** | 위 5경로는 write 권한 보유 caller 본인이 즉시 반영자 — 요청 제출과 실행 사이의 별도 actor 개념이 substrate에 없음 |
| `business_reason` / `risk_score` | **ABSENT** | 전수조사 전 구간 grep 0, 근접 필드 없음 |
| `reviewer` / `approver` / `decision` | **ABSENT** | 승인 workflow 부재(전수조사 §3) — 근접 후보인 `DELEGATION_EXCEEDED`(`TeamPermissions.php:644-647`)는 acl_permission 위임상한 클램프 거부이지 role 요청 결정이 아님(ADR §D-5) |
| `evidence` | **PARTIAL(간접)** | `auth_audit_log`(`UserAuth.php:4165,4174-4197`)가 변경 사실은 기록하나 요청 시점 증거가 아니라 실행 후 로그(전수조사 §5·§7) |

## 5. 설계 원칙

1. **요청과 실행의 분리** — Assignment Request는 direct write 이전 단계로 신설되며, 기존 5경로의 즉시 반영 동작 자체를 대체하지 않고 그 앞에 게이트를 추가한다(ADR §D-2 "Assignment ≠ 즉시 direct write").
2. **Requester ≠ 현행 caller와 동일시 금지** — 현재 team_role 변경은 write 권한 보유자가 곧 실행자이므로, Requester를 도입할 때 "자기 자신에게 요청"을 자동 승인으로 흘려보내지 않는다(Self Assignment 원칙, ADR §D-3 인가 실소비 규율과 결합).
3. **Risk Score는 단일 소스** — Assignment Risk Assessment(§31)와 중복 스코어링 엔진을 만들지 않는다(추후 Part에서 공유).
4. **Golden Rule** — Request는 신규 엔티티이나, 실행 대상은 여전히 기존 5분산 substrate(team_role/api_key/wms/pm)이며 별도 실행 테이블을 새로 만들지 않는다(ADR §D-1).
5. **evidence는 사전 증거와 사후 로그를 구분** — `auth_audit_log`(사후 변경기록)를 Request의 사전 evidence로 오인하지 않는다(정직 판정, 전수조사 §5).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Assignment Registry·Version·Approval(§9)이 전부 선행 미구현 — Request가 참조할 대상 자체가 없다.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_ASSIGNMENT_REQUEST` 엔티티 11개 필드 전부 순신설.
- **Gap-2**: Reviewer/Approver actor 유형이 현행 Subject 유형(전수조사 §4 — Human/API Client만 실재)에 없다 — §1 항목21 Assignment Reviewer DSAR과 연동 필요.
- **정직 부재**: `DELEGATION_EXCEEDED`를 Request Decision으로 오흡수하지 않음(ADR §D-5 명시적 구분).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
