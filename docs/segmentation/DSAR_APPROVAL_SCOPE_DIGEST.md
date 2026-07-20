# DSAR — Approval Scope Digest (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Digest · 스펙 §37)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §37 Scope Digest = **Scope · Assignment · Version · Policy · Projection** 5종 상태를 해시/다이제스트로 압축해 §32 Drift·§34 Reconciliation의 비교 연산을 경량화하는 엔티티. 완전한 상태 전체를 매번 비교하지 않고 digest만 비교하는 최적화 계층.

- **순신규**: digest 계산·저장 grep 0 전항목(EXISTING_IMPLEMENTATION §9 "digest ... grep 0 전항목"). 5종 모두 ABSENT.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | digest id | Digest PK |
| 2 | subject id | 대상 Subject |
| 3 | digest type | 아래 §3 열거형 |
| 4 | digest value | 해시값 |
| 5 | source version id | 원본 Version |
| 6 | computed at | 산출 시각 |
| 7 | algorithm | 해시 알고리즘 |
| 8 | status | Digest 상태 |

## 3. 열거형 / 타입

**Digest Type**(스펙 §37 원문): `SCOPE` · `ASSIGNMENT` · `VERSION` · `POLICY` · `PROJECTION`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Digest Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| SCOPE | — | — | **ABSENT** — grep 0(EXISTING_IMPLEMENTATION §9) |
| ASSIGNMENT(근접) | data_scope 현재값(UNIQUE 1행) — 해시 없이 원본 그대로 저장 | `TeamPermissions.php:160-166` | 근접(비교 대상 원본은 실재)이나 이를 다이제스트로 압축하는 로직 없음 — 비교 필요 시 원본 행 전체를 매번 재조회 |
| VERSION | — | — | **ABSENT** — Scope Version 자체 코드 0(ADR §D-4) |
| POLICY(근접) | HIGH_VALUE_KRW 단일 상수 | `Catalog.php:1036` | 근접(policy 값 자체는 원자적이라 별도 다이제스트 없이도 직접 비교 가능한 수준)이나 다단계 정책으로 확장 시(ADR D-1 AMOUNT_SCOPE 확장 결정) digest 필요성 발생 — 현재는 미신설 |
| PROJECTION | — | — | **ABSENT** — Projection 자체 순신규(ADR §D-4) |

## 5. 설계 원칙

- Digest는 §32 Drift·§34 Reconciliation의 성능 전제조건이지 정합성 요건이 아니다 — Digest 없이도 원본 비교로 Drift/Reconciliation은 설계상 가능하나, 저장 규모가 커지면 필수가 된다.
- ASSIGNMENT digest 신설 시 원본(data_scope 현재값)과 별도로 유지하며, 원본이 UNIQUE 제약으로 1행만 갖는 현재 구조(§35 Snapshot DSAR 파일 참조)에서는 "이전 digest"를 비교할 대상 자체가 없다는 점을 §35 Snapshot 신설과 함께 해결해야 한다.
- 순서: Snapshot(§35) → Digest(§37, 이 Snapshot의 압축본) → Drift/Reconciliation(§32/§34, digest 비교로 경량화) 순으로 의존한다.

## 6. Gap / BLOCKED_PREREQUISITE

- SCOPE/VERSION/PROJECTION digest = 완전 ABSENT(선행 substrate 없음).
- ASSIGNMENT/POLICY digest = 근접 원본 substrate 존재하나 압축·해시 계층 ABSENT.
- §35 Snapshot 선행 신설이 없으면 Digest가 압축할 대상이 없다(이중 BLOCKED_PREREQUISITE).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
