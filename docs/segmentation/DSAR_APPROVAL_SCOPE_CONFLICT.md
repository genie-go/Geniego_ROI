# DSAR — Approval Scope Conflict (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Conflict · 스펙 §28)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §28 Scope Conflict는 Overlap · Expansion · Invalid Mapping · Invalid Parent · Invalid Version 5종의 스코프 충돌을 탐지하는 개념이다. ground-truth §9는 "scope 거버넌스 계층(Version/Projection 영속/Drift/Snapshot/Registry/Simulation/Evidence) grep 0 전항목"으로 판정했고, Conflict 탐지는 이 거버넌스 계층에 속하므로 **완전 ABSENT**다. data_scope는 UNIQUE(tenant,subject_type,subject_id) 제약으로 subject당 scope_type 1개만 허용(구조적 제약)하나, 이는 DB 유니크 제약일 뿐 Overlap/Invalid Mapping 같은 의미론적 충돌 탐지 로직이 아니다.

## 2. Canonical 필드

스펙 §28은 충돌 유형만 정의(필드 섹션 없음). 설계 제안: Conflict ID · Conflict Type(§3 열거값) · Involved Scope Definition(들) · Detected At · Detection Trigger · Resolution Status.

## 3. 열거형 / 타입

스펙 §28 원문 — **Conflict Type**: Overlap · Expansion · Invalid Mapping · Invalid Parent · Invalid Version.

## 4. 실 substrate 매핑 (ABSENT)

| Canonical Conflict Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Overlap | data_scope UNIQUE(tenant,subject_type,subject_id) 제약(다차원 동시부여 자체를 구조적으로 차단) | `TeamPermissions.php:160-166` | **ABSENT(간접 회피일 뿐 탐지 로직 아님)** — 충돌을 "탐지"하지 않고 애초에 "허용하지 않는" DB 제약. Conflict Entity로 오분류 금지 |
| Expansion | — | — | **ABSENT** — 탐지 로직 grep 0(§29 Expansion Guard 별도 판정 참조. 여기서는 "충돌로서의 탐지·기록" 관점만 다룸) |
| Invalid Mapping | — | — | **ABSENT** — Scope Type ↔ Value 매핑 검증 로직 grep 0 |
| Invalid Parent | — | — | **ABSENT** — ADR D-3이 명문화한 대로 data_scope 9차원은 FLAT(부모-자식 없음·company만 특례)이므로 "Invalid Parent" 판정 대상 구조 자체가 부재 |
| Invalid Version | — | — | **ABSENT** — Scope Version 개념 자체가 순신규(ADR §3) |

## 5. 설계 원칙

- Golden Rule — data_scope UNIQUE 제약을 Overlap 방지의 DB 레벨 보조 장치로 유지하되, 의미론적 Conflict 탐지(Overlap/Expansion/Invalid Mapping/Parent/Version)는 그 위에 별도 계층으로 신설한다(제약 자체를 Conflict Entity로 재해석하지 않음).
- Invalid Parent 판정은 ADR D-3(Scope Hierarchy ≠ Organization Hierarchy · FLAT 구조 보존)을 침해하지 않는 범위에서 설계한다 — Scope Hierarchy를 조기에 도입해 "Invalid Parent 탐지"를 위한 명분으로 삼지 않는다.
- Expansion Conflict는 §29 Scope Expansion Guard와 개념이 겹치므로, Conflict Entity(탐지·기록)와 Guard(차단 실행)를 분리해 중복 엔진을 만들지 않는다 — Conflict가 탐지·로그를, Guard가 런타임 차단을 담당하는 역할 분리를 원칙으로 한다.
- Default Intersection 원칙상 Conflict 해소는 항상 더 제한적인 쪽(narrower)으로 수렴하며, 자동으로 더 넓은 scope를 채택하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: 5종 Conflict Type 전부 탐지 로직 부재. Version/Parent 개념 자체가 순신규이므로 Invalid Version/Invalid Parent는 선행 엔티티 없이는 정의조차 불가능.
- **BLOCKED_PREREQUISITE(RP-002)**: Conflict 탐지는 Canonical Scope Registry/Definition/Version(본 Part 본체)이 실구현된 이후에만 의미가 생김 — 현재는 탐지 대상 엔티티 자체가 없음.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
