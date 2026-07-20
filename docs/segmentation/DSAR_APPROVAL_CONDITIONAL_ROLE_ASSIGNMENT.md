# DSAR — Approval Conditional Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Conditional Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재. ★추가로 Rule/Policy Engine(Part 3-5 연동) 부재 시 활성화 금지.
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT) · **Rule 부재 상태에서 Conditional Assignment 활성화 절대 금지**

## 1. 목적

스펙 §1-16(Conditional Assignment) — 특정 조건(정책/Rule)이 충족될 때에만 활성화되는 Assignment 유형이다. Dynamic Assignment Reference(§1-11)와 밀접하게 연동되며, 조건 평가 자체가 순신규 Rule Engine에 의존한다는 점에서 **가장 강한 안전장치가 필요한 유형**이다.

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문(공통) 중 Conditional Assignment에 적용되는 부분: Assignment ID · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Conditional) · Assignment Status · Assignment Lifecycle · Effective From · Effective To. 조건 자체의 정의(조건식·평가 트리거)는 스펙 §1-16에 항목명만 존재하고 세부 필드 열거가 없음 — Dynamic Assignment Reference(§1-11)의 Rule Reference 계약을 재사용하는 것이 ADR §3 Adapter 원칙과 정합.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Conditional(스펙 §1-16 항목).
- 스펙 §18(Assignment Conflict)의 Conflict 유형(Duplicate/Conflicting/SoD Conflict 등)이 Conditional Assignment 활성화 시 재평가 대상이 될 수 있음(설계 제안 — 스펙이 Conditional과 Conflict를 직접 연결하지는 않음, 항목 §1-18/§1-16 별개 나열).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**ABSENT — 조건부 활성화 판정 로직 자체가 ground-truth 2편에 grep 매치 없음.**

- EXISTING §6 "부재(순신규)" 목록에 포함되는 항목들이 그대로 적용: Approval workflow·Policy 기반 활성화·Conflict/SoD 판정 전부 순신규. ADR §1: "승인·SoD·위임 정직 판정 — 승인 workflow 부재(pending_approval 매치는 캠페인/가격 도메인)."
- 근접 substrate로 오인될 수 있는 것은 없음. EXISTING §7 "거버넌스 계층 근접 substrate 3종" 표(effectiveForUser·SecurityAudit·auth_audit_log·writeGuard·menu snapshot·assignableMap·impersonation·break-glass·replacePerms)는 전부 정적 값 게이트이거나 라이브 재계산이며, **조건식을 평가해 Assignment 활성화 여부를 동적으로 결정하는 substrate는 존재하지 않는다.**

**ABSENT — 거버넌스 계층**: Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest·Rule 정의·조건 평가 엔진 전 구간 순신규(EXISTING §6).

## 5. 설계 원칙

- ★**안전장치(핵심 규율)**: Rule/Policy Engine이 실구현되기 전까지 Conditional Assignment는 어떤 경우에도 활성화(즉 실제 Role 부여 효력 발생)되어서는 안 된다. 조건식을 평가할 substrate가 없는 상태에서 Conditional Assignment를 "항상 true"나 "값 화이트리스트로 우회"하는 방식으로 대체 구현하지 않는다.
- Dynamic Assignment Reference(§1-11, [`DSAR_APPROVAL_DYNAMIC_ASSIGNMENT_REFERENCE`](DSAR_APPROVAL_DYNAMIC_ASSIGNMENT_REFERENCE.md))의 Rule Reference 계약을 재사용한다 — Conditional Assignment 전용 별도 Rule Engine을 중복 신설하지 않는다(Golden Rule).
- ADR §3 "Adapter" 경계 보존 원칙에 따라, 조건 평가는 Assignment 밖의 근접 patterns(assignableMap·writeGuard·break-glass)를 오흡수하지 않고 순수 신규 Rule Engine에 위임한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002 + Rule/Policy Engine 부재)**: Conditional Assignment는 (a) 선행 Permission Engine·Role Registry/Hierarchy·Decision Core, (b) Rule/Policy Engine(Part 3-5 Dynamic Role 연동) 양쪽이 모두 실구현되기 전까지 활성화될 수 없다. 이중 BLOCKED_PREREQUISITE.
- **Gap**: 조건식 스키마·평가 트리거·조건 미충족 시 Assignment 상태(§7 Lifecycle 중 어느 상태에 머무는지) 전부 스펙 세부 미정. Assignment Conflict(§18)와의 상호작용(조건 충족으로 활성화된 Assignment가 SoD Conflict를 유발할 경우 처리) 설계 확정 필요.
- 실 구현 = Rule/Policy Engine 신설 + 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수는 설계 명세(코드 0)이며 활성화 금지 원칙을 최상위 규율로 명문화.
