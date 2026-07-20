# DSAR — Approval Role Assignment Revalidation (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Revalidation · 스펙 §30)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Simulation은 실제 변경 없음 · Assignment≠즉시 direct write(ADR §D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §30 Assignment Revalidation은 Role 변경·Permission 변경·Organization 변경·Membership 변경·Policy 변경·Incident·Audit Finding을 트리거로 기존 Assignment의 유효성을 재검증하는 절차다. Revalidation은 새 Assignment Version을 생성하며(§6 Version Type과 결합), Drift(§29)가 관측만 하는 반면 Revalidation은 실제 재판정·Version 갱신을 수행한다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation id | Revalidation PK |
| 2 | assignment id | 대상 Assignment |
| 3 | trigger type | 아래 §3 열거형 |
| 4 | triggered at | 트리거 발생 시각 |
| 5 | triggered by | 트리거 유발 이벤트/Incident/Audit Finding 참조 |
| 6 | previous assignment version id | 재검증 전 Version |
| 7 | new assignment version id | 재검증 결과 생성되는 신규 Version(§6 Version Type 결합) |
| 8 | result | approved/revoked/modified/no-change |
| 9 | reviewer | 재검증 수행 주체 |
| 10 | evidence | 근거(§27 참조) |
| 11 | status | Revalidation 상태 |

## 3. 열거형 (Trigger — 스펙 §30 원문 그대로)

`ROLE_CHANGE` · `PERMISSION_CHANGE` · `ORGANIZATION_CHANGE` · `MEMBERSHIP_CHANGE` · `POLICY_CHANGE` · `INCIDENT` · `AUDIT_FINDING`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Trigger | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Revalidation 절차/결과 저장 구조체 전체 | — | — | **ABSENT** |
| ROLE_CHANGE(근접) | `updateTeamMember` UPDATE team_role | `UserAuth.php:1392` | 변경 자체는 실재하나 "이 변경이 다른 곳의 기존 Assignment를 재검증해야 한다"는 트리거→반응 연결 없음(변경=즉시 유일한 상태) |
| ORGANIZATION_CHANGE / MEMBERSHIP_CHANGE(근접) | `deleteTeamMember` is_active=0 | `UserAuth.php:1445` | 근접이나 재검증이 아닌 즉시 소프트삭제(role값 자체는 불변) |
| AUDIT_FINDING(근접) | `SecurityAudit::verify`(broken_at 반환) | `SecurityAudit.php:56-68` | 감사상 이상탐지에 해당하나 role assignment 미기록이라 트리거로 연결 불가 |
| INCIDENT | break-glass(`GENIE_BREAKGLASS_*`·MFA 우회) | `UserAuth.php:790-801,929-935,995-999` | break-glass는 인증우회 이벤트이지 Revalidation Trigger 아님(ADR §D-5 — 오흡수 금지) |
| POLICY_CHANGE | — | — | **ABSENT** — 승인/정책 workflow 자체 부재 |

## 5. 설계 원칙

- Revalidation은 새 Assignment Version을 생성하는 절차(§6 Version Type "Correction" 등과 결합 가능) — in-place 수정이 아니다.
- Trigger는 "이벤트 발생"과 "재검증 절차 수행" 사이를 명시적으로 연결하는 것이 핵심 설계 목표다. 현재 실재하는 변경 이벤트(team_role UPDATE 등)는 트리거 후보일 뿐, 그 자체가 재검증을 수행하지 않는다 — 연결 고리 자체가 순신규.
- break-glass·impersonation을 INCIDENT/AUDIT_FINDING 트리거로 오흡수하지 않는다(ADR 경계 보존 규율 — break-glass≠role 부여, impersonation≠role 발급).

## 6. Gap / BLOCKED_PREREQUISITE

- Revalidation 절차/결과 저장 구조체 = **ABSENT**.
- 각 Trigger의 "이벤트→재검증" 연결 고리 = 순신규(이벤트 자체는 일부 실재하나 연결 없음).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
