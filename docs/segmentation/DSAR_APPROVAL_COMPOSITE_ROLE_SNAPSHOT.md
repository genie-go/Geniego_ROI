# DSAR — Composite Role Snapshot (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §51)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Composite Role Snapshot = 특정 Composite Role의 특정 Version이 활성화되는 시점에, 그 Composite를 구성하는 Mandatory/Optional/Excluded Component(=Role Definition Version들)·Nested Composite Version·집계된 Effective Permission/Deny Set·Effective Scope Requirement·Effective Actor Eligibility·Effective Validity·Risk·Criticality·Conflict/Dependency 판정 결과 전체를 불변으로 동결한 캡처(스펙 §51). "지금 이 Composite가 무엇으로 조립되어 있는가"가 아니라 **"그 시점에 무엇으로 조립되어 있었는가"**를 사후 재구성하기 위한 substrate.

- **순신규**: Composite Role 자체가 저장소에 **실재하지 않는다**(ADR §1 "Composite/Graph/Cycle/Closure/Diamond/Ancestor/Descendant = 전부 ABSENT" · EXISTING_IMPLEMENTATION §4 "Composite Role / Component / Nested Composite = 전무"). 가장 근접한 team_role→acl_permission 매핑(`TeamPermissions.php:152`)조차 **Role→Permission 묶음**이지 **여러 Role Definition을 조합**한 것이 아니므로(ADR §6.3·DUPLICATE_AUDIT D-3), 본 스냅샷이 캡처해야 할 "Component=Role Definition" 자체가 substrate 층위에서 부재.
- Role Graph Snapshot(스펙 §50·본 편 범위 밖)이 Hierarchy 전체 상태를 동결하는 것과 달리, 본 편은 **Composite(조합) 단위** 하나만 동결.

## 2. Canonical 필드

`APPROVAL_COMPOSITE_ROLE_SNAPSHOT` (전부 신규 · 실값 아님 · 스펙 §51 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | snapshot id | 스냅샷 식별자 |
| 2 | composite role id | 대상 Composite Role 참조 |
| 3 | composite version id | 동결 대상 Composite Version |
| 4 | component role versions | 구성 Role Definition Version 목록 |
| 5 | nested composite versions | 내포된 Composite Version 목록 |
| 6 | mandatory components | 필수 Component 목록 |
| 7 | optional components | 선택 Component 목록 |
| 8 | excluded components | 제외 Component 목록 |
| 9 | effective permission set | 집계된 유효 Permission 집합 |
| 10 | effective deny set | 집계된 유효 Deny 집합(항상 우선 전파) |
| 11 | effective scope requirements | 집계된 유효 Scope 요구(교집합 기본) |
| 12 | effective actor eligibility | 집계된 유효 Actor 자격(교집합) |
| 13 | effective validity | 집계된 유효 기간/조건 |
| 14 | risk | 집계 Risk(최대값/상향) |
| 15 | criticality | 집계 Criticality |
| 16 | conflict result | 구성 요소 간 Conflict 판정 결과 |
| 17 | dependency result | 구성 요소 간 Dependency 판정 결과 |
| 18 | captured at | 캡처 시각 |
| 19 | immutable digest | 무결성 다이제스트(§54 참조) |
| 20 | evidence | 근거(§52/§53 참조) |

## 3. 열거형 / 타입

- **component relation**: `MANDATORY` · `OPTIONAL` · `EXCLUDED` · `CONDITIONAL`(ADR §3 "Mandatory/Optional/Excluded/Conditional Component" — ADR §3에 4종 모두 명시. 스펙 §51 필드 열은 3종만 나열하나 CONDITIONAL은 상위 ADR에서 확인되는 4번째 관계 유형)
- **conflict_result / dependency_result**: 판정 결과 값공간(ALLOW/BLOCK 등) — 스펙·ADR 원문에 세부 열거값 미제시 → **설계 예약(미확정)**
- **risk / criticality**: 등급 값공간 — 스펙·ADR 원문에 세부 값 미제시 → **설계 예약(미확정)**

## 4. 실 substrate 매핑 (§5.2)

| Snapshot 축 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| component(구성 Role) 개념 | team_role→acl_permission 묶음 | `TeamPermissions.php:152` | **ABSENT for Composite** — Role→Permission 묶음이지 Role 조합 아님(§6.3 구분 유지) |
| "역할 묶음" 근접 패턴(참조만·재사용 금지) | `ORG_PRESET`(15 팀유형별 기본 권한셋) | `TeamPermissions.php:706-722` | 근접 패턴이나 §6.3 혼동 금지 — 팀 템플릿이지 Composite Role(여러 Role Definition 조합) 아님(EXISTING_IMPLEMENTATION §5) |
| Snapshot/baseline 구조 근접(비-Role) | `menu_defaults`(snapshot_data·version·reset 롤백지점) | `AdminMenu.php:119-122,295-311,583-589` | §50 Graph Snapshot 참조 패턴(메뉴 대상 · Role 아님 · EXISTING_IMPLEMENTATION §5) |
| composite_version_id / mandatory·optional·excluded components | — | **ABSENT** | 순신규(Composite Role 개념 자체 부재) |
| nested composite versions | — | **ABSENT** | 순신규 |
| effective permission/deny/scope/actor/validity 집계 | — | **ABSENT** | 순신규(집계 대상인 Permission Engine도 Part 2 코드 0) |
| conflict/dependency result | — | **ABSENT** | 순신규 |
| immutable digest | — | **ABSENT** | §54 선행 신설 대상 |

## 5. 설계 원칙

- **Component = Role Definition**(Part 3-1), Permission Group 아님(ADR §6.3·DUPLICATE_AUDIT D-3) — team_role→acl_permission 묶음을 Component로 오흡수 금지.
- **Deduplicated Restricted Union + Deny Always Propagate + Excluded Remove**(ADR §3): 여러 Component의 Effective Permission Set은 단순 합집합이 아니라 중복 제거된 제한적 합집합이며, 어느 하나의 Component에 Deny가 있으면 전체에 전파되고, Excluded Component는 제거된다.
- **Actor Eligibility 교집합**(§6.9): Human-only Component와 Machine-only Component를 혼합한 Composite 구성 금지.
- **Risk 최대값/상향**(§6.10): Composite Risk를 구성 Component 중 최저값으로 하향 계산 금지.
- **Historical Immutability**(§6.15): 스냅샷 생성 후 직접 수정 금지 — 변경은 새 스냅샷.
- **Golden Rule**: `ORG_PRESET`(team template)을 Composite Component 저장소로 재사용하지 않는다 — 별개 개념(DUPLICATE_AUDIT D-3 재확인).

## 6. Gap / BLOCKED_PREREQUISITE

- Composite Role / Composite Version / Component / Nested Composite / Conflict Result / Dependency Result = **전부 ABSENT**(ADR §1·EXISTING_IMPLEMENTATION §4 "Composite Role / Component / Nested Composite = 전무").
- Effective Permission/Deny/Scope 집계 = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0).
- component role version 참조 = **BLOCKED_PREREQUISITE**(Part 3-1 Role Definition Version 코드 0).
- immutable digest 산출 = 별편(§54 Role Graph Digest) 선행 신설 대상.
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
