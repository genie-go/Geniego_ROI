# DSAR — Approval Dynamic Role Simulation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Simulation · 스펙 §27)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine·§21 Dynamic Projection 실 구현 부재
- **불변**: Simulation 무변경(applied 항상 false) · UNKNOWN Permit 금지(ADR D-2) · 마케팅 automation 시뮬레이션 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §27(Simulation) = "Rule/Attribute/Context/Policy 변경. 영향 분석: Activated Roles · Removed Roles · Permission 변화 · Scope 변화" — 변경을 실제 적용하지 않고(무변경) 영향만 산출하는 what-if 절차.

- **순신규 총평**: 영향 분석 대상인 Rule Engine·Dynamic Role Registry·Dynamic Projection이 전부 ABSENT(EXISTING_IMPLEMENTATION §2, ADR §3) → 시뮬레이션할 "역할 활성화 로직" 자체가 없음. FE `PolicyTreeEditor.jsx`는 마케팅 도메인 조건트리로 오인 금지 대상.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | simulation id | Simulation PK |
| 2 | change type | §3 열거형(스펙 §27 원문) |
| 3 | proposed change payload | 제안된 변경 내용 |
| 4 | activated roles | 영향 분석 결과 |
| 5 | removed roles | 영향 분석 결과 |
| 6 | permission delta | 영향 분석 결과 |
| 7 | scope delta | 영향 분석 결과 |
| 8 | applied | 항상 false(무변경) |
| 9 | simulated by | 실행 주체 |
| 10 | simulated at | 실행 시각 |

## 3. 열거형 (Change Type — 스펙 §27 원문 그대로)

`Rule 변경` · `Attribute 변경` · `Context 변경` · `Policy 변경`

## 4. 실 substrate 매핑 (ABSENT/근접)

| Change Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Rule 변경 | RBAC Rule Engine 자체 ABSENT(FE `PolicyTreeEditor.jsx`는 마케팅 roas 조건트리·미배선) | `PolicyTreeEditor.jsx:1-24` | **ABSENT** — RBAC Rule 자체 없음. FE PolicyTreeEditor는 마케팅 도메인 KEEP_SEPARATE(오흡수 금지) |
| Attribute 변경(근접) | data_scope·MFA 필드 실재(§4 Attribute Source) | `TeamPermissions.php:236-322`·`UserAuth.php:3525,946,960` | 근접(속성값 자체는 실재)이나 "변경 시뮬레이션→영향 분석" 로직 grep 0 |
| Context 변경(근접) | Runtime Context 기록용(§5) | `Db.php:1111-1119`·`UserAuth.php:4237,4243-4281` | 근접(context 데이터 실재)이나 시뮬레이션 대상 아님(role 결정 미연결) |
| Policy 변경(근접) | 정적 rank 4곳(무통합) | `TeamPermissions.php:236-322,366-394`·`index.php:572-598,82-89`·`PlanPolicy.php:19-22`·`AdminMenu.php:337-356` | 근접(정책값 자체는 실재)이나 변경 전/후 영향 분석(Activated/Removed Roles) 로직 grep 0 |

★마케팅 simulation(가격 최적화·성장 지표 시뮬레이션 등)은 본 편이 정의하는 Rule/Attribute/Context/Policy RBAC Simulation과 명명만 유사·대상 도메인(가격/성장 지표) 전혀 다름 — **KEEP_SEPARATE**(ADR D-4 동형 논리 적용).

## 5. 설계 원칙

- Simulation은 §36 Completion Gate에 명시된 필수 구축 대상 중 하나 — "적용 없이 영향만 계산"이 핵심 불변(applied 필드는 항상 false). 실 Rule/Policy 변경 로직과 물리적으로 분리된 read-only 경로로 설계(무후퇴·안전).
- Activated Roles/Removed Roles 영향 분석은 Rule Engine·Dynamic Role Registry가 먼저 신설된 후에만 산출 가능하다 — 현재는 비교할 "역할 활성화 로직" 자체가 없다(다중 BLOCKED_PREREQUISITE).
- Permission/Scope 변화 분석은 §21 Dynamic Projection(ABSENT)을 재사용해야 하므로 이중 선행.
- 마케팅 도메인 simulation(가격/성장 지표)을 RBAC Simulation으로 오흡수 금지 — 별도 도메인 유지(RBAC role/permission 미취급).

## 6. Gap / BLOCKED_PREREQUISITE

- Rule 변경 Simulation = 완전 ABSENT(Rule Engine 부재).
- Attribute/Context/Policy 변경 Simulation = 근접 속성/컨텍스트/정책값 존재하나 영향 분석 로직 ABSENT.
- Activated/Removed Roles·Permission/Scope 변화 산출 = §21 Dynamic Projection 선행 신설 대상(이중 BLOCKED_PREREQUISITE).
- 마케팅 가격/성장 지표 simulation = KEEP_SEPARATE — RBAC Simulation으로 오흡수 금지.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine·§21 Projection 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
