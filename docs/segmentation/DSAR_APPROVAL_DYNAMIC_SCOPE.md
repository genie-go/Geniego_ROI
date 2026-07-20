# DSAR — Approval Dynamic Scope (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Dynamic Scope · 스펙 §26)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §26 Dynamic Scope는 원문 자체가 "Reference만 제공. 후속 Dynamic Governance에서 구현"이라고 명시한다. 즉 본 Part 3-4는 Dynamic Scope의 **정의를 소비하지 않고 참조만 남긴다** — 실 설계는 Part 3-5 Dynamic Role Governance(ADR §5 귀결 "다음: Part 3-5 Dynamic Role Governance")에서 이루어진다. 본 문서는 Part 3-4 스코프 내에서 Dynamic Scope가 substrate 매핑 대상이 아님을 명문화하고, 잘못 흡수되지 않도록 경계를 긋는 역할만 한다.

## 2. Canonical 필드

스펙 §26은 필드를 정의하지 않는다(Reference-only 섹션). 본 편은 Part 3-5로 넘길 Reference Pointer만 기술한다: Dynamic Scope Reference ID · Referring Scope Definition(§5) · Target Governance(Part 3-5).

## 3. 열거형 / 타입

스펙 §26 원문에 열거형 없음(Reference만 제공).

## 4. 실 substrate 매핑 (ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Dynamic Scope(런타임 조건부 scope 계산) | — | — | **ABSENT** — 스펙 원문이 후속 구현으로 명시적으로 이연·본 Part 대상 아님 |
| Dynamic Scope Rule Reference | — | — | **ABSENT** — Canonical Interface(ADR §3)에 "Adapter(Part 3-5 Dynamic…)는 Scope Resolution Contract·Dynamic Scope Rule Reference만 제공"으로 명시된 순신규 연결점 |

## 5. 설계 원칙

- 스펙 원문 지시를 그대로 준수 — Dynamic Scope는 본 Part에서 구현·substrate 매핑을 시도하지 않는다(스코프 초과 방지).
- ADR §3 "Adapter(Part 3-5 Dynamic·3-6 Service/System·3-7 Effective Resolution)"에 명시된 대로, 본 Part가 확정하는 Canonical Scope Registry/Type/Resolution Contract가 Part 3-5의 착지점이 된다 — Part 3-4가 먼저 조립을 끝내야 Part 3-5가 그 위에 얹힌다(선행순서 보존).
- Effective Scope Engine(§27, 본 문서군의 자매 편)이 향후 Dynamic Scope 평가를 흡수할 확장 포인트이나, 본 편에서 조기 구현하지 않는다(중복 엔진 리스크 회피).

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: 전부 — 스펙 원문상 본 Part의 구현 대상이 아니므로 Gap 자체가 "Part 3-5로의 이연"이다.
- **BLOCKED_PREREQUISITE(RP-002)**: Part 3-4 본체(Canonical Scope Registry/Type/Version/Resolution Contract)가 먼저 실구현되어야 Part 3-5 Dynamic Role Governance가 이를 소비할 수 있음.
- 실 구현 = Part 3-5 Dynamic Role Governance 설계 세션에서 별도 다룸. 본 편 코드 0 · NOT_CERTIFIED.
