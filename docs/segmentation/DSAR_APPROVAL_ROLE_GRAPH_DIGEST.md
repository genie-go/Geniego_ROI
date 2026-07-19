# DSAR — Role Graph Digest (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §54)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Graph Digest = Role Graph의 특정 Version 전체 상태를 하나의 Canonical Digest 값으로 축약해, **저장 순서가 비결정적이어도 동일 상태면 항상 동일 Digest**를 산출하는 무결성 메커니즘(스펙 §54). Role Graph Snapshot(§50)·Composite Role Snapshot(§51)·Role Graph Evidence(§52)의 `immutable digest`/`graph digest` 필드, Cache Key(§56)의 `graph digest` 요소, Role Hierarchy Drift(§58)·Composite Role Drift(§59)의 `previous digest`/`current digest` 비교 기반이 전부 본 편의 산출물을 참조한다.

- **순신규**: Role Graph 자체가 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §4)이므로 Digest Input 좌표축 전체가 존재하지 않는다.

## 2. Canonical 필드 (Digest Input)

Digest Input(스펙 §54 원문 그대로): tenant id · graph id · graph version · hierarchy versions · composite versions · sorted node identifiers · role version identifiers · sorted edge identifiers · edge types · propagation policies · scope policies · deny policies · actor policies · validity policies · conflict policies · root roles · maximum depth · closure digest · path digest · lifecycle status.

| # | Digest Input 요소 | 의미 |
|---|---|---|
| 1 | tenant id | 테넌트 격리 경계 |
| 2 | graph id | Role Graph 식별자 |
| 3 | graph version | Graph Version |
| 4 | hierarchy versions | 관여 Hierarchy Version들 |
| 5 | composite versions | 관여 Composite Version들 |
| 6 | sorted node identifiers | 정렬된 Node 식별자 목록 |
| 7 | role version identifiers | Role Version 식별자 목록 |
| 8 | sorted edge identifiers | 정렬된 Edge 식별자 목록 |
| 9 | edge types | Edge Type 집합 |
| 10 | propagation policies | 전파 정책 집합 |
| 11 | scope policies | Scope 정책 집합 |
| 12 | deny policies | Deny 정책 집합 |
| 13 | actor policies | Actor 정책 집합 |
| 14 | validity policies | 유효성 정책 집합 |
| 15 | conflict policies | Conflict 정책 집합 |
| 16 | root roles | Graph의 Root Role들 |
| 17 | maximum depth | 최대 깊이 |
| 18 | closure digest | Transitive Closure Digest |
| 19 | path digest | Path Digest(§53 결과 집계) |
| 20 | lifecycle status | Graph Version 생명주기 상태 |

## 3. 열거형 / 타입

- **Canonical Sorting 규칙**: Node·Edge 식별자를 정렬(Sorted) 후 Digest 산출 — "Node·Edge 순서가 비결정적이어도 Canonical Sorting 적용"(스펙 §54 원문). 구체 정렬 키·알고리즘명은 스펙·ADR 원문에 미제시 → **설계 예약(미확정)**.
- **digest_algorithm**: 해시 함수 종류 — 스펙 §54 원문에 알고리즘명 명시 없음 → **ABSENT(미확정)**.

## 4. 실 substrate 매핑 (§5.2)

전부 **ABSENT**. ADR·전수조사 2문서 어디에도 "Canonical Sorting 기반 상태 Digest 산출 로직"의 `file:line` 인용이 없다(반날조 원칙상 인용 불가).

| Digest 요소 | 실존 substrate 검토 | 판정 |
|---|---|---|
| append-only 해시체인(근접했으나 무관) | `menu_audit_log` hash_chain(`AdminMenu.php:123-131`) | **인용 불가** — 이는 §52 Role Graph Evidence 참조표에 등재된 append 전용 해시체인(그마저 tamper-evident 아님·verify 0)이며, "여러 필드를 Canonical Sorting해 하나의 상태 Digest로 축약"하는 §54의 메커니즘과 구조적으로 다르다. §54 substrate로 오인용 금지. |
| graph id / version / node / edge / policy 집합 | — | **ABSENT** — Role Graph 자체 순신규 |
| closure digest / path digest | — | **ABSENT** — §53 Path Evidence·Transitive Closure 자체 순신규 |

## 5. 설계 원칙

- **결정론적 산출**: 동일 Graph 상태(Input 20요소 동일)면 저장 순서·삽입 순서와 무관하게 항상 동일 Digest(스펙 §54).
- **Historical Immutability**(§6.15): 과거 Graph Version의 Digest는 재계산해도 값이 불변해야 한다(그 시점 Input이 고정이므로) — In-place Update로 과거 Digest를 바꾸는 구현 금지.
- **Drift 판정의 유일한 비교 기반**: §58/§59 Drift의 `previous_digest`/`current_digest`는 본 편 산출 결과만 사용 — Digest 우회 임시 비교 로직(예: 필드별 개별 diff) 병행 신설 금지(중복 방지).
- **Tenant 격리 절대**: `tenant id`를 Digest Input 최상위에 포함 — 교차 테넌트 Digest 충돌·재사용 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph/Hierarchy/Composite Version/Node/Edge/Closure/Path = **전부 ABSENT** → Digest Input 자체가 순신규.
- 해시 알고리즘·Canonical Sorting 구체 규칙 = 이번 차수 **미확정**(설계 예약).
- Digest 산출 결과를 소비하는 Snapshot(§50/§51)·Evidence(§52)·Cache Key(§56)·Drift(§58/§59)가 전부 코드 0 → 소비처 부재로 실사용 불가.
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
