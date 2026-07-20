# DSAR — Approval Scope Reconciliation (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Reconciliation · 스펙 §34)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §34 Scope Reconciliation = **Snapshot · Runtime · Assignment · Policy** 4개 상태를 상호 비교해 불일치를 찾아내는 절차. ★반드시 구분: 코드베이스에 이미 존재하는 "reconciliation" 명칭 로직(PgSettlement/ROAS/BillingMethod/Wms stock/KrChannel)은 **금융·재고 정합** 목적이며 scope와 무관하다(DUPLICATE_AUDIT §2 "중복이 아닌 것" — reconciliation 매치는 scope 무관·반날조 경계).

- **순신규**: 비교 대상 4개 중 Snapshot(§35)·Assignment Version이 전부 ABSENT이므로 비교 자체가 성립하지 않는다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation id | Reconciliation PK |
| 2 | scope id | 대상 Scope |
| 3 | compared pair | Snapshot↔Runtime / Snapshot↔Assignment / Runtime↔Policy 등 |
| 4 | snapshot digest | 비교 기준 다이제스트(§37) |
| 5 | runtime digest | 재계산 다이제스트(§37) |
| 6 | mismatch found | 불일치 발견 여부 |
| 7 | mismatch detail | 불일치 상세 |
| 8 | severity | 심각도 |
| 9 | resolved | 해소 여부 |
| 10 | resolved at | 해소 시각 |
| 11 | status | Reconciliation 상태 |
| 12 | evidence | 근거(§36 참조) |

## 3. 열거형 / 타입

**비교 대상**(스펙 §34 원문): `SNAPSHOT` · `RUNTIME` · `ASSIGNMENT` · `POLICY`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 비교 대상 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| SNAPSHOT | — | — | **ABSENT** — Scope Snapshot 자체 순신규(§35 DSAR 파일 참조) |
| RUNTIME(근접) | effectiveScope 라이브 재계산(매 요청 SELECT) | `TeamPermissions.php:236-265` | 근접(runtime 상태 산출 자체는 실재) — 비교할 저장된 Snapshot이 없어 "runtime vs snapshot" 비교가 구조적으로 불가능 |
| ASSIGNMENT(근접) | data_scope 테이블(UNIQUE tenant+subject_type+subject_id) | `TeamPermissions.php:160-166` | 근접(현재 배정 상태 저장은 실재)이나 Version 없이 최신 1개 행만 유지되어 이전 버전 대비 비교 대상이 소실됨 |
| POLICY(명시적 배제 대상) | reconciliation 매치=PgSettlement/ROAS 등 금융·재고 정합 | — | scope 무관(DUPLICATE_AUDIT §2) — Scope Reconciliation과 혼동 금지(반날조 경계) |

## 5. 설계 원칙

- 코드베이스의 기존 "reconciliation" 명칭(PgSettlement/ROAS/BillingMethod/Wms stock/KrChannel)은 전부 금융·재고 정합 목적이며, Scope Reconciliation과 이름만 같을 뿐 대상·목적이 다르다 — 신설 시 명칭 혼동으로 인한 오흡수·오통합 금지(ADR §6 규율).
- Reconciliation은 4개 상태(Snapshot/Runtime/Assignment/Policy) 중 최소 2개 이상이 독립적으로 영속되어야 "비교"가 성립한다. 현재는 Runtime(라이브 재계산)과 Assignment(최신 1개 행)만 존재하고 둘 다 "현재값"이라 이력 비교가 불가능 — Snapshot·Policy Version 신설이 최우선 선행.
- POLICY 비교 대상을 기존 금융 reconciliation과 병합하면 scope 위반 탐지가 금융 정합 로직에 묻혀 은폐될 위험 — 반드시 독립 Scope Reconciliation 엔티티로 분리.

## 6. Gap / BLOCKED_PREREQUISITE

- SNAPSHOT 비교 대상 = §35 Scope Snapshot 선행 신설 필수.
- POLICY 비교 대상 = 기존 금융 reconciliation과 혼동 금지·별도 Scope Policy Version 신설 필요.
- RUNTIME/ASSIGNMENT = substrate 실재하나 이력(버전) 부재로 비교 불능.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
