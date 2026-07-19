# DSAR — Role Graph Cache (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §55~§56)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Graph Cache = Role Graph 관련 파생 산출물(Ancestor/Descendant/Path/Transitive Closure·Effective Inherited/Composite Role Set·Effective Permission/Deny Projection·Compatibility·Conflict·Simulation)을 매 요청마다 재계산하지 않도록 하는 Cache 계층과, 그 Cache Key가 반드시 포함해야 할 구성요소를 설계 정본으로 정의한다(스펙 §55~§56). Role 축(Part 3-1 Role Definition 단위) 캐시가 아니라 **Role Graph(Hierarchy/Composite 조합·경로·집계)** 축 캐시다.

- **순신규**: Role Graph 자체가 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §4)이므로 그 파생 캐시 계층도 전무.

## 2. Canonical 필드

### 2.1 Cache 종류 (스펙 §55 원문 그대로)

`Active Hierarchy Cache` · `Active Composite Cache` · `Role Ancestor Cache` · `Role Descendant Cache` · `Role Path Cache` · `Role Transitive Closure Cache` · `Effective Inherited Role Cache` · `Effective Composite Role Cache` · `Effective Permission Projection Cache` · `Effective Deny Projection Cache` · `Compatibility Cache` · `Conflict Cache` · `Simulation Cache`

### 2.2 Cache Key 최소 포함 요소 (스펙 §56 원문 그대로)

| # | 요소 | Optional 여부 |
|---|---|---|
| 1 | tenant id | 필수 |
| 2 | hierarchy registry id | 필수 |
| 3 | role hierarchy id | 필수 |
| 4 | hierarchy version id | 필수 |
| 5 | graph id | 필수 |
| 6 | graph version id | 필수 |
| 7 | source role definition id | 필수 |
| 8 | source role version id | 필수 |
| 9 | target role definition id | optional |
| 10 | target role version id | optional |
| 11 | composite role id | optional |
| 12 | composite version id | optional |
| 13 | role status digest | 필수 |
| 14 | permission mapping digest | 필수 |
| 15 | permission group digest | 필수 |
| 16 | permission bundle digest | 필수 |
| 17 | scope requirement digest | 필수 |
| 18 | actor eligibility digest | 필수 |
| 19 | conflict policy version | 필수 |
| 20 | propagation policy version | 필수 |
| 21 | graph digest | 필수 |
| 22 | context digest | optional |

## 3. 열거형 / 타입

- **cache_type**: §2.1의 13종(Active Hierarchy/Composite Cache · Ancestor/Descendant/Path/Transitive Closure Cache · Effective Inherited/Composite Role Cache · Effective Permission/Deny Projection Cache · Compatibility Cache · Conflict Cache · Simulation Cache).
- **cache_state**: FRESH/STALE/INVALIDATED류 상태 값 — 스펙 §55~56 원문에 세부 열거값 미제시 → **설계 예약(미확정)**.

## 4. 실 substrate 매핑 (§5.2)

전부 **ABSENT**. Role Graph 파생 캐시 계층 자체가 존재하지 않으며(EXISTING_IMPLEMENTATION §4 "Role Graph Snapshot/Evidence/Digest/Drift/Revalidation/Reconciliation/Simulation/Migration = 전무"), 참조할 만한 근접 캐시 substrate도 ADR·전수조사 2문서에 인용되지 않았다(§5 "근접 알고리즘/구조 패턴" 표에도 캐시 계열 항목 없음).

| Cache Key 요소 | 실존 substrate | 판정 |
|---|---|---|
| tenant id | (일반 원칙으로만 재확인 — 개별 file:line 미인용) | **ABSENT for Graph Cache**(Role Graph 자체 부재) |
| hierarchy/graph/composite id·version | — | **ABSENT** |
| role status/permission mapping/group/bundle digest | — | **ABSENT**(Part 2 Permission Engine 코드 0) |
| scope requirement/actor eligibility digest | — | **ABSENT** |
| conflict/propagation policy version·graph digest | — | **ABSENT**(§54 선행 신설 대상) |

## 5. 설계 원칙

- **Version + Tenant-aware 필수**(스펙 §56·ADR "불변"): Cache Key에서 `tenant id`·`hierarchy version id`·`graph version id` 누락 금지. 미포함 시 289차 폐기 `admin_roles`류 하드코딩 정적 상수와 동형 오류(교차 테넌트 누출·구버전 고착) 재현 위험.
- **cache_type별 키 네임스페이스 분리**: Composite Cache와 Hierarchy Cache는 동일 키 공간에 혼합 저장 금지 — `composite_role_id`/`composite_version_id` 포함 여부로 구분.
- **graph digest(§54) 포함**: Digest 변경 시 자동으로 새 Key가 생성되어 별도 무효화 로직 없이도 stale 회피(§57 Cache Invalidation과 결합 원칙).
- **Golden Rule**: Part 3-1 Role Registry(Definition 단위) 캐시와 별도 계층 — 동일 목적 캐시 중복 신설이 아니라 서로 다른 좌표축(Definition vs Graph)임을 명확히.

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph/Hierarchy/Composite Version = **전부 ABSENT** → Cache Key 좌표축 전부 ABSENT(BLOCKED_PREREQUISITE).
- Permission/Group/Bundle Digest = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0).
- graph digest = §54 선행 신설 대상(본 스펙 그룹 내 순서 의존).
- 실 캐시 저장소·TTL·직렬화 형식 = 이번 차수 **미확정**(설계).
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
