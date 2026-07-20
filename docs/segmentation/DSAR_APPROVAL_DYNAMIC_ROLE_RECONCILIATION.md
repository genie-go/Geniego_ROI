# DSAR — Approval Dynamic Role Reconciliation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Reconciliation · 스펙 §26)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine·참조 편 Snapshot/Projection 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · Reconciliation은 비교만 수행(자동 수정 금지) · 마케팅 정산/귀속 reconciliation 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §26(Reconciliation) = "Rule · Runtime · Snapshot · Projection 비교" — 4개 상태 소스 간 불일치를 정형 비교·보고하는 절차. §24 Drift(사후 탐지)·§25 Revalidation(트리거 재평가)과 별개로, Reconciliation은 4소스 상호 비교에 특화된다.

- **순신규 총평**: 비교 4소스 중 3개(Rule/Snapshot/Projection)가 완전 ABSENT — 비교 대상 자체가 성립하지 않음. Runtime 소스만 "정적 값 재조회" 형태로 근접.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation id | Reconciliation PK |
| 2 | rule state ref | Rule(§20) 현재 상태 |
| 3 | runtime state ref | Runtime Role(§1 목록4) 현재 상태 |
| 4 | snapshot state ref | 참조 편 Snapshot 참조 |
| 5 | projection state ref | §21 Dynamic Projection 참조 |
| 6 | mismatch found | 불일치 여부 |
| 7 | mismatch detail | 불일치 상세 |
| 8 | reconciled at | 비교 실행 시각 |
| 9 | status | Reconciliation 상태 |

## 3. 열거형 (비교 소스 — 스펙 §26 원문 그대로)

`Rule` · `Runtime` · `Snapshot` · `Projection`

## 4. 실 substrate 매핑 (ABSENT/근접)

| 비교 소스 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Rule | RBAC Rule Engine 자체 ABSENT | — | **ABSENT** |
| Runtime(근접) | `authedUser`/`authedTenant`(정적 team_role/plan 반환, context로부터 role 재계산 안 함) | *(EXISTING_IMPLEMENTATION §5 원문 인용 — 해당 문서에 구체 file:line 미기재)* | 근접(runtime 조회 지점 자체는 실재)이나 "Dynamic Role Runtime 상태"가 아니라 정적 스냅샷 값 반환 — 비교 대상 성격이 다름 |
| Snapshot | 참조 편 `DSAR_APPROVAL_DYNAMIC_ROLE_SNAPSHOT` ABSENT | — | **ABSENT** |
| Projection | Dynamic Permission/Scope/Constraint Projection ABSENT | — | **ABSENT** |

★비교 4소스 중 3개(Rule/Snapshot/Projection)가 완전 ABSENT이므로 Reconciliation 자체가 성립 불가(비교 대상 없음) — 4소스 전부가 먼저 신설되어야 한다(다중 BLOCKED_PREREQUISITE).

★마케팅 reconciliation(결제 정산 대사·ROAS/귀속 정산 재계산 등)은 본 편이 정의하는 Rule/Runtime/Snapshot/Projection RBAC Reconciliation과 명명만 유사·대상 도메인(결제/광고 정산) 전혀 다름 — **KEEP_SEPARATE**(ADR D-4 동형 논리 적용).

## 5. 설계 원칙

- Reconciliation은 §24 Drift·§25 Revalidation과 목적이 다르다: Drift=변화 탐지, Revalidation=트리거 재평가, Reconciliation=**소스 간 정합성 비교**(사전예방적 감사). 세 개념을 하나로 뭉뚱그려 중복 구현하지 않는다.
- Runtime 소스는 유일하게 근접 substrate(`authedUser`/`authedTenant`)가 있으나 이는 "정적 값 재조회"이지 "Dynamic Runtime Role 상태"가 아니므로, Reconciliation 신설 전 Runtime Role(§1 목록4) 자체 신설이 선행되어야 한다.
- 마케팅 정산/ROAS reconciliation 로직을 RBAC Reconciliation으로 오흡수 금지 — 별도 도메인 유지.

## 6. Gap / BLOCKED_PREREQUISITE

- Rule/Snapshot/Projection 소스 = 완전 ABSENT.
- Runtime 소스 = 근접 substrate 존재하나 "정적 값"이지 Dynamic Runtime 상태 아님(성격 불일치).
- 마케팅 정산/ROAS reconciliation = KEEP_SEPARATE — RBAC Reconciliation으로 오흡수 금지.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine·참조 편 Snapshot·§21 Projection 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
