# DSAR — Role Path Evidence (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §53)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Path Evidence = 개별 Effective Inheritance 판정 하나마다, Source Role에서 Target Role까지 이어지는 경로의 세부(Intermediate Role들·Edge Sequence·경유 버전·Permission/Deny Source·각 단계 Transformation·최종 결과)를 기록하는 저장 단위(스펙 §53). Role Graph Evidence(§52)가 Graph Version 단위의 종합 결과라면, 본 편은 **개별 경로(Path) 단위**의 세부 근거다.

- **순신규**: Role Graph/Edge/Path 자체가 ABSENT(ADR §1 grep 0건: closure·ancestor·descendant 등) → 경로 기록 substrate도 전무.

## 2. Canonical 필드

각 Effective Inheritance 결과에 저장(스펙 §53 원문 그대로):

| # | 필드 | 의미 |
|---|---|---|
| 1 | Source Role | 경로 시작 Role |
| 2 | Target Role | 경로 종료(효과 적용) Role |
| 3 | Intermediate Roles | 경유한 중간 Role들 |
| 4 | Edge Sequence | 경유한 Edge들의 순서열 |
| 5 | Role Versions | 경로상 각 Role의 버전 |
| 6 | Hierarchy Version | 경로가 속한 Hierarchy Version |
| 7 | Composite Versions | 경로에 관여한 Composite Version들 |
| 8 | Permission Sources | Permission이 유래한 근원 |
| 9 | Deny Sources | Deny가 유래한 근원 |
| 10 | Scope Transformations | 경로상 Scope 변형 이력 |
| 11 | Constraint Transformations | 경로상 Constraint 변형 이력 |
| 12 | Actor Eligibility Transformations | 경로상 Actor 자격 변형 이력 |
| 13 | Validity Transformations | 경로상 유효기간 변형 이력 |
| 14 | Risk Escalation | 경로상 Risk 상향 이력 |
| 15 | Conflict Decisions | 경로상 Conflict 판정 이력 |
| 16 | Final Result | 최종 결과 |
| 17 | Digest | 경로 다이제스트 |

## 3. 열거형 / 타입

- **Edge Sequence 각 hop의 Edge Type**: ADR §D-3에서 확정한 8종 재사용 — `INCLUDES` · `INHERITS` · `SPECIALIZES` · `RESTRICTS` · `DEPENDS_ON` · `EXCLUDES` · `IMPLIES` · `COMPOSES`(ADR §3 "Edge=명시 Type+Direction+Propagation Policy").
- **Final Result**: ALLOW/DENY/PARTIAL류 판정 값 — 스펙 원문에 세부 열거값 미제시 → **설계 예약(미확정)**.
- **Risk Escalation**: 상향(UP)만 허용, 하향 금지(§6.10 원칙 적용) — 구체 값공간은 **설계 예약**.

## 4. 실 substrate 매핑 (§5.2)

| Path Evidence 축 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| 경로 walk 알고리즘 근접 패턴(참조만·재사용 아님) | menu_tree `wouldCycle`(조상체인 walk+self-ref+depth guard) | `AdminMenu.php:540-555` | §44 Circular Detection 참조 패턴 — 조상 체인을 순회하며 판정한다는 구조는 동형이나, 대상은 메뉴 parent_id고 Edge Sequence/Transformation을 기록하는 저장소가 아님(EXISTING_IMPLEMENTATION §5) |
| Source/Target/Intermediate Role·Edge Sequence·Role Versions | — | **ABSENT** | Role Graph/Edge/Version 자체 순신규 |
| Permission/Deny Sources | — | **ABSENT** | Part 2 Permission Engine 코드 0(BLOCKED_PREREQUISITE) |
| Scope/Constraint/Actor Eligibility/Validity Transformations | — | **ABSENT** | 순신규 |
| Risk Escalation·Conflict Decisions·Final Result·Digest | — | **ABSENT** | 순신규 |

## 5. 설계 원칙

- **Edge 의미론 명시 승계**(ADR §D-3): `parent_id`만 저장 금지 — Edge Sequence의 각 hop은 Type+Direction+Propagation Policy를 동반.
- **저장 순서 무관 Digest**(§54 연계): Path Digest는 Canonical Sorting 적용 후 산출.
- **Diamond 명시 처리**(§6.13): 동일 Target에 도달하는 경로가 둘 이상이면 각각 별도 Path Evidence로 기록하고 임의로 병합·대표경로만 선택 금지.
- **Risk 상향만 허용**(§6.10): Path 경유 중 Risk Escalation은 하향 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph/Edge/Path 개념 자체 = **전부 ABSENT**(순신규).
- Permission/Deny Source 결합 = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0).
- Role Version 결합 = **BLOCKED_PREREQUISITE**(Part 3-1 코드 0).
- menu_tree `wouldCycle`은 알고리즘 참조일 뿐 Path Evidence 저장소로 재사용 불가(대상=메뉴, Role 아님 — 오흡수 금지).
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
