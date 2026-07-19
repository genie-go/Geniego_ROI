# DSAR — Role Ambiguity Detection (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §46 Role Ambiguity Detection)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Ambiguity Detection(스펙 §46)은 **동일 Role Code의 복수 Active Version · 동일 Hierarchy/Composite의 복수 Active Version · 동일 Source·Target 상충 Edge · 동일 Priority 상충 Edge · 서로 다른 Scope/Permission Version/Deny/Actor Eligibility를 갖는 Multiple Path · 기준 없는 Optional Component 포함 · Rule 누락 Conditional Component · 다중 후보 Cross-registry/Legacy Role Mapping**을 탐지해 **자동 Permit을 금지**하는 것이다. 저장소에는 이런 모호성 탐지 로직이 없으나, 모호성이 실제로 발생할 수 있는 구조적 조건(5개 role 어휘의 통합 Namespace 부재, 쓰기측/읽기측 enum 불일치로 인한 데드락)이 이미 문서화되어 있다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| ambiguity detection id | 검사 결과 레코드 PK |
| hierarchy version id / composite version id | 검사 대상 Version 참조 |
| ambiguity type | 아래 Ambiguity Signal enum(복수 가능) |
| conflicting refs | 상충하는 Version/Edge/Component 참조 목록 |
| auto permit | 항상 false(자동 허용 금지·§46 명시) |
| resolution required | Manual Review 요구 여부(모호성 탐지 시 항상 true) |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Ambiguity Signal**: `MULTIPLE_ACTIVE_ROLE_VERSION`(동일 Role Code) · `MULTIPLE_ACTIVE_HIERARCHY_VERSION` · `MULTIPLE_ACTIVE_COMPOSITE_VERSION` · `CONFLICTING_SAME_SOURCE_TARGET_EDGE` · `CONFLICTING_SAME_PRIORITY_EDGE` · `MULTIPLE_PATH_DIFFERENT_SCOPE` · `MULTIPLE_PATH_DIFFERENT_PERMISSION_VERSION` · `MULTIPLE_PATH_DIFFERENT_DENY` · `MULTIPLE_PATH_DIFFERENT_ACTOR_ELIGIBILITY` · `OPTIONAL_COMPONENT_INCLUSION_CRITERIA_MISSING` · `CONDITIONAL_COMPONENT_RULE_MISSING` · `CROSS_REGISTRY_MAPPING_MULTIPLE_CANDIDATES` · `LEGACY_MAPPING_MULTIPLE_CANDIDATES`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Ambiguity Detection 로직 자체 | ABSENT(순신규) | Role Hierarchy/Composite/Graph 전무(GROUND_TRUTH §4) — 모호성 탐지 개념 없음 |
| 모호성 발생 조건(근접 — 통합 Namespace 부재) | Hardcoded Parent-child·Unversioned Hierarchy(다축) | 5 role 어휘가 통합 Namespace 없이 공존(DUPLICATE_AUDIT §D-2) — team_role/api_key role(`index.php:573`)/admin_level/AdminMenu ROLE_ENUM/plan 'admin' 5개 중 암묵 순서를 가진 것은 roleRank(선형)·admin_level(master>sub)·team_role(owner>manager>member) 3개이며 서로 다른 값공간이라 단일 Role Graph로 결합 불가 — Ambiguity Detection이 향후 다뤄야 할 구조적 전제 조건 |
| `CONFLICTING_SAME_SOURCE_TARGET_EDGE`류의 실제 데드락 사례(부수 발견) | Duplicate Hierarchy(쓰기/읽기 enum 불일치) | AdminMenu `required_role` 쓰기측 ROLE_ENUM(`AdminMenu.php:247,401`) ↔ 읽기측 rank(`AdminMenu.php:338,343-346`) 불일치 — `required_role='super_admin'|'moderator'` 저장 시 admin(rank 3)조차 `$need=99`로 메뉴 영구 비노출(ADR §5 부수 발견 ①·DUPLICATE_AUDIT §D-8). 메뉴 도메인의 실 결함이지 Role Ambiguity Detection의 구현 증거는 아니며, 향후 Role Graph에서 동일 유형(쓰기 enum≠읽기 rank) 상충을 어떻게 탐지해야 하는지의 반면교사 사례 |

## 5. 설계 원칙

- 모호성이 탐지되면 자동 Permit을 절대 금지한다(스펙 §46 명시) — Manual Review 또는 명시적 정책 결정으로만 해소.
- 5 role 어휘(team_role/api_key role/admin_level/AdminMenu ROLE_ENUM/plan) 통합 Namespace 부재(DUPLICATE_AUDIT §D-2)는 Role Ambiguity Detection이 실 Role Registry(Part 3-1)와 결합될 때 반드시 고려해야 할 전제 조건이다 — 서로 다른 값공간의 순서를 단일 Priority로 오해석 금지(§6.2 오변환 금지와 동일 원리).
- AdminMenu `required_role` 쓰기/읽기 enum 데드락(`AdminMenu.php:247,338,343-346`)은 **메뉴 도메인의 실 결함**으로 이미 별도 후속 fix 세션 후보로 등재되어 있다(DUPLICATE_AUDIT §D-8) — 이 문서에서 재수정하거나 재플래그하지 않으며, 오직 "쓰기측 정의와 읽기측 판정이 다른 열거형/축을 쓰면 모호성·데드락이 발생한다"는 설계 반면교사로만 인용한다.
- Optional Component Inclusion Criteria와 Conditional Component Rule Reference는 §32 Conditional Component Role Reference(Part 3-5 Dynamic Role 선행 인터페이스)와 결합해 규칙 누락을 원천 차단한다.
- Cross-registry/Legacy Role Mapping 다중 후보는 §48 Cross-Registry Edge Governance의 Adapter Contract 승인 없이는 자동 선택 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Role Ambiguity Detection은 **완전 ABSENT(순신규)** 판정이다. 저장소에는 모호성 탐지 로직이 없다. 근접 가능한 것은 (a) 5 role 어휘 통합 Namespace 부재라는 구조적 전제 조건(DUPLICATE_AUDIT §D-2)과 (b) AdminMenu `required_role` 쓰기/읽기 enum 불일치 실 결함(`AdminMenu.php:247,338,343-346`·DUPLICATE_AUDIT §D-8) 두 가지이며, 둘 다 Ambiguity Detection의 구현 증거가 아니라 설계 시 고려해야 할 배경·반면교사다(반날조 — 부수 발견을 이 문서의 구현 근거로 오인 금지, 289차 P1~P4 및 D-8 재플래그 금지). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
