# DSAR — Approval Role Assignment Evidence (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Evidence · 스펙 §27)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Approval workflow(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Simulation은 실제 변경 없음 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT) · 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지

---

## 1. 목적

스펙 §27 Assignment Evidence는 Assignment 결정(승인·거부·긴급·변경)의 근거를 **Approval · Review · Business Reason · Incident · Snapshot · Audit** 6종으로 결합 보존하는 엔티티다. Assignment Request(§10)의 Business Reason·Evidence 필드, Emergency Assignment(§12)의 Mandatory Evidence, Break Glass(§13)의 Evidence 요구와 직결된다. ADR §D-1은 `auth_audit_log`를 "PARTIAL(승격)" — SecurityAudit tamper-evident 체인으로 승격해 assignment 이벤트를 기록해야 한다고 결정한다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence id | Evidence PK |
| 2 | assignment id / assignment version id | 대상 Assignment/Version |
| 3 | evidence type | 아래 §3 열거형 |
| 4 | approval reference | §9 Approval Reference |
| 5 | review reference | 검토 근거 참조 |
| 6 | business reason | 스펙 §27·§10 원문 |
| 7 | incident reference | §12 Incident Reference |
| 8 | snapshot reference | §26 참조 |
| 9 | audit reference | 감사 이벤트 참조 |
| 10 | recorded at | 기록 시각 |
| 11 | recorded by | 기록 주체 |

## 3. 열거형 / 타입

**Evidence Type**(스펙 §27 원문 그대로): `APPROVAL` · `REVIEW` · `BUSINESS_REASON` · `INCIDENT` · `SNAPSHOT` · `AUDIT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Evidence 결합 구조체 전체 | — | — | **ABSENT** |
| AUDIT(근접·mutable) | `auth_audit_log` append-only detail 문자열 | `UserAuth.php:4165,4174-4197` | 근접이나 구조화 diff 아닌 문자열·해시체인/verify 없음(mutable·EXISTING_IMPLEMENTATION §7) |
| AUDIT(tamper-evident이나 미적용) | `SecurityAudit::verify`(GENESIS·broken_at 해시체인 재계산) | `SecurityAudit.php:56-68` | ★유일 실 tamper-evident 체인이나 role assignment 이벤트 미기록(TeamPermissions에 SecurityAudit 문자열 0·ADR §1) — 승격 대상(ADR §D-1) |
| BUSINESS_REASON / INCIDENT / REVIEW / APPROVAL | — | — | **ABSENT** — 승인 workflow 자체 부재(`pending_approval`/`approveQueue` 매치는 전부 캠페인/가격 도메인·EXISTING_IMPLEMENTATION §3) |
| SNAPSHOT(결합 참조) | — | — | **ABSENT**(본 wave §26 결과와 동일) |

## 5. 설계 원칙

- Evidence는 6종 결합 — 단일 audit row가 아니라 Approval/Review/Business Reason/Incident/Snapshot/Audit을 각각 참조로 묶는 구조.
- 실 무결성 확보는 `SecurityAudit::verify` 체인 승격을 통해서만 이루어진다(ADR §D-1 "auth_audit_log → PARTIAL(승격)"). `auth_audit_log`를 그대로 Evidence의 무결성 근거로 인용하지 않는다(mutable이므로).
- Emergency Assignment(§12)의 Mandatory Evidence·Mandatory Audit·Mandatory Review는 본 Evidence 구조의 필수 결합 사례이며, break-glass(인증우회·`UserAuth.php:790-801,929-935,995-999`)와는 별개 개념이다(ADR §D-5 — break-glass≠role 부여, 오흡수 금지).
- 289차 폐기된 `admin_roles`/`user_roles`(assignRole/revokeRole API)를 Evidence 로그 소스로 재부활하지 않는다(인가 미소비 장식 전례).

## 6. Gap / BLOCKED_PREREQUISITE

- Approval/Review workflow 자체 ABSENT(EXISTING_IMPLEMENTATION §3) → APPROVAL/REVIEW evidence type의 실 근거 없음.
- `SecurityAudit` 승격(assignment 이벤트 기록) = 실 엔진 선행조건.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
