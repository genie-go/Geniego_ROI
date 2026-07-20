# DSAR — Approval Dynamic Role Snapshot (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Snapshot · 스펙 §1(17)·§2·§36)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변(스펙 §1 목록 17번·§36 Completion Gate 명문) · UNKNOWN Permit 금지(ADR D-2) · 마케팅 automation 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §1(구현범위 17번: Dynamic Role Snapshot)·§2(Canonical Entity: `APPROVAL_DYNAMIC_ROLE_SNAPSHOT`) = Runtime Role/Session Role/Rule Evaluation/Policy Decision의 순간 상태를 특정 시점에 불변으로 고정·영속하는 엔티티. §36 Completion Gate가 "Snapshot 구축"을 완료조건 항목으로 명문화 — §26 Reconciliation·Evidence·§33 Digest Validation이 모두 이 Snapshot을 원재료로 삼는다.

- **순신규 총평**: Dynamic/Runtime/Session/Conditional Role 자체가 grep 0(EXISTING_IMPLEMENTATION §1) → 스냅샷할 대상 상태 자체가 없음. 근접 substrate로 SecurityAudit 불변감사(단 role 파라미터 없음)만 실재.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | snapshot id | Snapshot PK |
| 2 | subject id / session id | 대상 user/session |
| 3 | snapshot type | §3 열거형 |
| 4 | rule version id / policy version id | 스냅샷 기준 Version |
| 5 | payload(activated roles / decision) | 계산된 값 |
| 6 | digest | §33 Digest Validation 연동 |
| 7 | taken at | 촬영 시각 |
| 8 | taken by / trigger | 촬영 주체/트리거(§10 Activation Trigger 재사용) |
| 9 | immutable | 항상 true |
| 10 | status | Snapshot 상태 |

## 3. 열거형 / 타입

스펙 원문에 Snapshot Type 전용 열거형은 없음(§2 Canonical Entity 목록에 엔티티명만 존재) — §2 Canonical Entity 구성(RUNTIME/SESSION/POLICY/EVALUATION/PROJECTION)에서 설계 도출: `RUNTIME_ROLE_SNAPSHOT` · `SESSION_ROLE_SNAPSHOT` · `POLICY_DECISION_SNAPSHOT` · `PROJECTION_SNAPSHOT`(스펙 미확정 · 본 편 제안 — 스펙 원문과 혼동 금지).

## 4. 실 substrate 매핑 (ABSENT/근접)

| Snapshot Type(제안) | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| POLICY_DECISION_SNAPSHOT(근접) | break-glass 우회 시 `auth.breakglass` 불변감사(SecurityAudit 기록) | `UserAuth.php:995-999` | 근접(불변 기록 자체는 실재)이나 SecurityAudit 호출에 role/rule/policy decision 파라미터 없음(ADR D-1 표) — Policy Decision을 스냅샷하는 것이 아니라 단일 이벤트 로그 |
| RUNTIME_ROLE_SNAPSHOT | Dynamic/Runtime Role 자체 ABSENT | — | **ABSENT** — 스냅샷 대상 자체가 없음(EXISTING_IMPLEMENTATION §1) |
| SESSION_ROLE_SNAPSHOT(근접) | `user_session`(created_at/last_seen)·`recordSessionMeta` | `Db.php:1111-1119`·`UserAuth.php:4237,4243-4251` | 근접(세션 메타 저장은 실재)이나 Session Role(§12) 개념 자체 ABSENT·저장값도 mutable(최신 덮어쓰기 — "촬영 후 불변" 아님) |
| PROJECTION_SNAPSHOT | 없음 | — | **ABSENT** — Dynamic Permission/Scope/Constraint Projection 자체 ABSENT(ADR §3) |

## 5. 설계 원칙

- Snapshot은 촬영 후 불변이어야 한다(§1 목록17·§36 명문) — `recordSessionMeta`(`UserAuth.php:4243-4251`)는 세션 메타를 갱신형으로 기록하므로 Snapshot과 정반대 패턴. Snapshot 신설 시 이 갱신 로직을 대체하지 않고 "촬영 시점 고정" 레이어를 앞단에 추가한다(Extend 원칙).
- SecurityAudit 불변감사(`UserAuth.php:995-999`)는 Policy Decision Snapshot의 유일하게 실재하는 "불변 기록" 패턴이나, role/rule/policy 파라미터가 없어 그대로 확장 불가 — Canonical 필드(§2)를 갖춘 신규 스냅샷 구조가 필요.
- Digest(§33 Digest Validation)는 Snapshot payload의 무결성 검증 축으로 결합(별도 편 `DSAR_APPROVAL_DYNAMIC_ROLE_DIGEST`와 연동 설계).

## 6. Gap / BLOCKED_PREREQUISITE

- RUNTIME_ROLE_SNAPSHOT/PROJECTION_SNAPSHOT = 완전 ABSENT(선행 substrate 자체 없음).
- POLICY_DECISION_SNAPSHOT/SESSION_ROLE_SNAPSHOT = 근접 substrate 존재하나 스냅샷 구조(payload/digest/immutable) ABSENT.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
