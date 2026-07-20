# DSAR — Approval Scope Assignment (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Assignment는 **Role Assignment(Part 3-3)와 Scope를 연결**하는 엔티티다(스펙 §7: "Role Assignment와 연결. 저장: Assignment·Scope·Version·Priority·Effective Time·Expiration"). "같은 Role이라도 Scope가 다르면 서로 다른 권한"이라는 Part 3-4 목표(스펙 §0)를 실체화하는 핵심 연결점이다. 현행 substrate는 `data_scope` 테이블의 `subject_type`/`subject_id`가 이미 user/team을 scope에 연결하는 역할을 하고 있으나(EXISTING_IMPLEMENTATION §1), 이는 Part 3-3에서 설계 중인 Role Assignment 엔티티와 아직 결합되어 있지 않다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_assignment_id` | Assignment 식별자(PK) |
| `role_assignment_id` | Part 3-3 Role Assignment 참조 |
| `scope_definition_id` | 부여된 Scope Definition 참조 |
| `version` | Scope Version 참조(§ Scope Version 문서) |
| `priority` | 다중 Scope 병합 시 우선순위 |
| `effective_time` | 유효 개시 시각 |
| `expiration` | 만료 시각 |

## 3. 열거형 / 타입

- 스펙 §7은 필드 목록만 제시(전용 enum 없음). `priority`는 § Scope Policy(§9)의 Union/Most Restrictive 계산에 사용되는 정수/등급 값으로 설계.
- `effective_time`/`expiration` 쌍은 § Scope Constraint(§12 Time Window)와 결합 가능(설계 참조만, 구현은 후속).

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| subject↔scope 연결(근접) | **PARTIAL/PRESENT** | `data_scope(tenant_id,subject_type,subject_id,scope_type,scope_values,updated_at)`(`TeamPermissions.php:160-166`) — subject_type/subject_id가 user/team을 scope_type에 연결(EXISTING_IMPLEMENTATION §1) |
| Role Assignment와의 결합 | **ABSENT(별개 체계)** | Part 3-3 Role Assignment 엔티티는 설계 단계(코드 0)이며 data_scope의 subject_type/subject_id와 아직 통합 계약 없음 |
| manager에 의한 부여 경로 | **PRESENT(위임상한 미검증)** | `putMemberPermissions`(`TeamPermissions.php:615-661`) — menus는 `assignableMap` clamp(`:627-646`)하나 scope는 `replaceScope` 직접 기록(`:649,653`), manager 본인 범위 비교 없음(DUPLICATE_AUDIT D-5) |
| `version`/`priority`/`effective_time`/`expiration` | **ABSENT** | data_scope에 버전·우선순위·유효기간 컬럼 없음(`updated_at`만 존재·EXISTING_IMPLEMENTATION §1) |
| seed에 의한 대량 Assignment(위험 지점) | **PRESENT** | `ORG_PRESET`(`TeamPermissions.php:706-722`) — 재무팀 프리셋 `scope='company'` idempotent 재실행 시 승인 없이 전원 즉시 적용(DUPLICATE_AUDIT D-5) |

★현행 `data_scope`는 "누구에게 어떤 scope를 부여했는가"를 저장하는 점에서 Scope Assignment의 **저장 substrate**로 근접하나, Part 3-3 Role Assignment와의 명시적 연결·버전·우선순위·유효기간이 없다. 특히 manager에 의한 부여 시 상한 검증이 미구현 상태(실결함)라는 점이 Assignment 설계의 최우선 Gap이다.

## 5. 설계 원칙

1. **Role Assignment와 명시 결합** — Scope Assignment는 Part 3-3 Role Assignment 레코드를 참조(FK)해야 하며, data_scope의 암묵적 subject 연결을 명시적 Assignment 레코드로 승격.
2. **Scope Expansion Guard 필수 결합(★최우선)** — manager가 위임 시 본인 scope 범위를 초과하는 Assignment 생성을 차단(DUPLICATE_AUDIT D-5 실결함 해소 대상). 이번 차수 수정 안 함(설계 등재만).
3. **Effective Time/Expiration 신설** — 현행 `updated_at`만으로는 "언제부터 언제까지 유효한 scope인가"를 표현 불가 — Assignment에 명시 필드 추가(설계).
4. **seed 부여도 Assignment로 취급** — `ORG_PRESET`을 통한 일괄 부여도 개별 승인 없는 대량 Assignment로 간주, 승인 Hook 설계 대상(DUPLICATE_AUDIT D-5).
5. **Golden Rule** — data_scope 저장 구조를 재구현하지 않고 Assignment 레이어로 감싸 Role Assignment와 연결.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Scope Assignment의 핵심 목적(Role Assignment와 연결)은 Part 3-3 Role Assignment가 아직 설계 단계(코드 0)라 결합 불가 — 구조적 BLOCKED.
- **Gap-1(ABSENT)**: role_assignment_id 참조·version·priority·effective_time·expiration 전무 — 순신설.
- **Gap-2(★실결함, 별도 fix 트랙)**: manager scope 위임상한 미구현(권한상승) — `TeamPermissions.php:648-653`. 이번 차수 수정 안 함(DUPLICATE_AUDIT D-5).
- **Gap-3(승인 없는 대량 부여)**: `ORG_PRESET` seed(`:706-722`)가 재무팀에 `company`(무제한) scope를 idempotent 재실행마다 승인 없이 적용 — Assignment 설계 시 seed도 승인 대상으로 포함 필요.
- **정직 부재**: priority/effective_time/expiration 대응 실코드 ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).
