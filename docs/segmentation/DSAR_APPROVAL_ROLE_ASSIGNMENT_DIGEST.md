# DSAR — Approval Role Assignment Digest (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Digest · 스펙 §28)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version/Snapshot(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변(Digest는 Snapshot의 무결성 지문) · Cache는 Version 기반 · Simulation은 실제 변경 없음 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §28 Assignment Digest = Subject · Role Version · Scope · Permission Projection · Approval · Validity · Snapshot 결합의 **해시/직렬화 요약값**. §26 Snapshot의 무결성 지문 역할을 하며, §29 Drift(previous digest vs current digest)와 §31 Reconciliation(Digest 축 비교)의 입력이 된다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | digest id | Digest PK |
| 2 | assignment id / assignment version id | 대상 Assignment/Version |
| 3 | subject | 스펙 §28 원문 |
| 4 | role version | 스펙 §28 원문 |
| 5 | scope | 스펙 §28 원문 |
| 6 | permission projection | 스펙 §28 원문 |
| 7 | approval | 스펙 §28 원문(§9 Approval Reference 결합) |
| 8 | validity | 스펙 §28 원문(§19 Assignment Validity — Effective From/To) |
| 9 | snapshot reference | 스펙 §28 원문(§26 결합) |
| 10 | digest hash / algorithm | 해시값·알고리즘 |
| 11 | computed at | 산출 시각 |

## 3. 열거형 / 타입

스펙 §28 원문에는 전용 열거형이 없다. Digest는 §26 Snapshot·§6 Version에 결합하는 해시 산출물이며, Version Type(§6)마다 재계산된다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Digest 산출 대상(Assignment Version/Snapshot) 전체 | — | — | **ABSENT** |
| 근접(해시체인·비-assignment) | `SecurityAudit::verify`(GENESIS부터 순차 해시 재계산·검증) | `SecurityAudit.php:56-68` | ★유일 실 tamper-evident 체인이나 role assignment 이벤트 미기록(ADR §1) — digest 계산 방식의 참조 패턴일 뿐 대체물 아님 |
| 반례(해시는 있으나 신뢰불가) | `menu_audit_log` hash_chain(★`verify()` 없음) | (EXISTING_IMPLEMENTATION §7 인용 — `AdminMenu.php` 계열) | "해시가 있다고 tamper-evident는 아니다"의 반례로만 인용([[reference_menu_audit_log_not_tamper_evident]]) |

## 5. 설계 원칙

- Digest는 Snapshot(§26)의 무결성 지문 — Snapshot 없이 Digest 계산 불가(선행 의존).
- `SecurityAudit`의 해시체인 알고리즘(순차 해시+GENESIS+verify)은 Digest 계산 방식의 참조 패턴으로만 재사용하고, role assignment 도메인으로 오흡수하지 않는다(ADR §D-1의 승격 결정은 "이벤트 기록"이지 본 편의 오흡수가 아니다).
- `menu_audit_log`의 hash_chain은 verify가 없어 "해시 필드 존재 ≠ tamper-evident"라는 반례로만 인용한다(재플래그 금지 — [[reference_menu_audit_log_not_tamper_evident]], 289차 정정 유지).

## 6. Gap / BLOCKED_PREREQUISITE

- Assignment Version/Snapshot ABSENT → Digest 산출 대상 없음.
- `SecurityAudit`의 assignment 이벤트 미기록 → 실 tamper-evident digest 검증 체인 부재.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
